const express = require("express");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const PROJECT_ROOT = path.resolve(__dirname, "..");
const CLIENT_DIST = path.join(PROJECT_ROOT, "client", "dist");
const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const SOUND_EFFECT_FILES = new Set([
  "universfield-bubble-pop-04-323580.mp3",
  "freesound_community-wah-ah-108289.mp3",
  "winning sound.mp3",
  "dice roll.mp3",
]);
const GAME_MUSIC_FILES = new Set(["drawing song.mp3"]);
const PORT = Number(process.env.PORT) || 48731;

app.use(cors());

function isAudioFile(fileName) {
  return AUDIO_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function isImageFile(fileName) {
  return IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

app.get("/api/music", (_request, response) => {
  fs.readdir(PROJECT_ROOT, { withFileTypes: true }, (error, entries) => {
    if (error) {
      response.status(500).json([]);
      return;
    }

    const tracks = entries
      .filter(
        (entry) =>
          entry.isFile() &&
          isAudioFile(entry.name) &&
          !SOUND_EFFECT_FILES.has(entry.name) &&
          !GAME_MUSIC_FILES.has(entry.name),
      )
      .map((entry) => ({
        name: entry.name,
        url: `/music/${encodeURIComponent(entry.name)}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    response.json(tracks);
  });
});

app.get("/music/:fileName", (request, response) => {
  const fileName = path.basename(request.params.fileName);

  if (!isAudioFile(fileName)) {
    response.sendStatus(404);
    return;
  }

  response.sendFile(path.join(PROJECT_ROOT, fileName));
});

app.get("/images/:fileName", (request, response) => {
  const fileName = path.basename(request.params.fileName);

  if (!isImageFile(fileName)) {
    response.sendStatus(404);
    return;
  }

  response.sendFile(path.join(PROJECT_ROOT, fileName));
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const games = new Map();
const lobbyRosters = new Map();
const BOARD_TILE_COUNT = 90;
const ROLL_STEP_MS = 280;
const TRIVIA_PENALTY_REVEAL_MS = 1200;
const TRIVIA_TILE_POSITIONS = new Set([6, 14, 23, 31, 42, 55, 67, 76, 88]);
const MOST_LIKELY_TILE_POSITIONS = new Set([9, 18, 27, 36, 49, 58, 72, 83]);
const RAPID_TAP_TILE_POSITIONS = new Set([21, 61, 85]);
const STOP_LINE_TILE_POSITIONS = new Set([2, 16, 29, 44, 53, 64, 79]);
const JUMP_BLOCK_TILE_POSITIONS = new Set([7, 25, 34, 47, 57, 68, 81]);
const FIRST_TAP_TILE_POSITIONS = new Set([11, 37, 73]);
const WORD_MATH_TILE_POSITIONS = new Set([19, 48, 78]);
const FINISH_LYRIC_TILE_POSITIONS = new Set([33, 69]);
const DRAW_IMAGE_TILE_POSITIONS = new Set([41, 86]);
const PRESS_RELEASE_TILE_POSITIONS = new Set([12, 60]);
const WORST_ADVICE_TILE_POSITIONS = new Set([24, 62]);
const CAPTION_THIS_TILE_POSITIONS = new Set([45, 75]);
const CHASE_TILE_POSITIONS = new Set([52]);
const TRIVIA_DURATION_MS = 30000;
const DRAW_IMAGE_DURATION_MS = 30000;
const DRAW_IMAGE_VOTE_DURATION_MS = 30000;
const WORST_ADVICE_DURATION_MS = 45000;
const WORST_ADVICE_VOTE_DURATION_MS = 30000;
const CAPTION_THIS_PHOTO_DURATION_MS = 60000;
const CAPTION_THIS_DURATION_MS = 45000;
const CAPTION_THIS_VOTE_DURATION_MS = 30000;
const CHASE_DURATION_MS = 30000;
const CHASE_TICK_MS = 100;
const CHASE_COLUMNS = 13;
const CHASE_ROWS = 9;
const CHASE_SPEED_CELLS_PER_SECOND = 2.7;
const CHASE_CATCH_DISTANCE = 0.58;
const RAPID_TAP_DURATION_MS = 15000;
const STOP_LINE_DURATION_MS = 10000;
const STOP_LINE_START_GRACE_MS = 250;
const MINIGAME_COUNTDOWN_MS = 3000;
const JUMP_BLOCK_DURATION_MS = 60000;
const JUMP_BLOCK_MAX_SCORE = 50;
const FIRST_TAP_DURATION_MS = 8000;
const FIRST_TAP_MIN_WAIT_MS = 5000;
const FIRST_TAP_MAX_WAIT_MS = 15000;
const PRESS_RELEASE_DURATION_MS = 15000;
const PRESS_RELEASE_MIN_TARGET_MS = 5000;
const PRESS_RELEASE_MAX_TARGET_MS = 10000;
const triviaTimers = new Map();
const mostLikelyTimers = new Map();
const rapidTapTimers = new Map();
const stopLineTimers = new Map();
const jumpBlockTimers = new Map();
const firstTapTimers = new Map();
const pressReleaseTimers = new Map();
const wordMathTimers = new Map();
const finishLyricTimers = new Map();
const drawImageTimers = new Map();
const worstAdviceTimers = new Map();
const captionThisTimers = new Map();
const chaseTimers = new Map();
const chaseIntervals = new Map();
const turnResolutionTimers = new Map();
const mostLikelyPrompts = [
  "Most likely to lose a bar fight they started?",
  "Most likely to accidentally traumatize their child with a pep talk?",
  "Most likely to blame the dice for every bad decision?",
  "Most likely to talk trash and immediately regret it?",
  "Most likely to get voted off Survivor first?",
  "Most likely to form an alliance and betray it within five minutes?",
  "Most likely to celebrate before actually winning?",
  "Most likely to argue with the rules and still be wrong?",
  "Most likely to overthink a very simple choice?",
  "Most likely to become the villain of game night?",
  "Most likely to quote a movie at the wrong time?",
  "Most likely to need a dramatic comeback because of their own choices?",
  "Most likely to ask whose turn it is while everyone is staring at them?",
  "Most likely to make a terrible trade and call it strategy?",
  "Most likely to hold a grudge from round one?",
  "Most likely to forget the objective of the game?",
  "Most likely to be confidently incorrect?",
  "Most likely to turn a board game into a courtroom trial?",
  "Most likely to make everyone reread the rules?",
  "Most likely to take the longest turn and do nothing useful?",
  "Most likely to say trust me right before ruining everything?",
  "Most likely to be eliminated by a children's game mechanic?",
  "Most likely to rage quit and come back two minutes later?",
  "Most likely to make the worst possible move with maximum confidence?",
  "Most likely to claim they are not competitive while sweating?",
  "Most likely to start a feud over one space?",
  "Most likely to lose to a kid at an arcade game?",
  "Most likely to be the reason the group needs a timeout?",
  "Most likely to make a handshake deal nobody should trust?",
  "Most likely to forget they already voted?",
  "Most likely to panic under zero pressure?",
  "Most likely to narrate their turn like a sports documentary?",
  "Most likely to make a comeback and then immediately fumble it?",
  "Most likely to accuse someone else of cheating with no evidence?",
  "Most likely to be humbled by trivia for children?",
  "Most likely to get too emotionally attached to their token?",
  "Most likely to pick themselves for the worst answer?",
  "Most likely to be banned from keeping score?",
  "Most likely to say one more game and mean five more games?",
  "Most likely to make the group question their education?",
  "Most likely to lose a debate to SpongeBob?",
  "Most likely to survive a disaster through pure confusion?",
  "Most likely to fumble an easy win at the finish line?",
  "Most likely to make a villain speech over a dice roll?",
  "Most likely to be haunted by one bad answer forever?",
  "Most likely to lose their phone while holding it?",
  "Most likely to call a family meeting after losing?",
  "Most likely to make the host regret inviting them?",
  "Most likely to think they are the main character?",
  "Most likely to need a sincere apology after game night?",
];

const wordMathTemplates = [
  {
    make: () => {
      const boxes = Math.floor(Math.random() * 5) + 3;
      const perBox = Math.floor(Math.random() * 4) + 2;
      const eaten = Math.floor(Math.random() * 5) + 2;
      const answer = boxes * perBox - eaten;

      return {
        question: `You have ${boxes} boxes with ${perBox} donuts each. The group eats ${eaten}. How many donuts are left?`,
        answer,
      };
    },
  },
  {
    make: () => {
      const people = Math.floor(Math.random() * 4) + 3;
      const each = Math.floor(Math.random() * 6) + 2;
      const extra = Math.floor(Math.random() * 8) + 3;
      const answer = people * each + extra;

      return {
        question: `${people} friends each bring ${each} snacks, then someone adds ${extra} more. How many snacks total?`,
        answer,
      };
    },
  },
  {
    make: () => {
      const start = Math.floor(Math.random() * 12) + 18;
      const rounds = Math.floor(Math.random() * 4) + 3;
      const loseEach = Math.floor(Math.random() * 3) + 2;
      const answer = start - rounds * loseEach;

      return {
        question: `A player starts with ${start} coins and loses ${loseEach} coins for ${rounds} rounds. How many coins remain?`,
        answer,
      };
    },
  },
  {
    make: () => {
      const tables = Math.floor(Math.random() * 5) + 2;
      const seats = Math.floor(Math.random() * 4) + 4;
      const taken = Math.floor(Math.random() * 8) + 3;
      const answer = tables * seats - taken;

      return {
        question: `${tables} tables have ${seats} seats each. ${taken} seats are taken. How many seats are open?`,
        answer,
      };
    },
  },
];
const finishLyricPrompts = [
  {
    prompt: "Take me out to the ball game...",
    choices: [
      "Take me out with the crowd",
      "Buy me nachos and soda pop",
      "Let me root for the home team",
      "For it's one, two, three strikes",
    ],
    correctIndex: 0,
  },
  {
    prompt: "For it's one, two, three strikes...",
    choices: [
      "At the old ball game",
      "You're out at the old ball game",
      "And the crowd goes wild",
      "Root, root, root for the home team",
    ],
    correctIndex: 1,
  },
  {
    prompt: "Row, row, row your boat...",
    choices: [
      "Gently down the stream",
      "Floating past the moon",
      "Sailing through the rain",
      "Back across the shore",
    ],
    correctIndex: 0,
  },
  {
    prompt: "Twinkle, twinkle, little star...",
    choices: [
      "How I wonder what you are",
      "Shining over every car",
      "Where the moon and planets are",
      "Make a wish from near and far",
    ],
    correctIndex: 0,
  },
  {
    prompt: "I've been working on the railroad...",
    choices: [
      "All the live-long day",
      "Since the break of day",
      "With a hammer in my hand",
      "Till the whistle blows away",
    ],
    correctIndex: 0,
  },
  {
    prompt: "She'll be coming round the mountain...",
    choices: [
      "When she comes",
      "With the drums",
      "Past the pines",
      "In the sun",
    ],
    correctIndex: 0,
  },
  {
    prompt: "Auld Lang Syne starts, Should old acquaintance...",
    choices: [
      "Be forgot",
      "Meet again",
      "Sing along",
      "Stay in mind",
    ],
    correctIndex: 0,
  },
  {
    prompt: "Yankee Doodle went to town...",
    choices: [
      "Riding on a pony",
      "Marching with the army",
      "Looking for a party",
      "Singing something funny",
    ],
    correctIndex: 0,
  },
  {
    prompt: "This old man, he played one...",
    choices: [
      "He played knick-knack on my thumb",
      "He played music just for fun",
      "He played drums out in the sun",
      "He played games until he won",
    ],
    correctIndex: 0,
  },
  {
    prompt: "London Bridge is falling down...",
    choices: [
      "My fair lady",
      "Into the river",
      "All through town",
      "Brick by brick",
    ],
    correctIndex: 0,
  },
];
const drawImagePrompts = [
  "Draw a hot dog at a baseball game",
  "Draw a teacher losing control of the classroom",
  "Draw a dramatic game night betrayal",
  "Draw a mascot having a bad day",
  "Draw a tiny boat in a huge storm",
  "Draw someone celebrating way too early",
  "Draw a movie hero missing the obvious clue",
  "Draw a pizza with suspicious toppings",
  "Draw a championship parade gone wrong",
  "Draw someone trying to sneak out of trouble",
  "Draw a cartoon sponge at the beach",
  "Draw a baseball flying through a window",
  "Draw a singer forgetting the lyrics",
  "Draw a game show contestant panicking",
  "Draw a person arguing with a vending machine",
  "Draw a monster hiding under a tiny blanket",
  "Draw a superhero stuck in traffic",
  "Draw a sports fan watching a cursed play",
  "Draw someone taking board games too seriously",
  "Draw a sandwich that became too powerful",
];
const worstAdvicePrompts = [
  "How does someone become rich?",
  "How do you win an argument with your spouse?",
  "How do you impress a first date?",
  "How do you calm down an angry toddler?",
  "How do you become famous overnight?",
  "How should you ask your boss for a raise?",
  "How do you survive a family vacation?",
  "How do you fix a bad haircut?",
  "How do you become the favorite child?",
  "How do you make friends as an adult?",
  "How do you get out of a speeding ticket?",
  "How do you win a fantasy football league?",
  "How do you become a great teacher?",
  "How do you get invited back to game night?",
  "How do you hide that you forgot someone's name?",
  "How do you train for a marathon?",
  "How do you save money at a casino?",
  "How do you make a baby stop crying?",
  "How do you avoid doing chores?",
  "How do you make a wedding speech memorable?",
];
const triviaQuestions = [
  {
    question: "Which Bulls player hit the go-ahead jumper off Michael Jordan's pass in Game 6 of the 1997 NBA Finals?",
    choices: ["Steve Kerr", "Toni Kukoc", "Ron Harper", "Scottie Pippen"],
    correctIndex: 0,
  },
  {
    question: "Which Cubs pitcher threw the final out of the 2016 World Series?",
    choices: ["Aroldis Chapman", "Jon Lester", "Kyle Hendricks", "Mike Montgomery"],
    correctIndex: 3,
  },
  {
    question: "Who was named World Series MVP when the White Sox won in 2005?",
    choices: ["Paul Konerko", "Jermaine Dye", "Joe Crede", "A.J. Pierzynski"],
    correctIndex: 1,
  },
  {
    question: "Which team did the Cubs beat in the 2016 NLCS to reach the World Series?",
    choices: ["Mets", "Dodgers", "Cardinals", "Giants"],
    correctIndex: 1,
  },
  {
    question: "Who scored the Blackhawks' Stanley Cup-winning overtime goal in 2010?",
    choices: ["Jonathan Toews", "Patrick Kane", "Duncan Keith", "Marian Hossa"],
    correctIndex: 1,
  },
  {
    question: "Which Bears defensive coordinator later became head coach of the Philadelphia Eagles after the 1985 season?",
    choices: ["Buddy Ryan", "Dave Wannstedt", "Ron Rivera", "Mike Singletary"],
    correctIndex: 0,
  },
  {
    question: "Which Bears player scored a rushing touchdown in Super Bowl XX despite primarily playing defensive tackle?",
    choices: ["Richard Dent", "William Perry", "Dan Hampton", "Steve McMichael"],
    correctIndex: 1,
  },
  {
    question: "Which Bulls player was drafted out of Croatia and won Sixth Man of the Year in 1996?",
    choices: ["Toni Kukoc", "Luc Longley", "Jud Buechler", "Bill Wennington"],
    correctIndex: 0,
  },
  {
    question: "Which Chicago Fire player won MLS MVP in the club's 1998 debut season?",
    choices: ["Chris Armas", "Piotr Nowak", "Ante Razov", "Zach Thornton"],
    correctIndex: 1,
  },
  {
    question: "Which Chicago Sky player was named Finals MVP when the team won the 2021 WNBA title?",
    choices: ["Candace Parker", "Kahleah Copper", "Courtney Vandersloot", "Allie Quigley"],
    correctIndex: 1,
  },
  {
    question: "Which Chicago event in 1886 became closely associated with the international labor movement?",
    choices: ["Pullman Strike", "Haymarket Affair", "Eastland Disaster", "Century of Progress"],
    correctIndex: 1,
  },
  {
    question: "Which building from the 1893 Chicago world's fair still stands in Jackson Park today?",
    choices: ["Museum of Science and Industry", "Field Museum", "Chicago Cultural Center", "Auditorium Theatre"],
    correctIndex: 0,
  },
  {
    question: "What Chicago disaster in 1915 involved a passenger ship rolling over in the Chicago River?",
    choices: ["Iroquois Theatre fire", "Eastland disaster", "Our Lady of the Angels fire", "SS Chicora wreck"],
    correctIndex: 1,
  },
  {
    question: "Which Chicago mayor was elected in 1983 and became the city's first Black mayor?",
    choices: ["Eugene Sawyer", "Harold Washington", "Richard M. Daley", "Jane Byrne"],
    correctIndex: 1,
  },
  {
    question: "Which Chicago neighborhood is home to the former Union Stock Yards gate?",
    choices: ["Bridgeport", "Back of the Yards", "Pilsen", "Little Village"],
    correctIndex: 1,
  },
  {
    question: "Which Chicago-born author wrote The House on Mango Street?",
    choices: ["Sandra Cisneros", "Gwendolyn Brooks", "Lorraine Hansberry", "Studs Terkel"],
    correctIndex: 0,
  },
  {
    question: "Which Chicago poet became the first Black author to win a Pulitzer Prize?",
    choices: ["Gwendolyn Brooks", "Maya Angelou", "Nikki Giovanni", "Rita Dove"],
    correctIndex: 0,
  },
  {
    question: "Which Illinois city was Abraham Lincoln living in when he was elected president?",
    choices: ["Chicago", "Springfield", "New Salem", "Galena"],
    correctIndex: 1,
  },
  {
    question: "Which Federalist Paper is most associated with the argument for judicial review?",
    choices: ["Federalist No. 10", "Federalist No. 51", "Federalist No. 78", "Federalist No. 84"],
    correctIndex: 2,
  },
  {
    question: "Which Supreme Court case established judicial review?",
    choices: ["Marbury v. Madison", "McCulloch v. Maryland", "Gibbons v. Ogden", "Dred Scott v. Sandford"],
    correctIndex: 0,
  },
  {
    question: "Which amendment changed U.S. senators from being chosen by state legislatures to direct election?",
    choices: ["12th", "14th", "17th", "22nd"],
    correctIndex: 2,
  },
  {
    question: "Which clause says federal law generally wins when it conflicts with state law?",
    choices: ["Commerce Clause", "Supremacy Clause", "Elastic Clause", "Due Process Clause"],
    correctIndex: 1,
  },
  {
    question: "Which amendment contains the Equal Protection Clause?",
    choices: ["1st", "5th", "10th", "14th"],
    correctIndex: 3,
  },
  {
    question: "Which constitutional plan at the Philadelphia Convention favored representation by population?",
    choices: ["New Jersey Plan", "Virginia Plan", "Connecticut Compromise", "Albany Plan"],
    correctIndex: 1,
  },
  {
    question: "Which amendment bars presidents from being elected more than twice?",
    choices: ["20th", "22nd", "23rd", "25th"],
    correctIndex: 1,
  },
  {
    question: "Which officer presides over the Senate but votes only to break ties?",
    choices: ["Speaker of the House", "Vice President", "Chief Justice", "President pro tempore"],
    correctIndex: 1,
  },
  {
    question: "What was the name of the Chicago record label associated with Muddy Waters and Howlin' Wolf?",
    choices: ["Chess Records", "Stax Records", "Sun Records", "Motown"],
    correctIndex: 0,
  },
  {
    question: "Which Nirvana album features Smells Like Teen Spirit?",
    choices: ["Bleach", "Nevermind", "In Utero", "Incesticide"],
    correctIndex: 1,
  },
  {
    question: "Which Kanye West album includes Through the Wire and Jesus Walks?",
    choices: ["Late Registration", "Graduation", "The College Dropout", "808s & Heartbreak"],
    correctIndex: 2,
  },
  {
    question: "Which Smashing Pumpkins album includes 1979 and Bullet with Butterfly Wings?",
    choices: ["Gish", "Siamese Dream", "Mellon Collie and the Infinite Sadness", "Adore"],
    correctIndex: 2,
  },
  {
    question: "Which Chicago rapper released Food & Liquor in 2006?",
    choices: ["Common", "Lupe Fiasco", "Twista", "Chance the Rapper"],
    correctIndex: 1,
  },
  {
    question: "Which 2000s pop group released No Strings Attached?",
    choices: ["Backstreet Boys", "NSYNC", "98 Degrees", "O-Town"],
    correctIndex: 1,
  },
  {
    question: "On Survivor: Borneo, who lost the final vote to Richard Hatch?",
    choices: ["Sue Hawk", "Kelly Wiglesworth", "Rudy Boesch", "Colleen Haskell"],
    correctIndex: 1,
  },
  {
    question: "Which Survivor season was set in the Australian Outback?",
    choices: ["Season 2", "Season 3", "Season 4", "Season 5"],
    correctIndex: 0,
  },
  {
    question: "In SpongeBob SquarePants, what instrument does Squidward play?",
    choices: ["Flute", "Clarinet", "Oboe", "Saxophone"],
    correctIndex: 1,
  },
  {
    question: "In SpongeBob, what is Plankton's computer wife named?",
    choices: ["Karen", "Janet", "Pearl", "Sandy"],
    correctIndex: 0,
  },
  {
    question: "In The Sandlot, what is Benny Rodriguez's nickname?",
    choices: ["The Jet", "The Kid", "The Rocket", "The Legend"],
    correctIndex: 0,
  },
  {
    question: "In The Sandlot, which character pretends to drown so Wendy Peffercorn will rescue him?",
    choices: ["Ham", "Squints", "Yeah-Yeah", "Bertram"],
    correctIndex: 1,
  },
  {
    question: "On Friends, what is Chandler Bing's middle name?",
    choices: ["Muriel", "Francis", "Eustace", "Eugene"],
    correctIndex: 0,
  },
  {
    question: "On Seinfeld, what is Kramer's first name?",
    choices: ["Cosmo", "Morris", "Stanley", "Morty"],
    correctIndex: 0,
  },
  {
    question: "In Boy Meets World, what is Mr. Feeny's first name?",
    choices: ["George", "Alan", "Jonathan", "Eli"],
    correctIndex: 0,
  },
  {
    question: "In Family Matters, what invention transforms Steve Urkel into Stefan Urquelle?",
    choices: ["Transformation Chamber", "Cool Juice", "DNA Mixer", "Personality Machine"],
    correctIndex: 0,
  },
  {
    question: "In Home Alone, what nickname do the burglars give themselves?",
    choices: ["The Sticky Bandits", "The Wet Bandits", "The Snow Bandits", "The Silver Bandits"],
    correctIndex: 1,
  },
  {
    question: "In The Matrix, what color pill does Neo take?",
    choices: ["Blue", "Red", "Green", "White"],
    correctIndex: 1,
  },
  {
    question: "In Cast Away, Wilson is what kind of sports ball?",
    choices: ["Volleyball", "Basketball", "Soccer ball", "Football"],
    correctIndex: 0,
  },
  {
    question: "In Shrek, what song plays in the opening swamp montage?",
    choices: ["All Star", "I'm a Believer", "Bad Reputation", "Accidentally in Love"],
    correctIndex: 0,
  },
  {
    question: "In Harry Potter, what is the name of Hagrid's three-headed dog?",
    choices: ["Fang", "Norbert", "Fluffy", "Buckbeak"],
    correctIndex: 2,
  },
  {
    question: "In Jumanji, what type of game is the dangerous original Jumanji?",
    choices: ["Board game", "Video game", "Card game", "Pinball machine"],
    correctIndex: 0,
  },
  {
    question: "In Titanic, what is Rose's full maiden name?",
    choices: ["Rose Bukater", "Rose Dawson", "Rose DeWitt Bukater", "Rose Calvert"],
    correctIndex: 2,
  },
  {
    question: "Which 1999 movie popularized the phrase I see dead people?",
    choices: ["The Blair Witch Project", "The Sixth Sense", "Stir of Echoes", "Sleepy Hollow"],
    correctIndex: 1,
  },
];

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  function getLobbyRoster(lobbyCode) {
    if (!lobbyRosters.has(lobbyCode)) {
      lobbyRosters.set(lobbyCode, []);
    }

    return lobbyRosters.get(lobbyCode);
  }

  function normalizePlayerName(name) {
    return String(name || "").trim().toLowerCase();
  }

  function getLobbyPlayers(lobbyCode) {
    return getLobbyRoster(lobbyCode);
  }

  function getLobbyGame(lobbyCode) {
    return games.get(lobbyCode) || null;
  }

  function getMiniGameParticipantIds(miniGame) {
    if (!miniGame) return [];
    if (Array.isArray(miniGame.participantIds)) return miniGame.participantIds;
    if (Array.isArray(miniGame.choices)) {
      return miniGame.choices.map((choice) => choice.id).filter(Boolean);
    }
    return [];
  }

  function isMiniGameParticipant(miniGame, playerId) {
    const participantIds = getMiniGameParticipantIds(miniGame);

    return participantIds.length === 0 || participantIds.includes(playerId);
  }

  function getMiniGamePlayers(lobbyCode, miniGame) {
    const players = getLobbyPlayers(lobbyCode);
    const participantIds = getMiniGameParticipantIds(miniGame);

    if (participantIds.length === 0) return players;

    return players.filter((player) => participantIds.includes(player.id));
  }

  function clearActiveGameTimers(lobbyCode) {
    clearTriviaTimer(lobbyCode);
    clearMostLikelyTimer(lobbyCode);
    clearRapidTapTimer(lobbyCode);
    clearStopLineTimer(lobbyCode);
    clearJumpBlockTimer(lobbyCode);
    clearFirstTapTimer(lobbyCode);
    clearPressReleaseTimer(lobbyCode);
    clearWordMathTimer(lobbyCode);
    clearFinishLyricTimer(lobbyCode);
    clearDrawImageTimer(lobbyCode);
    clearWorstAdviceTimer(lobbyCode);
    clearCaptionThisTimer(lobbyCode);
    clearChaseTimer(lobbyCode);
    clearTurnResolutionTimer(lobbyCode);
  }

  function prunePlayerFromObject(object, playerId) {
    if (!object) return;

    delete object[playerId];

    for (const [key, value] of Object.entries(object)) {
      if (value === playerId) {
        delete object[key];
      }
    }
  }

  function removePlayerFromActiveMiniGames(game, playerId, totalPlayers) {
    const miniGames = [
      game.trivia,
      game.mostLikely,
      game.rapidTap,
      game.stopLine,
      game.jumpBlock,
      game.firstTap,
      game.pressRelease,
      game.wordMath,
      game.finishLyric,
      game.drawImage,
      game.worstAdvice,
      game.captionThis,
      game.chase,
    ];

    for (const miniGame of miniGames) {
      if (miniGame && typeof miniGame.totalPlayers === "number") {
        if (Array.isArray(miniGame.participantIds)) {
          miniGame.participantIds = miniGame.participantIds.filter(
            (participantId) => participantId !== playerId,
          );
          miniGame.totalPlayers = miniGame.participantIds.length;
        } else {
          miniGame.totalPlayers = totalPlayers;
        }
      }
    }

    prunePlayerFromObject(game.trivia?.answers, playerId);
    prunePlayerFromObject(game.mostLikely?.votes, playerId);
    prunePlayerFromObject(game.rapidTap?.scores, playerId);
    prunePlayerFromObject(game.rapidTap?.finalScores, playerId);
    prunePlayerFromObject(game.stopLine?.results, playerId);
    prunePlayerFromObject(game.stopLine?.finalResults, playerId);
    prunePlayerFromObject(game.jumpBlock?.scores, playerId);
    prunePlayerFromObject(game.jumpBlock?.finalScores, playerId);
    prunePlayerFromObject(game.firstTap?.pressedPlayerIds, playerId);
    prunePlayerFromObject(game.pressRelease?.results, playerId);
    prunePlayerFromObject(game.wordMath?.answers, playerId);
    prunePlayerFromObject(game.finishLyric?.answers, playerId);
    prunePlayerFromObject(game.drawImage?.drawings, playerId);
    prunePlayerFromObject(game.drawImage?.votes, playerId);
    prunePlayerFromObject(game.worstAdvice?.answers, playerId);
    prunePlayerFromObject(game.worstAdvice?.votes, playerId);
    prunePlayerFromObject(game.captionThis?.captions, playerId);
    prunePlayerFromObject(game.captionThis?.votes, playerId);
    prunePlayerFromObject(game.chase?.players, playerId);

    if (game.firstTap?.pressOrder) {
      game.firstTap.pressOrder = game.firstTap.pressOrder.filter(
        (press) => press.playerId !== playerId,
      );
    }
  }

  function clearActiveMiniGameState(lobbyCode, game) {
    clearTriviaTimer(lobbyCode);
    clearMostLikelyTimer(lobbyCode);
    clearRapidTapTimer(lobbyCode);
    clearStopLineTimer(lobbyCode);
    clearJumpBlockTimer(lobbyCode);
    clearFirstTapTimer(lobbyCode);
    clearPressReleaseTimer(lobbyCode);
    clearWordMathTimer(lobbyCode);
    clearFinishLyricTimer(lobbyCode);
    clearDrawImageTimer(lobbyCode);
    clearWorstAdviceTimer(lobbyCode);
    clearCaptionThisTimer(lobbyCode);
    clearChaseTimer(lobbyCode);

    game.trivia = null;
    game.mostLikely = null;
    game.rapidTap = null;
    game.stopLine = null;
    game.jumpBlock = null;
    game.firstTap = null;
    game.pressRelease = null;
    game.wordMath = null;
    game.finishLyric = null;
    game.drawImage = null;
    game.worstAdvice = null;
    game.captionThis = null;
    game.chase = null;

    io.to(lobbyCode).emit("triviaResolved", null);
    io.to(lobbyCode).emit("mostLikelyResolved", null);
    io.to(lobbyCode).emit("rapidTapResolved", null);
    io.to(lobbyCode).emit("stopLineResolved", null);
    io.to(lobbyCode).emit("jumpBlockResolved", null);
    io.to(lobbyCode).emit("firstTapResolved", null);
    io.to(lobbyCode).emit("pressReleaseResolved", null);
    io.to(lobbyCode).emit("wordMathResolved", null);
    io.to(lobbyCode).emit("finishLyricResolved", null);
    io.to(lobbyCode).emit("drawImageResolved", null);
    io.to(lobbyCode).emit("worstAdviceResolved", null);
    io.to(lobbyCode).emit("captionThisResolved", null);
    io.to(lobbyCode).emit("chaseResolved", null);
  }

  function removePlayerFromLobby(lobbyCode, playerId, socketId) {
    const roster = getLobbyPlayers(lobbyCode);
    const removedIndex = roster.findIndex((player) => player.id === playerId);

    if (removedIndex === -1) return null;

    const [removedPlayer] = roster.splice(removedIndex, 1);
    const game = getLobbyGame(lobbyCode);

    if (socketId) {
      const playerSocket = io.sockets.sockets.get(socketId);

      if (playerSocket?.data?.player?.id === playerId) {
        playerSocket.data.player = null;
      }
    }

    if (roster.length === 0) {
      lobbyRosters.delete(lobbyCode);
    }

    if (game) {
      delete game.positions[playerId];
      game.pausedPlayerIds = (game.pausedPlayerIds || []).filter(
        (pausedPlayerId) => pausedPlayerId !== playerId,
      );

      removePlayerFromActiveMiniGames(game, playerId, roster.length);

      if (roster.length === 0) {
        clearActiveGameTimers(lobbyCode);
        games.delete(lobbyCode);
        io.to(lobbyCode).emit("gameEnded");
      } else {
        const currentPlayerIndex = roster.findIndex(
          (player) => player.id === game.currentPlayerId,
        );
        const pendingPlayerIndex = roster.findIndex(
          (player) => player.id === game.pendingNextPlayerId,
        );

        if (currentPlayerIndex === -1) {
          const nextIndex = removedIndex % roster.length;
          game.currentPlayerId = roster[nextIndex]?.id || null;
          game.turnIndex = nextIndex;
        } else {
          game.turnIndex = currentPlayerIndex;
        }

        if (game.pendingNextPlayerId && pendingPlayerIndex === -1) {
          const nextIndex = removedIndex % roster.length;
          game.pendingTurnIndex = nextIndex;
          game.pendingNextPlayerId = roster[nextIndex]?.id || null;
        } else if (pendingPlayerIndex !== -1) {
          game.pendingTurnIndex = pendingPlayerIndex;
        }

        if (game.pendingRollingPlayerId === playerId) {
          clearActiveMiniGameState(lobbyCode, game);
          game.pendingLandingPosition = null;
          game.pendingRollingPlayerId = null;
          game.resolvingTurn = false;
          game.phase = "awaitingRoll";
        }

        game.paused = false;
        game.pausedAt = null;

        io.to(lobbyCode).emit("gameStateUpdated", game);
        io.to(lobbyCode).emit("turnUpdated", {
          currentPlayerId: game.currentPlayerId,
        });
        io.to(lobbyCode).emit("gamePausedUpdated", {
          paused: false,
          disconnectedPlayers: [],
        });
        emitActiveMiniGameState(lobbyCode, game);
      }
    }

    io.to(lobbyCode).emit("playersUpdated", getLobbyPlayers(lobbyCode));

    return removedPlayer;
  }

  function shiftMiniGameTimes(miniGame, pauseDuration) {
    if (!miniGame) return;

    for (const field of ["playStartsAt", "endsAt", "drawingEndsAt", "answeringEndsAt", "photoEndsAt", "captionEndsAt", "votingEndsAt"]) {
      if (typeof miniGame[field] === "number") {
        miniGame[field] += pauseDuration;
      }
    }
  }

  function emitActiveMiniGameState(lobbyCode, game) {
    if (game.trivia) emitTriviaState(lobbyCode);
    if (game.mostLikely) emitMostLikelyState(lobbyCode);
    if (game.rapidTap) emitRapidTapState(lobbyCode);
    if (game.stopLine) emitStopLineState(lobbyCode);
    if (game.jumpBlock) emitJumpBlockState(lobbyCode);
    if (game.firstTap) emitFirstTapState(lobbyCode);
    if (game.pressRelease) emitPressReleaseState(lobbyCode);
    if (game.wordMath) emitWordMathState(lobbyCode);
    if (game.finishLyric) emitFinishLyricState(lobbyCode);
    if (game.drawImage) emitDrawImageState(lobbyCode);
    if (game.worstAdvice) emitWorstAdviceState(lobbyCode);
    if (game.captionThis) emitCaptionThisState(lobbyCode);
    if (game.chase) emitChaseState(lobbyCode);
  }

  function pauseGame(lobbyCode, game) {
    if (game.paused) return;

    clearActiveGameTimers(lobbyCode);
    game.paused = true;
    game.pausedAt = Date.now();
  }

  function resumeGame(lobbyCode, game) {
    if (!game.paused) return;

    const pauseDuration = Date.now() - (game.pausedAt || Date.now());

    game.paused = false;
    game.pausedAt = null;

    for (const miniGame of [
      game.trivia,
      game.mostLikely,
      game.rapidTap,
      game.stopLine,
      game.jumpBlock,
      game.firstTap,
      game.pressRelease,
      game.wordMath,
      game.finishLyric,
      game.drawImage,
      game.worstAdvice,
      game.captionThis,
      game.chase,
    ]) {
      shiftMiniGameTimes(miniGame, pauseDuration);
    }

    if (game.trivia) {
      triviaTimers.set(lobbyCode, setTimeout(() => resolveTrivia(lobbyCode), Math.max(0, game.trivia.endsAt - Date.now())));
    } else if (game.mostLikely) {
      mostLikelyTimers.set(lobbyCode, setTimeout(() => resolveMostLikely(lobbyCode), Math.max(0, game.mostLikely.endsAt - Date.now())));
    } else if (game.rapidTap) {
      rapidTapTimers.set(lobbyCode, setTimeout(() => resolveRapidTap(lobbyCode), Math.max(0, game.rapidTap.endsAt - Date.now()) + 500));
    } else if (game.stopLine) {
      stopLineTimers.set(lobbyCode, setTimeout(() => resolveStopLine(lobbyCode), Math.max(0, game.stopLine.endsAt - Date.now()) + 500));
    } else if (game.jumpBlock) {
      jumpBlockTimers.set(lobbyCode, setTimeout(() => resolveJumpBlock(lobbyCode), Math.max(0, game.jumpBlock.endsAt - Date.now()) + 500));
    } else if (game.firstTap) {
      firstTapTimers.set(lobbyCode, setTimeout(() => resolveFirstTap(lobbyCode), Math.max(0, game.firstTap.endsAt - Date.now()) + 500));
    } else if (game.pressRelease) {
      pressReleaseTimers.set(lobbyCode, setTimeout(() => resolvePressRelease(lobbyCode), Math.max(0, game.pressRelease.endsAt - Date.now()) + 500));
    } else if (game.wordMath) {
      wordMathTimers.set(lobbyCode, setTimeout(() => resolveWordMath(lobbyCode), Math.max(0, game.wordMath.endsAt - Date.now())));
    } else if (game.finishLyric) {
      finishLyricTimers.set(lobbyCode, setTimeout(() => resolveFinishLyric(lobbyCode), Math.max(0, game.finishLyric.endsAt - Date.now())));
    } else if (game.drawImage?.stage === "drawing") {
      drawImageTimers.set(lobbyCode, setTimeout(() => startDrawImageVoting(lobbyCode), Math.max(0, game.drawImage.drawingEndsAt - Date.now())));
    } else if (game.drawImage?.stage === "voting") {
      drawImageTimers.set(lobbyCode, setTimeout(() => resolveDrawImage(lobbyCode), Math.max(0, game.drawImage.votingEndsAt - Date.now())));
    } else if (game.worstAdvice?.stage === "answering") {
      worstAdviceTimers.set(lobbyCode, setTimeout(() => startWorstAdviceVoting(lobbyCode), Math.max(0, game.worstAdvice.answeringEndsAt - Date.now())));
    } else if (game.worstAdvice?.stage === "voting") {
      worstAdviceTimers.set(lobbyCode, setTimeout(() => resolveWorstAdvice(lobbyCode), Math.max(0, game.worstAdvice.votingEndsAt - Date.now())));
    } else if (game.captionThis?.stage === "photo") {
      captionThisTimers.set(lobbyCode, setTimeout(() => resolveCaptionThis(lobbyCode), Math.max(0, game.captionThis.photoEndsAt - Date.now())));
    } else if (game.captionThis?.stage === "captioning") {
      captionThisTimers.set(lobbyCode, setTimeout(() => startCaptionThisVoting(lobbyCode), Math.max(0, game.captionThis.captionEndsAt - Date.now())));
    } else if (game.captionThis?.stage === "voting") {
      captionThisTimers.set(lobbyCode, setTimeout(() => resolveCaptionThis(lobbyCode), Math.max(0, game.captionThis.votingEndsAt - Date.now())));
    } else if (game.chase) {
      startChaseLoop(lobbyCode);
      chaseTimers.set(lobbyCode, setTimeout(() => resolveChase(lobbyCode, false), Math.max(0, game.chase.endsAt - Date.now())));
    }

    emitActiveMiniGameState(lobbyCode, game);
  }

  function emitPauseState(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game) return;

    const disconnectedPlayers = getLobbyPlayers(lobbyCode).filter(
      (player) => !player.connected,
    );

    if (disconnectedPlayers.length > 0) {
      pauseGame(lobbyCode, game);
    } else {
      resumeGame(lobbyCode, game);
    }

    game.pausedPlayerIds = disconnectedPlayers.map((player) => player.id);

    io.to(lobbyCode).emit("gameStateUpdated", game);
    io.to(lobbyCode).emit("gamePausedUpdated", {
      paused: game.paused,
      disconnectedPlayers,
    });
  }

  function emitGameState(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game) return;

    io.to(lobbyCode).emit("gameStarted", game);
    io.to(lobbyCode).emit("gameStateUpdated", game);
    io.to(lobbyCode).emit("turnUpdated", {
      currentPlayerId: game.currentPlayerId,
    });
  }

  function finishTurn(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game) return;

    clearTurnResolutionTimer(lobbyCode);

    if (game.testMode) {
      if (game.testModeEnding) return;

      game.testModeEnding = true;
      game.currentPlayerId = null;
      game.resolvingTurn = false;
      game.phase = "testComplete";

      io.to(lobbyCode).emit("gameStateUpdated", game);
      io.to(lobbyCode).emit("turnUpdated", {
        currentPlayerId: null,
      });

      setTimeout(() => {
        const currentGame = getLobbyGame(lobbyCode);

        if (!currentGame?.testMode || !currentGame.testModeEnding) return;

        games.delete(lobbyCode);
        io.to(lobbyCode).emit("testMiniGameEnded");
        io.to(lobbyCode).emit("playersUpdated", getLobbyPlayers(lobbyCode));
      }, 5000);
      return;
    }

    const players = getLobbyPlayers(lobbyCode);
    const pendingPlayerIndex = players.findIndex(
      (player) => player.id === game.pendingNextPlayerId,
    );
    const currentPlayerIndex = players.findIndex(
      (player) => player.id === game.currentPlayerId,
    );
    const fallbackTurnIndex =
      players.length > 0
        ? ((game.pendingTurnIndex ?? game.turnIndex ?? 0) % players.length + players.length) %
          players.length
        : -1;

    if (pendingPlayerIndex !== -1) {
      game.currentPlayerId = players[pendingPlayerIndex].id;
      game.turnIndex = pendingPlayerIndex;
    } else if (currentPlayerIndex !== -1) {
      game.currentPlayerId = players[currentPlayerIndex].id;
      game.turnIndex = currentPlayerIndex;
    } else if (fallbackTurnIndex !== -1) {
      game.currentPlayerId = players[fallbackTurnIndex].id;
      game.turnIndex = fallbackTurnIndex;
    } else {
      game.currentPlayerId = null;
      game.turnIndex = 0;
    }

    game.pendingNextPlayerId = null;
    game.pendingTurnIndex = null;
    game.pendingLandingPosition = null;
    game.pendingRollingPlayerId = null;
    game.resolvingTurn = false;
    game.phase = "awaitingRoll";

    io.to(lobbyCode).emit("gameStateUpdated", game);
    io.to(lobbyCode).emit("turnUpdated", {
      currentPlayerId: game.currentPlayerId,
    });
  }

  function createBaseGame(lobbyCode, players, testMode = false) {
    return {
      lobbyCode,
      started: true,
      testMode,
      testModeEnding: false,
      paused: false,
      pausedPlayerIds: [],
      currentPlayerId: testMode ? null : players[0]?.id || null,
      turnIndex: 0,
      phase: testMode ? "testing" : "awaitingRoll",
      pendingNextPlayerId: null,
      pendingTurnIndex: null,
      pendingLandingPosition: null,
      pendingRollingPlayerId: null,
      resolvingTurn: testMode,
      turnResolutionId: 0,
      positions: Object.fromEntries(players.map((player) => [player.id, 0])),
      winner: null,
      remainingTriviaQuestions: [...triviaQuestions],
      remainingMostLikelyPrompts: [...mostLikelyPrompts],
      remainingFinishLyricPrompts: [...finishLyricPrompts],
      remainingDrawImagePrompts: [...drawImagePrompts],
      remainingWorstAdvicePrompts: [...worstAdvicePrompts],
      trivia: null,
      mostLikely: null,
      rapidTap: null,
      stopLine: null,
      jumpBlock: null,
      firstTap: null,
      pressRelease: null,
      wordMath: null,
      finishLyric: null,
      drawImage: null,
      worstAdvice: null,
      captionThis: null,
      chase: null,
    };
  }

  function startMiniGameByType(lobbyCode, miniGameType) {
    const starters = {
      trivia: startTrivia,
      mostLikely: startMostLikely,
      rapidTap: startRapidTap,
      stopLine: startStopLine,
      jumpBlock: startJumpBlock,
      firstTap: startFirstTap,
      pressRelease: startPressRelease,
      wordMath: startWordMath,
      finishLyric: startFinishLyric,
      drawImage: startDrawImage,
      worstAdvice: startWorstAdvice,
      captionThis: startCaptionThis,
      chase: startChase,
    };
    const startMiniGame = starters[miniGameType];

    if (!startMiniGame) return false;

    return startMiniGame(lobbyCode) !== false;
  }

  function finishGame(lobbyCode, winner) {
    const game = getLobbyGame(lobbyCode);

    if (!game) return;

    clearTurnResolutionTimer(lobbyCode);

    game.currentPlayerId = null;
    game.pendingNextPlayerId = null;
    game.pendingTurnIndex = null;
    game.pendingLandingPosition = null;
    game.pendingRollingPlayerId = null;
    game.resolvingTurn = false;
    game.phase = "gameOver";
    game.winner = winner;

    io.to(lobbyCode).emit("gameStateUpdated", game);
    io.to(lobbyCode).emit("turnUpdated", {
      currentPlayerId: null,
    });
    io.to(lobbyCode).emit("gameWon", winner);
  }

  function clearTurnResolutionTimer(lobbyCode) {
    const timer = turnResolutionTimers.get(lobbyCode);

    if (timer) {
      clearTimeout(timer);
      turnResolutionTimers.delete(lobbyCode);
    }
  }

  function scheduleTurnResolution(lobbyCode, turnResolutionId, callback, delay) {
    clearTurnResolutionTimer(lobbyCode);

    const timer = setTimeout(() => {
      turnResolutionTimers.delete(lobbyCode);

      const game = getLobbyGame(lobbyCode);

      if (!game || game.turnResolutionId !== turnResolutionId) return;

      callback();
    }, delay);

    turnResolutionTimers.set(lobbyCode, timer);
  }

  function completeRollMovement(lobbyCode, turnResolutionId) {
    const game = getLobbyGame(lobbyCode);

    if (
      !game ||
      game.turnResolutionId !== turnResolutionId ||
      game.phase !== "moving"
    ) {
      return;
    }

    clearTurnResolutionTimer(lobbyCode);

    if (game.pendingLandingPosition >= BOARD_TILE_COUNT - 1) {
      const players = getLobbyPlayers(lobbyCode);
      const winner = players.find(
        (player) => player.id === game.pendingRollingPlayerId,
      );

      finishGame(lobbyCode, winner || null);
      return;
    }

    if (TRIVIA_TILE_POSITIONS.has(game.pendingLandingPosition)) {
      startTrivia(lobbyCode);
    } else if (MOST_LIKELY_TILE_POSITIONS.has(game.pendingLandingPosition)) {
      startMostLikely(lobbyCode);
    } else if (RAPID_TAP_TILE_POSITIONS.has(game.pendingLandingPosition)) {
      startRapidTap(lobbyCode);
    } else if (STOP_LINE_TILE_POSITIONS.has(game.pendingLandingPosition)) {
      startStopLine(lobbyCode);
    } else if (JUMP_BLOCK_TILE_POSITIONS.has(game.pendingLandingPosition)) {
      startJumpBlock(lobbyCode);
    } else if (FIRST_TAP_TILE_POSITIONS.has(game.pendingLandingPosition)) {
      startFirstTap(lobbyCode);
    } else if (PRESS_RELEASE_TILE_POSITIONS.has(game.pendingLandingPosition)) {
      startPressRelease(lobbyCode);
    } else if (WORD_MATH_TILE_POSITIONS.has(game.pendingLandingPosition)) {
      startWordMath(lobbyCode);
    } else if (FINISH_LYRIC_TILE_POSITIONS.has(game.pendingLandingPosition)) {
      startFinishLyric(lobbyCode);
    } else if (DRAW_IMAGE_TILE_POSITIONS.has(game.pendingLandingPosition)) {
      startDrawImage(lobbyCode);
    } else if (WORST_ADVICE_TILE_POSITIONS.has(game.pendingLandingPosition)) {
      startWorstAdvice(lobbyCode);
    } else if (CAPTION_THIS_TILE_POSITIONS.has(game.pendingLandingPosition)) {
      startCaptionThis(lobbyCode);
    } else if (CHASE_TILE_POSITIONS.has(game.pendingLandingPosition)) {
      startChase(lobbyCode);
    } else {
      finishTurn(lobbyCode);
    }
  }

  function clearTriviaTimer(lobbyCode) {
    const timer = triviaTimers.get(lobbyCode);

    if (timer) {
      clearTimeout(timer);
      triviaTimers.delete(lobbyCode);
    }
  }

  function clearMostLikelyTimer(lobbyCode) {
    const timer = mostLikelyTimers.get(lobbyCode);

    if (timer) {
      clearTimeout(timer);
      mostLikelyTimers.delete(lobbyCode);
    }
  }

  function clearRapidTapTimer(lobbyCode) {
    const timer = rapidTapTimers.get(lobbyCode);

    if (timer) {
      clearTimeout(timer);
      rapidTapTimers.delete(lobbyCode);
    }
  }

  function clearStopLineTimer(lobbyCode) {
    const timer = stopLineTimers.get(lobbyCode);

    if (timer) {
      clearTimeout(timer);
      stopLineTimers.delete(lobbyCode);
    }
  }

  function clearJumpBlockTimer(lobbyCode) {
    const timer = jumpBlockTimers.get(lobbyCode);

    if (timer) {
      clearTimeout(timer);
      jumpBlockTimers.delete(lobbyCode);
    }
  }

  function clearFirstTapTimer(lobbyCode) {
    const timer = firstTapTimers.get(lobbyCode);

    if (timer) {
      clearTimeout(timer);
      firstTapTimers.delete(lobbyCode);
    }
  }

  function clearPressReleaseTimer(lobbyCode) {
    const timer = pressReleaseTimers.get(lobbyCode);

    if (timer) {
      clearTimeout(timer);
      pressReleaseTimers.delete(lobbyCode);
    }
  }

  function clearWordMathTimer(lobbyCode) {
    const timer = wordMathTimers.get(lobbyCode);

    if (timer) {
      clearTimeout(timer);
      wordMathTimers.delete(lobbyCode);
    }
  }

  function clearFinishLyricTimer(lobbyCode) {
    const timer = finishLyricTimers.get(lobbyCode);

    if (timer) {
      clearTimeout(timer);
      finishLyricTimers.delete(lobbyCode);
    }
  }

  function clearDrawImageTimer(lobbyCode) {
    const timer = drawImageTimers.get(lobbyCode);

    if (timer) {
      clearTimeout(timer);
      drawImageTimers.delete(lobbyCode);
    }
  }

  function clearWorstAdviceTimer(lobbyCode) {
    const timer = worstAdviceTimers.get(lobbyCode);

    if (timer) {
      clearTimeout(timer);
      worstAdviceTimers.delete(lobbyCode);
    }
  }

  function clearCaptionThisTimer(lobbyCode) {
    const timer = captionThisTimers.get(lobbyCode);

    if (timer) {
      clearTimeout(timer);
      captionThisTimers.delete(lobbyCode);
    }
  }

  function clearChaseTimer(lobbyCode) {
    const timer = chaseTimers.get(lobbyCode);
    const interval = chaseIntervals.get(lobbyCode);

    if (timer) {
      clearTimeout(timer);
      chaseTimers.delete(lobbyCode);
    }

    if (interval) {
      clearInterval(interval);
      chaseIntervals.delete(lobbyCode);
    }
  }

  function makeWordMathProblem() {
    const template =
      wordMathTemplates[Math.floor(Math.random() * wordMathTemplates.length)];
    const problem = template.make();
    const choices = new Set([problem.answer]);

    while (choices.size < 4) {
      const offset = Math.floor(Math.random() * 9) - 4;
      const choice = Math.max(0, problem.answer + (offset || 1));
      choices.add(choice);
    }

    const shuffledChoices = Array.from(choices).sort(() => Math.random() - 0.5);

    return {
      question: problem.question,
      choices: shuffledChoices.map(String),
      correctIndex: shuffledChoices.indexOf(problem.answer),
    };
  }

  function getPublicTrivia(trivia) {
    if (!trivia) return null;

    return {
      id: trivia.id,
      question: trivia.question,
      choices: trivia.choices,
      endsAt: trivia.endsAt,
      playStartsAt: trivia.playStartsAt,
      answeredPlayerIds: Object.keys(trivia.answers),
      participantIds: getMiniGameParticipantIds(trivia),
      totalPlayers: trivia.totalPlayers,
    };
  }

  function emitTriviaState(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.trivia) return;

    io.to(lobbyCode).emit("triviaStarted", getPublicTrivia(game.trivia));
  }

  function getPublicMostLikely(mostLikely) {
    if (!mostLikely) return null;

    return {
      id: mostLikely.id,
      prompt: mostLikely.prompt,
      choices: mostLikely.choices,
      endsAt: mostLikely.endsAt,
      playStartsAt: mostLikely.playStartsAt,
      answeredPlayerIds: Object.keys(mostLikely.votes),
      participantIds: getMiniGameParticipantIds(mostLikely),
      totalPlayers: mostLikely.totalPlayers,
    };
  }

  function emitMostLikelyState(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.mostLikely) return;

    io.to(lobbyCode).emit("mostLikelyStarted", getPublicMostLikely(game.mostLikely));
  }

  function getPublicRapidTap(rapidTap) {
    if (!rapidTap) return null;

    return {
      id: rapidTap.id,
      endsAt: rapidTap.endsAt,
      playStartsAt: rapidTap.playStartsAt,
      choices: rapidTap.choices,
      scores: rapidTap.scores,
      submittedPlayerIds: Object.keys(rapidTap.finalScores),
      participantIds: getMiniGameParticipantIds(rapidTap),
      totalPlayers: rapidTap.totalPlayers,
    };
  }

  function getPublicStopLine(stopLine) {
    if (!stopLine) return null;

    return {
      id: stopLine.id,
      endsAt: stopLine.endsAt,
      startedAt: stopLine.startedAt,
      playStartsAt: stopLine.playStartsAt,
      target: stopLine.target,
      choices: stopLine.choices,
      results: stopLine.results,
      submittedPlayerIds: Object.keys(stopLine.finalResults),
      participantIds: getMiniGameParticipantIds(stopLine),
      totalPlayers: stopLine.totalPlayers,
    };
  }

  function getPublicJumpBlock(jumpBlock) {
    if (!jumpBlock) return null;

    return {
      id: jumpBlock.id,
      endsAt: jumpBlock.endsAt,
      startedAt: jumpBlock.startedAt,
      playStartsAt: jumpBlock.playStartsAt,
      choices: jumpBlock.choices,
      scores: jumpBlock.scores,
      submittedPlayerIds: Object.keys(jumpBlock.finalScores),
      participantIds: getMiniGameParticipantIds(jumpBlock),
      totalPlayers: jumpBlock.totalPlayers,
    };
  }

  function getPublicFirstTap(firstTap) {
    if (!firstTap) return null;

    return {
      id: firstTap.id,
      endsAt: firstTap.endsAt,
      playStartsAt: firstTap.playStartsAt,
      choices: firstTap.choices,
      pressOrder: firstTap.pressOrder.map((press) => ({
        playerId: press.playerId,
        playerName: press.playerName,
      })),
      submittedPlayerIds: firstTap.pressOrder.map((press) => press.playerId),
      participantIds: getMiniGameParticipantIds(firstTap),
      totalPlayers: firstTap.totalPlayers,
    };
  }

  function getPublicPressRelease(pressRelease) {
    if (!pressRelease) return null;

    return {
      id: pressRelease.id,
      endsAt: pressRelease.endsAt,
      playStartsAt: pressRelease.playStartsAt,
      targetMs: pressRelease.targetMs,
      choices: pressRelease.choices,
      results: pressRelease.results,
      submittedPlayerIds: Object.keys(pressRelease.results),
      participantIds: getMiniGameParticipantIds(pressRelease),
      totalPlayers: pressRelease.totalPlayers,
    };
  }

  function getPublicWordMath(wordMath) {
    if (!wordMath) return null;

    return {
      id: wordMath.id,
      question: wordMath.question,
      choices: wordMath.choices,
      endsAt: wordMath.endsAt,
      playStartsAt: wordMath.playStartsAt,
      answeredPlayerIds: Object.keys(wordMath.answers),
      participantIds: getMiniGameParticipantIds(wordMath),
      totalPlayers: wordMath.totalPlayers,
    };
  }

  function getPublicFinishLyric(finishLyric) {
    if (!finishLyric) return null;

    return {
      id: finishLyric.id,
      prompt: finishLyric.prompt,
      choices: finishLyric.choices,
      endsAt: finishLyric.endsAt,
      playStartsAt: finishLyric.playStartsAt,
      answeredPlayerIds: Object.keys(finishLyric.answers),
      participantIds: getMiniGameParticipantIds(finishLyric),
      totalPlayers: finishLyric.totalPlayers,
    };
  }

  function getPublicDrawImage(drawImage) {
    if (!drawImage) return null;

    const submissions = Object.values(drawImage.drawings);

    return {
      id: drawImage.id,
      prompt: drawImage.prompt,
      stage: drawImage.stage,
      playStartsAt: drawImage.playStartsAt,
      endsAt: drawImage.endsAt,
      drawingEndsAt: drawImage.drawingEndsAt,
      votingEndsAt: drawImage.votingEndsAt,
      submissions,
      submittedPlayerIds: submissions.map((submission) => submission.playerId),
      votedPlayerIds: Object.keys(drawImage.votes),
      participantIds: getMiniGameParticipantIds(drawImage),
      totalPlayers: drawImage.totalPlayers,
    };
  }

  function getPublicWorstAdvice(worstAdvice) {
    if (!worstAdvice) return null;

    const submissions = Object.values(worstAdvice.answers);

    return {
      id: worstAdvice.id,
      prompt: worstAdvice.prompt,
      stage: worstAdvice.stage,
      playStartsAt: worstAdvice.playStartsAt,
      endsAt: worstAdvice.endsAt,
      answeringEndsAt: worstAdvice.answeringEndsAt,
      votingEndsAt: worstAdvice.votingEndsAt,
      submissions,
      submittedPlayerIds: submissions.map((submission) => submission.playerId),
      votedPlayerIds: Object.keys(worstAdvice.votes),
      participantIds: getMiniGameParticipantIds(worstAdvice),
      totalPlayers: worstAdvice.totalPlayers,
    };
  }

  function getPublicCaptionThis(captionThis) {
    if (!captionThis) return null;

    const submissions = Object.values(captionThis.captions);

    return {
      id: captionThis.id,
      stage: captionThis.stage,
      photo: captionThis.photo,
      photoPlayerId: captionThis.photoPlayerId,
      photoPlayerName: captionThis.photoPlayerName,
      playStartsAt: captionThis.playStartsAt,
      endsAt: captionThis.endsAt,
      photoEndsAt: captionThis.photoEndsAt,
      captionEndsAt: captionThis.captionEndsAt,
      votingEndsAt: captionThis.votingEndsAt,
      submissions,
      submittedPlayerIds: submissions.map((submission) => submission.playerId),
      votedPlayerIds: Object.keys(captionThis.votes),
      participantIds: getMiniGameParticipantIds(captionThis),
      totalPlayers: captionThis.totalPlayers,
    };
  }

  function getPublicChase(chase) {
    if (!chase) return null;

    return {
      id: chase.id,
      columns: chase.columns,
      rows: chase.rows,
      barriers: chase.barriers,
      players: chase.players,
      runnerId: chase.runnerId,
      caught: chase.caught,
      caughtById: chase.caughtById,
      playStartsAt: chase.playStartsAt,
      endsAt: chase.endsAt,
      participantIds: getMiniGameParticipantIds(chase),
      totalPlayers: chase.totalPlayers,
    };
  }

  function emitRapidTapState(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.rapidTap) return;

    io.to(lobbyCode).emit("rapidTapUpdated", getPublicRapidTap(game.rapidTap));
  }

  function emitStopLineState(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.stopLine) return;

    io.to(lobbyCode).emit("stopLineUpdated", getPublicStopLine(game.stopLine));
  }

  function emitJumpBlockState(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.jumpBlock) return;

    io.to(lobbyCode).emit("jumpBlockUpdated", getPublicJumpBlock(game.jumpBlock));
  }

  function emitFirstTapState(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.firstTap) return;

    io.to(lobbyCode).emit("firstTapUpdated", getPublicFirstTap(game.firstTap));
  }

  function emitPressReleaseState(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.pressRelease) return;

    io.to(lobbyCode).emit(
      "pressReleaseUpdated",
      getPublicPressRelease(game.pressRelease),
    );
  }

  function emitWordMathState(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.wordMath) return;

    io.to(lobbyCode).emit("wordMathStarted", getPublicWordMath(game.wordMath));
  }

  function emitFinishLyricState(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.finishLyric) return;

    io.to(lobbyCode).emit(
      "finishLyricStarted",
      getPublicFinishLyric(game.finishLyric),
    );
  }

  function emitDrawImageState(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.drawImage) return;

    io.to(lobbyCode).emit("drawImageUpdated", getPublicDrawImage(game.drawImage));
  }

  function emitWorstAdviceState(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.worstAdvice) return;

    io.to(lobbyCode).emit(
      "worstAdviceUpdated",
      getPublicWorstAdvice(game.worstAdvice),
    );
  }

  function emitCaptionThisState(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.captionThis) return;

    io.to(lobbyCode).emit(
      "captionThisUpdated",
      getPublicCaptionThis(game.captionThis),
    );
  }

  function emitChaseState(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.chase) return;

    io.to(lobbyCode).emit("chaseUpdated", getPublicChase(game.chase));
  }

  function resolveTrivia(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.trivia) return;

    clearTriviaTimer(lobbyCode);

    const trivia = game.trivia;
    const players = getMiniGamePlayers(lobbyCode, trivia);
    const penalties = [];

    for (const player of players) {
      const answer = trivia.answers[player.id];

      if (answer !== trivia.correctIndex) {
        const spacesBack = Math.floor(Math.random() * 3) + 1;
        const fromPosition = game.positions?.[player.id] || 0;
        const toPosition = Math.max(0, fromPosition - spacesBack);

        game.positions[player.id] = toPosition;
        penalties.push({
          playerId: player.id,
          playerName: player.name,
          spacesBack,
          fromPosition,
          toPosition,
        });
      }
    }

    game.trivia = null;
    game.phase = "resolving";

    io.to(lobbyCode).emit("triviaResolved", {
      question: trivia.question,
      choices: trivia.choices,
      correctIndex: trivia.correctIndex,
      penalties,
    });

    io.to(lobbyCode).emit("gameStateUpdated", game);

    scheduleTurnResolution(
      lobbyCode,
      game.turnResolutionId,
      () => {
        finishTurn(lobbyCode);
      },
      TRIVIA_PENALTY_REVEAL_MS,
    );
  }

  function resolveMostLikely(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.mostLikely) return;

    clearMostLikelyTimer(lobbyCode);

    const mostLikely = game.mostLikely;
    const voteCounts = {};

    for (const votedPlayerId of Object.values(mostLikely.votes)) {
      voteCounts[votedPlayerId] = (voteCounts[votedPlayerId] || 0) + 1;
    }

    const topVoteCount = Math.max(0, ...Object.values(voteCounts));
    const losingPlayerIds = Object.entries(voteCounts)
      .filter(([, count]) => count === topVoteCount && count > 0)
      .map(([playerId]) => playerId);
    const players = getMiniGamePlayers(lobbyCode, rapidTap);
    const penalties = [];

    for (const playerId of losingPlayerIds) {
      const player = players.find((lobbyPlayer) => lobbyPlayer.id === playerId);

      if (!player) continue;

      const spacesBack = Math.floor(Math.random() * 3) + 1;
      const fromPosition = game.positions?.[player.id] || 0;
      const toPosition = Math.max(0, fromPosition - spacesBack);

      game.positions[player.id] = toPosition;
      penalties.push({
        playerId: player.id,
        playerName: player.name,
        spacesBack,
        fromPosition,
        toPosition,
      });
    }

    game.mostLikely = null;
    game.phase = "resolving";

    io.to(lobbyCode).emit("mostLikelyResolved", {
      prompt: mostLikely.prompt,
      voteCounts,
      penalties,
    });

    io.to(lobbyCode).emit("gameStateUpdated", game);

    scheduleTurnResolution(
      lobbyCode,
      game.turnResolutionId,
      () => {
        finishTurn(lobbyCode);
      },
      TRIVIA_PENALTY_REVEAL_MS,
    );
  }

  function resolveRapidTap(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.rapidTap) return;

    clearRapidTapTimer(lobbyCode);

    const rapidTap = game.rapidTap;
    const scores = {
      ...rapidTap.scores,
      ...rapidTap.finalScores,
    };
    const players = getMiniGamePlayers(lobbyCode, stopLine);
    const playerScores = players.map((player) => ({
      player,
      score: scores[player.id] || 0,
    }));
    const lowestScore = Math.min(...playerScores.map(({ score }) => score));
    const losingPlayers = playerScores.filter(({ score }) => score === lowestScore);
    const penalties = [];

    for (const { player, score } of losingPlayers) {
      const spacesBack = Math.floor(Math.random() * 3) + 1;
      const fromPosition = game.positions?.[player.id] || 0;
      const toPosition = Math.max(0, fromPosition - spacesBack);

      game.positions[player.id] = toPosition;
      penalties.push({
        playerId: player.id,
        playerName: player.name,
        score,
        spacesBack,
        fromPosition,
        toPosition,
      });
    }

    game.rapidTap = null;
    game.phase = "resolving";

    io.to(lobbyCode).emit("rapidTapResolved", {
      scores,
      penalties,
    });

    io.to(lobbyCode).emit("gameStateUpdated", game);

    scheduleTurnResolution(
      lobbyCode,
      game.turnResolutionId,
      () => {
        finishTurn(lobbyCode);
      },
      TRIVIA_PENALTY_REVEAL_MS,
    );
  }

  function resolveStopLine(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.stopLine) return;

    clearStopLineTimer(lobbyCode);

    const stopLine = game.stopLine;
    const results = {
      ...stopLine.results,
      ...stopLine.finalResults,
    };
    const players = getMiniGamePlayers(lobbyCode, jumpBlock);
    const playerResults = players.map((player) => ({
      player,
      distance: results[player.id]?.distance ?? 100,
      position: results[player.id]?.position ?? 0,
    }));
    const worstDistance = Math.max(...playerResults.map(({ distance }) => distance));
    const losingPlayers = playerResults.filter(
      ({ distance }) => distance === worstDistance,
    );
    const penalties = [];

    for (const { player, distance, position } of losingPlayers) {
      const spacesBack = Math.floor(Math.random() * 3) + 1;
      const fromPosition = game.positions?.[player.id] || 0;
      const toPosition = Math.max(0, fromPosition - spacesBack);

      game.positions[player.id] = toPosition;
      penalties.push({
        playerId: player.id,
        playerName: player.name,
        distance,
        position,
        spacesBack,
        fromPosition,
        toPosition,
      });
    }

    game.stopLine = null;
    game.phase = "resolving";

    io.to(lobbyCode).emit("stopLineResolved", {
      results,
      target: stopLine.target,
      penalties,
    });

    io.to(lobbyCode).emit("gameStateUpdated", game);

    scheduleTurnResolution(
      lobbyCode,
      game.turnResolutionId,
      () => {
        finishTurn(lobbyCode);
      },
      TRIVIA_PENALTY_REVEAL_MS,
    );
  }

  function resolveJumpBlock(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.jumpBlock) return;

    clearJumpBlockTimer(lobbyCode);

    const jumpBlock = game.jumpBlock;
    const scores = {
      ...jumpBlock.scores,
      ...jumpBlock.finalScores,
    };
    const players = getMiniGamePlayers(lobbyCode, firstTap);
    const playerScores = players.map((player) => ({
      player,
      score: scores[player.id] || 0,
    }));
    const lowestScore = Math.min(...playerScores.map(({ score }) => score));
    const losingPlayers = playerScores.filter(({ score }) => score === lowestScore);
    const penalties = [];

    for (const { player, score } of losingPlayers) {
      const spacesBack = Math.floor(Math.random() * 3) + 1;
      const fromPosition = game.positions?.[player.id] || 0;
      const toPosition = Math.max(0, fromPosition - spacesBack);

      game.positions[player.id] = toPosition;
      penalties.push({
        playerId: player.id,
        playerName: player.name,
        score,
        spacesBack,
        fromPosition,
        toPosition,
      });
    }

    game.jumpBlock = null;
    game.phase = "resolving";

    io.to(lobbyCode).emit("jumpBlockResolved", {
      scores,
      penalties,
    });

    io.to(lobbyCode).emit("gameStateUpdated", game);

    scheduleTurnResolution(
      lobbyCode,
      game.turnResolutionId,
      () => {
        finishTurn(lobbyCode);
      },
      TRIVIA_PENALTY_REVEAL_MS,
    );
  }

  function resolveFirstTap(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.firstTap) return;

    clearFirstTapTimer(lobbyCode);

    const firstTap = game.firstTap;
    const players = getMiniGamePlayers(lobbyCode, pressRelease);
    const pressedPlayerIds = new Set(
      firstTap.pressOrder.map((press) => press.playerId),
    );
    const missingPlayers = players.filter((player) => !pressedPlayerIds.has(player.id));
    const losingPlayers =
      missingPlayers.length > 0
        ? missingPlayers
        : firstTap.pressOrder.length > 0
          ? [
              players.find(
                (player) =>
                  player.id === firstTap.pressOrder[firstTap.pressOrder.length - 1].playerId,
              ),
            ].filter(Boolean)
          : players;
    const penalties = [];

    for (const player of losingPlayers) {
      const spacesBack = Math.floor(Math.random() * 3) + 1;
      const fromPosition = game.positions?.[player.id] || 0;
      const toPosition = Math.max(0, fromPosition - spacesBack);

      game.positions[player.id] = toPosition;
      penalties.push({
        playerId: player.id,
        playerName: player.name,
        spacesBack,
        fromPosition,
        toPosition,
      });
    }

    game.firstTap = null;
    game.phase = "resolving";

    io.to(lobbyCode).emit("firstTapResolved", {
      pressOrder: firstTap.pressOrder,
      penalties,
    });

    io.to(lobbyCode).emit("gameStateUpdated", game);

    scheduleTurnResolution(
      lobbyCode,
      game.turnResolutionId,
      () => {
        finishTurn(lobbyCode);
      },
      TRIVIA_PENALTY_REVEAL_MS,
    );
  }

  function resolvePressRelease(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.pressRelease) return;

    clearPressReleaseTimer(lobbyCode);

    const pressRelease = game.pressRelease;
    const players = getLobbyPlayers(lobbyCode);
    const results = { ...pressRelease.results };

    for (const player of players) {
      if (!results[player.id]) {
        results[player.id] = {
          playerId: player.id,
          playerName: player.name,
          heldMs: 0,
          differenceMs: pressRelease.targetMs,
        };
      }
    }

    const playerResults = players.map((player) => ({
      player,
      result: results[player.id],
    }));
    const worstDifference = Math.max(
      ...playerResults.map(({ result }) => result?.differenceMs ?? pressRelease.targetMs),
    );
    const losingPlayers = playerResults.filter(
      ({ result }) => (result?.differenceMs ?? pressRelease.targetMs) === worstDifference,
    );
    const penalties = [];

    for (const { player, result } of losingPlayers) {
      const spacesBack = Math.floor(Math.random() * 3) + 1;
      const fromPosition = game.positions?.[player.id] || 0;
      const toPosition = Math.max(0, fromPosition - spacesBack);

      game.positions[player.id] = toPosition;
      penalties.push({
        playerId: player.id,
        playerName: player.name,
        heldMs: result?.heldMs || 0,
        differenceMs: result?.differenceMs ?? pressRelease.targetMs,
        spacesBack,
        fromPosition,
        toPosition,
      });
    }

    game.pressRelease = null;
    game.phase = "resolving";

    io.to(lobbyCode).emit("pressReleaseResolved", {
      targetMs: pressRelease.targetMs,
      results,
      penalties,
    });

    io.to(lobbyCode).emit("gameStateUpdated", game);

    scheduleTurnResolution(
      lobbyCode,
      game.turnResolutionId,
      () => {
        finishTurn(lobbyCode);
      },
      TRIVIA_PENALTY_REVEAL_MS,
    );
  }

  function resolveWordMath(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.wordMath) return;

    clearWordMathTimer(lobbyCode);

    const wordMath = game.wordMath;
    const players = getMiniGamePlayers(lobbyCode, wordMath);
    const penalties = [];

    for (const player of players) {
      const answer = wordMath.answers[player.id];

      if (answer !== wordMath.correctIndex) {
        const spacesBack = Math.floor(Math.random() * 3) + 1;
        const fromPosition = game.positions?.[player.id] || 0;
        const toPosition = Math.max(0, fromPosition - spacesBack);

        game.positions[player.id] = toPosition;
        penalties.push({
          playerId: player.id,
          playerName: player.name,
          spacesBack,
          fromPosition,
          toPosition,
        });
      }
    }

    game.wordMath = null;
    game.phase = "resolving";

    io.to(lobbyCode).emit("wordMathResolved", {
      question: wordMath.question,
      choices: wordMath.choices,
      correctIndex: wordMath.correctIndex,
      penalties,
    });

    io.to(lobbyCode).emit("gameStateUpdated", game);

    scheduleTurnResolution(
      lobbyCode,
      game.turnResolutionId,
      () => {
        finishTurn(lobbyCode);
      },
      TRIVIA_PENALTY_REVEAL_MS,
    );
  }

  function resolveFinishLyric(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.finishLyric) return;

    clearFinishLyricTimer(lobbyCode);

    const finishLyric = game.finishLyric;
    const players = getMiniGamePlayers(lobbyCode, finishLyric);
    const penalties = [];

    for (const player of players) {
      const answer = finishLyric.answers[player.id];

      if (answer !== finishLyric.correctIndex) {
        const spacesBack = Math.floor(Math.random() * 3) + 1;
        const fromPosition = game.positions?.[player.id] || 0;
        const toPosition = Math.max(0, fromPosition - spacesBack);

        game.positions[player.id] = toPosition;
        penalties.push({
          playerId: player.id,
          playerName: player.name,
          spacesBack,
          fromPosition,
          toPosition,
        });
      }
    }

    game.finishLyric = null;
    game.phase = "resolving";

    io.to(lobbyCode).emit("finishLyricResolved", {
      prompt: finishLyric.prompt,
      choices: finishLyric.choices,
      correctIndex: finishLyric.correctIndex,
      penalties,
    });

    io.to(lobbyCode).emit("gameStateUpdated", game);

    scheduleTurnResolution(
      lobbyCode,
      game.turnResolutionId,
      () => {
        finishTurn(lobbyCode);
      },
      TRIVIA_PENALTY_REVEAL_MS,
    );
  }

  function resolveDrawImage(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.drawImage) return;

    clearDrawImageTimer(lobbyCode);

    const drawImage = game.drawImage;
    const players = getMiniGamePlayers(lobbyCode, drawImage);
    const voteCounts = {};

    for (const submission of Object.values(drawImage.drawings)) {
      voteCounts[submission.playerId] = 0;
    }

    for (const votedPlayerId of Object.values(drawImage.votes)) {
      if (voteCounts[votedPlayerId] !== undefined) {
        voteCounts[votedPlayerId] += 1;
      }
    }

    const submittedPlayerIds = Object.keys(voteCounts);
    const lowestVoteCount =
      submittedPlayerIds.length > 1
        ? Math.min(...submittedPlayerIds.map((playerId) => voteCounts[playerId]))
        : 0;
    const penalties = [];

    for (const playerId of submittedPlayerIds.length > 1 ? submittedPlayerIds : []) {
      if (voteCounts[playerId] !== lowestVoteCount) continue;

      const player = players.find((lobbyPlayer) => lobbyPlayer.id === playerId);
      const fromPosition = game.positions?.[playerId] || 0;
      const toPosition = Math.max(0, fromPosition - 1);

      game.positions[playerId] = toPosition;
      penalties.push({
        playerId,
        playerName: player?.name || drawImage.drawings[playerId]?.playerName || "Player",
        spacesBack: 1,
        fromPosition,
        toPosition,
      });
    }

    game.drawImage = null;
    game.phase = "resolving";

    io.to(lobbyCode).emit("drawImageResolved", {
      prompt: drawImage.prompt,
      submissions: Object.values(drawImage.drawings),
      votes: drawImage.votes,
      voteCounts,
      penalties,
    });

    io.to(lobbyCode).emit("gameStateUpdated", game);

    scheduleTurnResolution(
      lobbyCode,
      game.turnResolutionId,
      () => {
        finishTurn(lobbyCode);
      },
      TRIVIA_PENALTY_REVEAL_MS,
    );
  }

  function resolveWorstAdvice(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.worstAdvice) return;

    clearWorstAdviceTimer(lobbyCode);

    const worstAdvice = game.worstAdvice;
    const players = getMiniGamePlayers(lobbyCode, worstAdvice);
    const voteCounts = {};

    for (const submission of Object.values(worstAdvice.answers)) {
      voteCounts[submission.playerId] = 0;
    }

    for (const votedPlayerId of Object.values(worstAdvice.votes)) {
      if (voteCounts[votedPlayerId] !== undefined) voteCounts[votedPlayerId] += 1;
    }

    const submittedPlayerIds = Object.keys(voteCounts);
    const lowestVoteCount =
      submittedPlayerIds.length > 1
        ? Math.min(...submittedPlayerIds.map((playerId) => voteCounts[playerId]))
        : 0;
    const penalties = [];

    for (const playerId of submittedPlayerIds.length > 1 ? submittedPlayerIds : []) {
      if (voteCounts[playerId] !== lowestVoteCount) continue;

      const player = players.find((lobbyPlayer) => lobbyPlayer.id === playerId);
      const fromPosition = game.positions?.[playerId] || 0;
      const toPosition = Math.max(0, fromPosition - 1);

      game.positions[playerId] = toPosition;
      penalties.push({
        playerId,
        playerName: player?.name || worstAdvice.answers[playerId]?.playerName || "Player",
        spacesBack: 1,
        fromPosition,
        toPosition,
      });
    }

    game.worstAdvice = null;
    game.phase = "resolving";

    io.to(lobbyCode).emit("worstAdviceResolved", {
      prompt: worstAdvice.prompt,
      submissions: Object.values(worstAdvice.answers),
      votes: worstAdvice.votes,
      voteCounts,
      penalties,
    });

    io.to(lobbyCode).emit("gameStateUpdated", game);

    scheduleTurnResolution(
      lobbyCode,
      game.turnResolutionId,
      () => {
        finishTurn(lobbyCode);
      },
      TRIVIA_PENALTY_REVEAL_MS,
    );
  }

  function resolveCaptionThis(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.captionThis) return;

    clearCaptionThisTimer(lobbyCode);

    const captionThis = game.captionThis;
    const players = getMiniGamePlayers(lobbyCode, captionThis);
    const voteCounts = {};

    for (const submission of Object.values(captionThis.captions)) {
      voteCounts[submission.playerId] = 0;
    }

    for (const votedPlayerId of Object.values(captionThis.votes)) {
      if (voteCounts[votedPlayerId] !== undefined) {
        voteCounts[votedPlayerId] += 1;
      }
    }

    const submittedPlayerIds = Object.keys(voteCounts);
    const highestVoteCount =
      submittedPlayerIds.length > 1
        ? Math.max(...submittedPlayerIds.map((playerId) => voteCounts[playerId]))
        : 0;
    const winningPlayerIds =
      submittedPlayerIds.length > 1
        ? submittedPlayerIds.filter((playerId) => voteCounts[playerId] === highestVoteCount)
        : [];
    const penalties = [];

    if (winningPlayerIds.length > 0) {
      for (const player of players) {
        if (winningPlayerIds.includes(player.id)) continue;

        const fromPosition = game.positions?.[player.id] || 0;
        const toPosition = Math.max(0, fromPosition - 1);

        game.positions[player.id] = toPosition;
        penalties.push({
          playerId: player.id,
          playerName: player.name,
          spacesBack: 1,
          fromPosition,
          toPosition,
        });
      }
    }

    game.captionThis = null;
    game.phase = "resolving";

    io.to(lobbyCode).emit("captionThisResolved", {
      photo: captionThis.photo,
      photoPlayerId: captionThis.photoPlayerId,
      photoPlayerName: captionThis.photoPlayerName,
      submissions: Object.values(captionThis.captions),
      votes: captionThis.votes,
      voteCounts,
      winningPlayerIds,
      penalties,
    });

    io.to(lobbyCode).emit("gameStateUpdated", game);

    scheduleTurnResolution(
      lobbyCode,
      game.turnResolutionId,
      () => {
        finishTurn(lobbyCode);
      },
      TRIVIA_PENALTY_REVEAL_MS,
    );
  }

  function isChaseBarrier(chase, x, y) {
    return chase.barriers.some((barrier) => barrier.x === x && barrier.y === y);
  }

  function clampChasePosition(chase, position) {
    return {
      x: Math.max(0.35, Math.min(chase.columns - 0.35, position.x)),
      y: Math.max(0.35, Math.min(chase.rows - 0.35, position.y)),
    };
  }

  function moveChasePlayer(chase, chasePlayer, deltaSeconds) {
    const direction = chasePlayer.direction || { x: 0, y: 0 };

    if (direction.x === 0 && direction.y === 0) return chasePlayer;

    const nextPosition = clampChasePosition(chase, {
      x: chasePlayer.x + direction.x * CHASE_SPEED_CELLS_PER_SECOND * deltaSeconds,
      y: chasePlayer.y + direction.y * CHASE_SPEED_CELLS_PER_SECOND * deltaSeconds,
    });
    const nextTileX = Math.floor(nextPosition.x);
    const nextTileY = Math.floor(nextPosition.y);

    if (isChaseBarrier(chase, nextTileX, nextTileY)) {
      return {
        ...chasePlayer,
        direction: { x: 0, y: 0 },
      };
    }

    return {
      ...chasePlayer,
      x: nextPosition.x,
      y: nextPosition.y,
    };
  }

  function getChaseCatch(chase) {
    const runner = chase.players[chase.runnerId];

    if (!runner) return null;

    for (const player of Object.values(chase.players)) {
      if (player.id === chase.runnerId) continue;

      const distance = Math.hypot(player.x - runner.x, player.y - runner.y);

      if (distance <= CHASE_CATCH_DISTANCE) {
        return player;
      }
    }

    return null;
  }

  function startChaseLoop(lobbyCode) {
    if (chaseIntervals.has(lobbyCode)) return;

    chaseIntervals.set(
      lobbyCode,
      setInterval(() => {
        const game = getLobbyGame(lobbyCode);
        const chase = game?.chase;

        if (!chase || game.paused) return;

        const now = Date.now();
        const deltaSeconds = Math.min(0.18, (now - chase.lastTickAt) / 1000);

        chase.lastTickAt = now;

        for (const player of Object.values(chase.players)) {
          chase.players[player.id] = moveChasePlayer(chase, player, deltaSeconds);
        }

        const catchingPlayer = getChaseCatch(chase);

        if (catchingPlayer) {
          chase.caught = true;
          chase.caughtById = catchingPlayer.id;
          resolveChase(lobbyCode, true);
          return;
        }

        emitChaseState(lobbyCode);
      }, CHASE_TICK_MS),
    );
  }

  function resolveChase(lobbyCode, caught) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.chase) return;

    const chase = game.chase;
    const players = getMiniGamePlayers(lobbyCode, chase);
    const penalties = [];
    const caughtById = chase.caughtById;
    const losingPlayerIds = caught
      ? [chase.runnerId]
      : players
          .filter((player) => player.id !== chase.runnerId)
          .map((player) => player.id);

    clearChaseTimer(lobbyCode);

    for (const playerId of losingPlayerIds) {
      const player = players.find((lobbyPlayer) => lobbyPlayer.id === playerId);

      if (!player) continue;

      const fromPosition = game.positions?.[playerId] || 0;
      const toPosition = Math.max(0, fromPosition - 1);

      game.positions[playerId] = toPosition;
      penalties.push({
        playerId,
        playerName: player.name,
        spacesBack: 1,
        fromPosition,
        toPosition,
      });
    }

    game.chase = null;
    game.phase = "resolving";

    io.to(lobbyCode).emit("chaseResolved", {
      caught,
      caughtById,
      runnerId: chase.runnerId,
      runnerName: chase.players[chase.runnerId]?.name || "Runner",
      caughtByName: caughtById ? chase.players[caughtById]?.name || "Chaser" : "",
      players: chase.players,
      barriers: chase.barriers,
      columns: chase.columns,
      rows: chase.rows,
      penalties,
    });

    io.to(lobbyCode).emit("gameStateUpdated", game);

    scheduleTurnResolution(
      lobbyCode,
      game.turnResolutionId,
      () => {
        finishTurn(lobbyCode);
      },
      TRIVIA_PENALTY_REVEAL_MS,
    );
  }

  function startCaptionThisVoting(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.captionThis || game.captionThis.stage !== "captioning") return;

    clearCaptionThisTimer(lobbyCode);

    const captionThis = game.captionThis;
    const now = Date.now();

    captionThis.stage = "voting";
    captionThis.votingEndsAt = now + CAPTION_THIS_VOTE_DURATION_MS;
    captionThis.endsAt = captionThis.votingEndsAt;

    io.to(lobbyCode).emit("gameStateUpdated", game);
    emitCaptionThisState(lobbyCode);

    if (Object.keys(captionThis.captions).length <= 1) {
      resolveCaptionThis(lobbyCode);
      return;
    }

    captionThisTimers.set(
      lobbyCode,
      setTimeout(() => {
        resolveCaptionThis(lobbyCode);
      }, CAPTION_THIS_VOTE_DURATION_MS),
    );
  }

  function startCaptionThisCaptioning(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.captionThis || game.captionThis.stage !== "photo") return;
    if (!game.captionThis.photo) return;

    clearCaptionThisTimer(lobbyCode);

    const captionThis = game.captionThis;
    const now = Date.now();

    captionThis.stage = "captioning";
    captionThis.captionEndsAt = now + CAPTION_THIS_DURATION_MS;
    captionThis.endsAt = captionThis.captionEndsAt;

    io.to(lobbyCode).emit("gameStateUpdated", game);
    emitCaptionThisState(lobbyCode);

    captionThisTimers.set(
      lobbyCode,
      setTimeout(() => {
        startCaptionThisVoting(lobbyCode);
      }, CAPTION_THIS_DURATION_MS),
    );
  }

  function startWorstAdviceVoting(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.worstAdvice || game.worstAdvice.stage !== "answering") return;

    clearWorstAdviceTimer(lobbyCode);

    const worstAdvice = game.worstAdvice;
    const now = Date.now();

    worstAdvice.stage = "voting";
    worstAdvice.votingEndsAt = now + WORST_ADVICE_VOTE_DURATION_MS;
    worstAdvice.endsAt = worstAdvice.votingEndsAt;

    io.to(lobbyCode).emit("gameStateUpdated", game);
    emitWorstAdviceState(lobbyCode);

    if (Object.keys(worstAdvice.answers).length <= 1) {
      resolveWorstAdvice(lobbyCode);
      return;
    }

    worstAdviceTimers.set(
      lobbyCode,
      setTimeout(() => {
        resolveWorstAdvice(lobbyCode);
      }, WORST_ADVICE_VOTE_DURATION_MS),
    );
  }

  function startDrawImageVoting(lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (!game?.drawImage || game.drawImage.stage !== "drawing") return;

    clearDrawImageTimer(lobbyCode);

    const drawImage = game.drawImage;
    const now = Date.now();

    drawImage.stage = "voting";
    drawImage.votingEndsAt = now + DRAW_IMAGE_VOTE_DURATION_MS;
    drawImage.endsAt = drawImage.votingEndsAt;

    io.to(lobbyCode).emit("gameStateUpdated", game);
    emitDrawImageState(lobbyCode);

    if (Object.keys(drawImage.drawings).length <= 1) {
      resolveDrawImage(lobbyCode);
      return;
    }

    drawImageTimers.set(
      lobbyCode,
      setTimeout(() => {
        resolveDrawImage(lobbyCode);
      }, DRAW_IMAGE_VOTE_DURATION_MS),
    );
  }

  function drawFromRemaining(game, remainingKey, sourceItems) {
    if (!Array.isArray(game[remainingKey]) || game[remainingKey].length === 0) {
      game[remainingKey] = [...sourceItems];
    }

    const itemIndex = Math.floor(Math.random() * game[remainingKey].length);
    const [item] = game[remainingKey].splice(itemIndex, 1);

    return item;
  }

  function startTrivia(lobbyCode) {
    const game = getLobbyGame(lobbyCode);
    const players = getLobbyPlayers(lobbyCode);

    if (!game || players.length === 0 || game.trivia) return;

    const question = drawFromRemaining(
      game,
      "remainingTriviaQuestions",
      triviaQuestions,
    );
    const now = Date.now();
    const playStartsAt = now;

    game.trivia = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      question: question.question,
      choices: question.choices,
      correctIndex: question.correctIndex,
      answers: {},
      participantIds: players.map((player) => player.id),
      totalPlayers: players.length,
      playStartsAt,
      endsAt: playStartsAt + TRIVIA_DURATION_MS,
    };
    game.phase = "trivia";

    io.to(lobbyCode).emit("gameStateUpdated", game);
    emitTriviaState(lobbyCode);

    triviaTimers.set(
      lobbyCode,
      setTimeout(() => {
        resolveTrivia(lobbyCode);
      }, TRIVIA_DURATION_MS),
    );
  }

  function startWordMath(lobbyCode) {
    const game = getLobbyGame(lobbyCode);
    const players = getLobbyPlayers(lobbyCode);

    if (!game || players.length === 0 || game.wordMath) return;

    const problem = makeWordMathProblem();
    const now = Date.now();
    const playStartsAt = now;

    game.wordMath = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      question: problem.question,
      choices: problem.choices,
      correctIndex: problem.correctIndex,
      answers: {},
      participantIds: players.map((player) => player.id),
      totalPlayers: players.length,
      playStartsAt,
      endsAt: playStartsAt + TRIVIA_DURATION_MS,
    };
    game.phase = "wordMath";

    io.to(lobbyCode).emit("gameStateUpdated", game);
    emitWordMathState(lobbyCode);

    wordMathTimers.set(
      lobbyCode,
      setTimeout(() => {
        resolveWordMath(lobbyCode);
      }, TRIVIA_DURATION_MS),
    );
  }

  function startFinishLyric(lobbyCode) {
    const game = getLobbyGame(lobbyCode);
    const players = getLobbyPlayers(lobbyCode);

    if (!game || players.length === 0 || game.finishLyric) return;

    const prompt = drawFromRemaining(
      game,
      "remainingFinishLyricPrompts",
      finishLyricPrompts,
    );
    const now = Date.now();
    const playStartsAt = now;

    game.finishLyric = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      prompt: prompt.prompt,
      choices: prompt.choices,
      correctIndex: prompt.correctIndex,
      answers: {},
      participantIds: players.map((player) => player.id),
      totalPlayers: players.length,
      playStartsAt,
      endsAt: playStartsAt + TRIVIA_DURATION_MS,
    };
    game.phase = "finishLyric";

    io.to(lobbyCode).emit("gameStateUpdated", game);
    emitFinishLyricState(lobbyCode);

    finishLyricTimers.set(
      lobbyCode,
      setTimeout(() => {
        resolveFinishLyric(lobbyCode);
      }, TRIVIA_DURATION_MS),
    );
  }

  function startDrawImage(lobbyCode) {
    const game = getLobbyGame(lobbyCode);
    const players = getLobbyPlayers(lobbyCode);

    if (!game || players.length === 0 || game.drawImage) return;

    const prompt = drawFromRemaining(
      game,
      "remainingDrawImagePrompts",
      drawImagePrompts,
    );
    const now = Date.now();
    const playStartsAt = now + MINIGAME_COUNTDOWN_MS;

    game.drawImage = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      prompt,
      stage: "drawing",
      drawings: {},
      votes: {},
      participantIds: players.map((player) => player.id),
      totalPlayers: players.length,
      playStartsAt,
      drawingEndsAt: playStartsAt + DRAW_IMAGE_DURATION_MS,
      votingEndsAt: null,
      endsAt: playStartsAt + DRAW_IMAGE_DURATION_MS,
    };
    game.phase = "drawImage";

    io.to(lobbyCode).emit("gameStateUpdated", game);
    io.to(lobbyCode).emit("drawImageStarted", getPublicDrawImage(game.drawImage));

    drawImageTimers.set(
      lobbyCode,
      setTimeout(() => {
        startDrawImageVoting(lobbyCode);
      }, MINIGAME_COUNTDOWN_MS + DRAW_IMAGE_DURATION_MS),
    );
  }

  function startWorstAdvice(lobbyCode) {
    const game = getLobbyGame(lobbyCode);
    const players = getLobbyPlayers(lobbyCode);

    if (!game || players.length === 0 || game.worstAdvice) return;

    const prompt = drawFromRemaining(
      game,
      "remainingWorstAdvicePrompts",
      worstAdvicePrompts,
    );
    const now = Date.now();
    const playStartsAt = now;

    game.worstAdvice = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      prompt,
      stage: "answering",
      answers: {},
      votes: {},
      participantIds: players.map((player) => player.id),
      totalPlayers: players.length,
      playStartsAt,
      answeringEndsAt: playStartsAt + WORST_ADVICE_DURATION_MS,
      votingEndsAt: null,
      endsAt: playStartsAt + WORST_ADVICE_DURATION_MS,
    };
    game.phase = "worstAdvice";

    io.to(lobbyCode).emit("gameStateUpdated", game);
    io.to(lobbyCode).emit(
      "worstAdviceStarted",
      getPublicWorstAdvice(game.worstAdvice),
    );

    worstAdviceTimers.set(
      lobbyCode,
      setTimeout(() => {
        startWorstAdviceVoting(lobbyCode);
      }, WORST_ADVICE_DURATION_MS),
    );
  }

  function startCaptionThis(lobbyCode) {
    const game = getLobbyGame(lobbyCode);
    const players = getLobbyPlayers(lobbyCode);

    if (!game || players.length === 0 || game.captionThis) return;

    const photoPlayer =
      players.find((player) => player.id === game.currentPlayerId) || players[0];
    const now = Date.now();

    game.captionThis = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      stage: "photo",
      photo: "",
      photoPlayerId: photoPlayer.id,
      photoPlayerName: photoPlayer.name,
      captions: {},
      votes: {},
      participantIds: players.map((player) => player.id),
      totalPlayers: players.length,
      playStartsAt: now,
      photoEndsAt: now + CAPTION_THIS_PHOTO_DURATION_MS,
      captionEndsAt: null,
      votingEndsAt: null,
      endsAt: now + CAPTION_THIS_PHOTO_DURATION_MS,
    };
    game.phase = "captionThis";

    io.to(lobbyCode).emit("gameStateUpdated", game);
    io.to(lobbyCode).emit(
      "captionThisStarted",
      getPublicCaptionThis(game.captionThis),
    );

    captionThisTimers.set(
      lobbyCode,
      setTimeout(() => {
        resolveCaptionThis(lobbyCode);
      }, CAPTION_THIS_PHOTO_DURATION_MS),
    );
  }

  function startChase(lobbyCode) {
    const game = getLobbyGame(lobbyCode);
    const players = getLobbyPlayers(lobbyCode);

    if (!game || players.length < 2 || game.chase) return false;

    const runner =
      players.find((player) => player.id === game.currentPlayerId) || players[0];
    const edgeStarts = [
      { x: 0.7, y: 0.7, direction: { x: 1, y: 0 } },
      { x: CHASE_COLUMNS - 0.7, y: CHASE_ROWS - 0.7, direction: { x: -1, y: 0 } },
      { x: CHASE_COLUMNS - 0.7, y: 0.7, direction: { x: 0, y: 1 } },
      { x: 0.7, y: CHASE_ROWS - 0.7, direction: { x: 0, y: -1 } },
      { x: Math.floor(CHASE_COLUMNS / 2), y: 0.7, direction: { x: 0, y: 1 } },
      { x: Math.floor(CHASE_COLUMNS / 2), y: CHASE_ROWS - 0.7, direction: { x: 0, y: -1 } },
    ];
    const barriers = [
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 8, y: 2 },
      { x: 7, y: 4 },
      { x: 3, y: 6 },
      { x: 9, y: 6 },
    ];
    let edgeIndex = 0;
    const chasePlayers = {};

    for (const player of players) {
      if (player.id === runner.id) {
        chasePlayers[player.id] = {
          id: player.id,
          name: player.name,
          avatar: player.avatar,
          role: "runner",
          x: Math.floor(CHASE_COLUMNS / 2) + 0.5,
          y: Math.floor(CHASE_ROWS / 2) + 0.5,
          direction: { x: 1, y: 0 },
        };
        continue;
      }

      const start = edgeStarts[edgeIndex % edgeStarts.length];

      chasePlayers[player.id] = {
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        role: "chaser",
        x: start.x,
        y: start.y,
        direction: start.direction,
      };
      edgeIndex += 1;
    }

    const now = Date.now();
    const playStartsAt = now + MINIGAME_COUNTDOWN_MS;

    const occupiedSpawnTiles = new Set(
      Object.values(chasePlayers).map((player) => `${Math.floor(player.x)}:${Math.floor(player.y)}`),
    );
    const safeBarriers = barriers.filter(
      (barrier) => !occupiedSpawnTiles.has(`${barrier.x}:${barrier.y}`),
    );

    game.chase = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      columns: CHASE_COLUMNS,
      rows: CHASE_ROWS,
      barriers: safeBarriers,
      players: chasePlayers,
      runnerId: runner.id,
      caught: false,
      caughtById: "",
      participantIds: players.map((player) => player.id),
      totalPlayers: players.length,
      lastTickAt: playStartsAt,
      playStartsAt,
      endsAt: playStartsAt + CHASE_DURATION_MS,
    };
    game.phase = "chase";

    io.to(lobbyCode).emit("gameStateUpdated", game);
    io.to(lobbyCode).emit("chaseStarted", getPublicChase(game.chase));

    chaseTimers.set(
      lobbyCode,
      setTimeout(() => {
        resolveChase(lobbyCode, false);
      }, MINIGAME_COUNTDOWN_MS + CHASE_DURATION_MS),
    );

    setTimeout(() => {
      startChaseLoop(lobbyCode);
    }, MINIGAME_COUNTDOWN_MS);

    return true;
  }

  function startMostLikely(lobbyCode) {
    const game = getLobbyGame(lobbyCode);
    const players = getLobbyPlayers(lobbyCode);

    if (!game || players.length === 0 || game.mostLikely) return;

    const prompt = drawFromRemaining(
      game,
      "remainingMostLikelyPrompts",
      mostLikelyPrompts,
    );
    const now = Date.now();
    const playStartsAt = now;

    game.mostLikely = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      prompt,
      choices: players.map((player) => ({
        id: player.id,
        name: player.name,
      })),
      votes: {},
      participantIds: players.map((player) => player.id),
      totalPlayers: players.length,
      playStartsAt,
      endsAt: playStartsAt + TRIVIA_DURATION_MS,
    };
    game.phase = "mostLikely";

    io.to(lobbyCode).emit("gameStateUpdated", game);
    emitMostLikelyState(lobbyCode);

    mostLikelyTimers.set(
      lobbyCode,
      setTimeout(() => {
        resolveMostLikely(lobbyCode);
      }, TRIVIA_DURATION_MS),
    );
  }

  function startRapidTap(lobbyCode) {
    const game = getLobbyGame(lobbyCode);
    const players = getLobbyPlayers(lobbyCode);

    if (!game || players.length === 0 || game.rapidTap) return;

    const now = Date.now();
    const playStartsAt = now + MINIGAME_COUNTDOWN_MS;

    game.rapidTap = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      choices: players.map((player) => ({
        id: player.id,
        name: player.name,
      })),
      scores: Object.fromEntries(players.map((player) => [player.id, 0])),
      finalScores: {},
      participantIds: players.map((player) => player.id),
      totalPlayers: players.length,
      playStartsAt,
      endsAt: playStartsAt + RAPID_TAP_DURATION_MS,
    };
    game.phase = "rapidTap";

    io.to(lobbyCode).emit("gameStateUpdated", game);
    io.to(lobbyCode).emit("rapidTapStarted", getPublicRapidTap(game.rapidTap));

    rapidTapTimers.set(
      lobbyCode,
      setTimeout(() => {
        resolveRapidTap(lobbyCode);
      }, MINIGAME_COUNTDOWN_MS + RAPID_TAP_DURATION_MS + 500),
    );
  }

  function startStopLine(lobbyCode) {
    const game = getLobbyGame(lobbyCode);
    const players = getLobbyPlayers(lobbyCode);

    if (!game || players.length === 0 || game.stopLine) return;

    const now = Date.now();
    const playStartsAt = now + MINIGAME_COUNTDOWN_MS;

    game.stopLine = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      choices: players.map((player) => ({
        id: player.id,
        name: player.name,
      })),
      results: {},
      finalResults: {},
      target: 50,
      participantIds: players.map((player) => player.id),
      totalPlayers: players.length,
      startedAt: now,
      playStartsAt,
      endsAt: playStartsAt + STOP_LINE_DURATION_MS,
    };
    game.phase = "stopLine";

    io.to(lobbyCode).emit("gameStateUpdated", game);
    io.to(lobbyCode).emit("stopLineStarted", getPublicStopLine(game.stopLine));

    stopLineTimers.set(
      lobbyCode,
      setTimeout(() => {
        resolveStopLine(lobbyCode);
      }, MINIGAME_COUNTDOWN_MS + STOP_LINE_DURATION_MS + 500),
    );
  }

  function startJumpBlock(lobbyCode) {
    const game = getLobbyGame(lobbyCode);
    const players = getLobbyPlayers(lobbyCode);

    if (!game || players.length === 0 || game.jumpBlock) return;

    const now = Date.now();
    const playStartsAt = now + MINIGAME_COUNTDOWN_MS;

    game.jumpBlock = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      choices: players.map((player) => ({
        id: player.id,
        name: player.name,
      })),
      scores: Object.fromEntries(players.map((player) => [player.id, 0])),
      finalScores: {},
      participantIds: players.map((player) => player.id),
      totalPlayers: players.length,
      startedAt: now,
      playStartsAt,
      endsAt: playStartsAt + JUMP_BLOCK_DURATION_MS,
    };
    game.phase = "jumpBlock";

    io.to(lobbyCode).emit("gameStateUpdated", game);
    io.to(lobbyCode).emit("jumpBlockStarted", getPublicJumpBlock(game.jumpBlock));

    jumpBlockTimers.set(
      lobbyCode,
      setTimeout(() => {
        resolveJumpBlock(lobbyCode);
      }, MINIGAME_COUNTDOWN_MS + JUMP_BLOCK_DURATION_MS + 500),
    );
  }

  function startFirstTap(lobbyCode) {
    const game = getLobbyGame(lobbyCode);
    const players = getLobbyPlayers(lobbyCode);

    if (!game || players.length === 0 || game.firstTap) return;

    const now = Date.now();
    const waitMs =
      FIRST_TAP_MIN_WAIT_MS +
      Math.floor(Math.random() * (FIRST_TAP_MAX_WAIT_MS - FIRST_TAP_MIN_WAIT_MS + 1));
    const playStartsAt = now + waitMs;

    game.firstTap = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      choices: players.map((player) => ({
        id: player.id,
        name: player.name,
      })),
      pressOrder: [],
      pressedPlayerIds: {},
      participantIds: players.map((player) => player.id),
      totalPlayers: players.length,
      waitMs,
      playStartsAt,
      endsAt: playStartsAt + FIRST_TAP_DURATION_MS,
    };
    game.phase = "firstTap";

    io.to(lobbyCode).emit("gameStateUpdated", game);
    io.to(lobbyCode).emit("firstTapStarted", getPublicFirstTap(game.firstTap));

    firstTapTimers.set(
      lobbyCode,
      setTimeout(() => {
        resolveFirstTap(lobbyCode);
      }, waitMs + FIRST_TAP_DURATION_MS + 500),
    );
  }

  function startPressRelease(lobbyCode) {
    const game = getLobbyGame(lobbyCode);
    const players = getLobbyPlayers(lobbyCode);

    if (!game || players.length === 0 || game.pressRelease) return;

    const now = Date.now();
    const playStartsAt = now + MINIGAME_COUNTDOWN_MS;
    const targetMs =
      PRESS_RELEASE_MIN_TARGET_MS +
      Math.floor(Math.random() * (PRESS_RELEASE_MAX_TARGET_MS - PRESS_RELEASE_MIN_TARGET_MS + 1));

    game.pressRelease = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      choices: players.map((player) => ({
        id: player.id,
        name: player.name,
      })),
      results: {},
      participantIds: players.map((player) => player.id),
      totalPlayers: players.length,
      targetMs,
      playStartsAt,
      endsAt: playStartsAt + PRESS_RELEASE_DURATION_MS,
    };
    game.phase = "pressRelease";

    io.to(lobbyCode).emit("gameStateUpdated", game);
    io.to(lobbyCode).emit(
      "pressReleaseStarted",
      getPublicPressRelease(game.pressRelease),
    );

    pressReleaseTimers.set(
      lobbyCode,
      setTimeout(() => {
        resolvePressRelease(lobbyCode);
      }, MINIGAME_COUNTDOWN_MS + PRESS_RELEASE_DURATION_MS + 500),
    );
  }

  function resetLobbyPlayers(lobbyCode) {
    const room = io.sockets.adapter.rooms.get(lobbyCode);

    if (room) {
      for (const socketId of room) {
        const playerSocket = io.sockets.sockets.get(socketId);

        if (playerSocket?.data?.player?.lobbyCode === lobbyCode) {
          playerSocket.data.player = null;
        }
      }
    }

    lobbyRosters.delete(lobbyCode);
  }

  function emitGameSnapshotToSocket(targetSocket, lobbyCode) {
    const game = getLobbyGame(lobbyCode);

    if (game) {
      const disconnectedPlayers = getLobbyPlayers(lobbyCode).filter(
        (player) => !player.connected,
      );

      targetSocket.emit("gameStarted", game);
      targetSocket.emit("gameStateUpdated", game);
      if (game.trivia) {
        targetSocket.emit("triviaStarted", getPublicTrivia(game.trivia));
      }
      if (game.mostLikely) {
        targetSocket.emit(
          "mostLikelyStarted",
          getPublicMostLikely(game.mostLikely),
        );
      }
      if (game.rapidTap) {
        targetSocket.emit("rapidTapStarted", getPublicRapidTap(game.rapidTap));
        targetSocket.emit("rapidTapUpdated", getPublicRapidTap(game.rapidTap));
      }
      if (game.stopLine) {
        targetSocket.emit("stopLineStarted", getPublicStopLine(game.stopLine));
        targetSocket.emit("stopLineUpdated", getPublicStopLine(game.stopLine));
      }
      if (game.jumpBlock) {
        targetSocket.emit("jumpBlockStarted", getPublicJumpBlock(game.jumpBlock));
        targetSocket.emit("jumpBlockUpdated", getPublicJumpBlock(game.jumpBlock));
      }
      if (game.firstTap) {
        targetSocket.emit("firstTapStarted", getPublicFirstTap(game.firstTap));
        targetSocket.emit("firstTapUpdated", getPublicFirstTap(game.firstTap));
      }
      if (game.pressRelease) {
        targetSocket.emit(
          "pressReleaseStarted",
          getPublicPressRelease(game.pressRelease),
        );
        targetSocket.emit(
          "pressReleaseUpdated",
          getPublicPressRelease(game.pressRelease),
        );
      }
      if (game.wordMath) {
        targetSocket.emit("wordMathStarted", getPublicWordMath(game.wordMath));
      }
      if (game.finishLyric) {
        targetSocket.emit(
          "finishLyricStarted",
          getPublicFinishLyric(game.finishLyric),
        );
      }
      if (game.drawImage) {
        targetSocket.emit("drawImageStarted", getPublicDrawImage(game.drawImage));
        targetSocket.emit("drawImageUpdated", getPublicDrawImage(game.drawImage));
      }
      if (game.worstAdvice) {
        targetSocket.emit(
          "worstAdviceStarted",
          getPublicWorstAdvice(game.worstAdvice),
        );
        targetSocket.emit(
          "worstAdviceUpdated",
          getPublicWorstAdvice(game.worstAdvice),
        );
      }
      if (game.captionThis) {
        targetSocket.emit(
          "captionThisStarted",
          getPublicCaptionThis(game.captionThis),
        );
        targetSocket.emit(
          "captionThisUpdated",
          getPublicCaptionThis(game.captionThis),
        );
      }
      if (game.chase) {
        targetSocket.emit("chaseStarted", getPublicChase(game.chase));
        targetSocket.emit("chaseUpdated", getPublicChase(game.chase));
      }
      targetSocket.emit("gamePausedUpdated", {
        paused: game.paused,
        disconnectedPlayers,
      });
      targetSocket.emit("turnUpdated", {
        currentPlayerId: game.currentPlayerId,
      });
    }
  }

  socket.on("watchLobby", ({ lobbyCode }) => {
    socket.join(lobbyCode);
    socket.emit("playersUpdated", getLobbyPlayers(lobbyCode));
    emitGameSnapshotToSocket(socket, lobbyCode);
  });

  socket.on("joinLobby", ({ name, lobbyCode, avatar }) => {
    const trimmedName = String(name || "").trim();
    const roster = getLobbyRoster(lobbyCode);
    const existingPlayer = roster.find(
      (rosterPlayer) =>
        normalizePlayerName(rosterPlayer.name) === normalizePlayerName(trimmedName),
    );
    const player =
      existingPlayer ||
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: trimmedName,
        ready: false,
        lobbyCode,
        avatar: "",
        connected: false,
        socketId: "",
      };

    player.name = trimmedName || player.name;
    player.lobbyCode = lobbyCode;
    player.connected = true;
    player.socketId = socket.id;

    if (typeof avatar === "string" && avatar) {
      player.avatar = avatar;
    }

    if (!existingPlayer) {
      roster.push(player);
    }

    const game = getLobbyGame(lobbyCode);

    if (game && !existingPlayer && game.positions[player.id] === undefined) {
      game.positions[player.id] = 0;
    }

    socket.data.player = player;

    socket.join(lobbyCode);

    io.to(lobbyCode).emit("playersUpdated", getLobbyPlayers(lobbyCode));
    emitPauseState(lobbyCode);

    if (game) {
      io.to(lobbyCode).emit("gameStateUpdated", game);
    }

    socket.emit("joinSuccess", player);
  });

  socket.on("requestGameSnapshot", () => {
    const player = socket.data.player;

    if (!player?.lobbyCode) return;

    emitGameSnapshotToSocket(socket, player.lobbyCode);
  });

  socket.on("leaveLobby", (payload = {}, acknowledge) => {
    const player = socket.data.player;
    const lobbyCode = player?.lobbyCode || String(payload.lobbyCode || "").trim();
    const playerId = player?.id || String(payload.playerId || "").trim();

    if (!lobbyCode || !playerId) {
      acknowledge?.({ ok: false });
      return;
    }

    const removedPlayer = removePlayerFromLobby(lobbyCode, playerId, socket.id);
    socket.leave(lobbyCode);
    socket.data.player = null;
    socket.emit("leftLobby");
    acknowledge?.({ ok: Boolean(removedPlayer) });
  });

  socket.on("startGame", ({ lobbyCode }) => {
    const players = getLobbyPlayers(lobbyCode);

    if (players.length === 0 || players.some((player) => !player.connected)) return;

    const game = createBaseGame(lobbyCode, players);

    clearTriviaTimer(lobbyCode);
    clearMostLikelyTimer(lobbyCode);
    clearRapidTapTimer(lobbyCode);
    clearStopLineTimer(lobbyCode);
    clearJumpBlockTimer(lobbyCode);
    clearFirstTapTimer(lobbyCode);
    clearPressReleaseTimer(lobbyCode);
    clearWordMathTimer(lobbyCode);
    clearFinishLyricTimer(lobbyCode);
    clearDrawImageTimer(lobbyCode);
    clearWorstAdviceTimer(lobbyCode);
    clearCaptionThisTimer(lobbyCode);
    clearChaseTimer(lobbyCode);
    clearTurnResolutionTimer(lobbyCode);
    games.set(lobbyCode, game);
    emitGameState(lobbyCode);
  });

  socket.on("startTestMiniGame", ({ lobbyCode, miniGameType }) => {
    const players = getLobbyPlayers(lobbyCode);

    if (players.length === 0 || players.some((player) => !player.connected)) return;

    clearTriviaTimer(lobbyCode);
    clearMostLikelyTimer(lobbyCode);
    clearRapidTapTimer(lobbyCode);
    clearStopLineTimer(lobbyCode);
    clearJumpBlockTimer(lobbyCode);
    clearFirstTapTimer(lobbyCode);
    clearPressReleaseTimer(lobbyCode);
    clearWordMathTimer(lobbyCode);
    clearFinishLyricTimer(lobbyCode);
    clearDrawImageTimer(lobbyCode);
    clearWorstAdviceTimer(lobbyCode);
    clearCaptionThisTimer(lobbyCode);
    clearChaseTimer(lobbyCode);
    clearTurnResolutionTimer(lobbyCode);

    const game = createBaseGame(lobbyCode, players, true);

    games.set(lobbyCode, game);
    emitGameState(lobbyCode);

    if (!startMiniGameByType(lobbyCode, miniGameType)) {
      games.delete(lobbyCode);
      io.to(lobbyCode).emit("testMiniGameEnded");
    }
  });

  socket.on("restartGame", ({ lobbyCode }) => {
    const players = getLobbyPlayers(lobbyCode);

    if (players.length === 0 || players.some((player) => !player.connected)) return;

    const game = createBaseGame(lobbyCode, players);

    clearTriviaTimer(lobbyCode);
    clearMostLikelyTimer(lobbyCode);
    clearRapidTapTimer(lobbyCode);
    clearStopLineTimer(lobbyCode);
    clearJumpBlockTimer(lobbyCode);
    clearFirstTapTimer(lobbyCode);
    clearPressReleaseTimer(lobbyCode);
    clearWordMathTimer(lobbyCode);
    clearFinishLyricTimer(lobbyCode);
    clearDrawImageTimer(lobbyCode);
    clearWorstAdviceTimer(lobbyCode);
    clearCaptionThisTimer(lobbyCode);
    clearChaseTimer(lobbyCode);
    clearTurnResolutionTimer(lobbyCode);
    games.set(lobbyCode, game);

    io.to(lobbyCode).emit("diceRolled", null);
    io.to(lobbyCode).emit("triviaResolved", null);
    io.to(lobbyCode).emit("mostLikelyResolved", null);
    io.to(lobbyCode).emit("rapidTapResolved", null);
    io.to(lobbyCode).emit("stopLineResolved", null);
    io.to(lobbyCode).emit("jumpBlockResolved", null);
    io.to(lobbyCode).emit("firstTapResolved", null);
    io.to(lobbyCode).emit("pressReleaseResolved", null);
    io.to(lobbyCode).emit("wordMathResolved", null);
    io.to(lobbyCode).emit("finishLyricResolved", null);
    io.to(lobbyCode).emit("drawImageResolved", null);
    io.to(lobbyCode).emit("worstAdviceResolved", null);
    io.to(lobbyCode).emit("captionThisResolved", null);
    io.to(lobbyCode).emit("chaseResolved", null);
    emitGameState(lobbyCode);
  });

  socket.on("quitGame", ({ lobbyCode }) => {
    clearTriviaTimer(lobbyCode);
    clearMostLikelyTimer(lobbyCode);
    clearRapidTapTimer(lobbyCode);
    clearStopLineTimer(lobbyCode);
    clearJumpBlockTimer(lobbyCode);
    clearFirstTapTimer(lobbyCode);
    clearPressReleaseTimer(lobbyCode);
    clearWordMathTimer(lobbyCode);
    clearFinishLyricTimer(lobbyCode);
    clearDrawImageTimer(lobbyCode);
    clearWorstAdviceTimer(lobbyCode);
    clearCaptionThisTimer(lobbyCode);
    clearChaseTimer(lobbyCode);
    clearTurnResolutionTimer(lobbyCode);
    games.delete(lobbyCode);
    resetLobbyPlayers(lobbyCode);

    io.to(lobbyCode).emit("gameEnded");
    io.to(lobbyCode).emit("playersUpdated", []);
  });

  socket.on("forceNextTurn", ({ lobbyCode }) => {
    const game = getLobbyGame(lobbyCode);

    if (!game || game.phase === "awaitingRoll" || game.phase === "moving") return;

    clearActiveMiniGameState(lobbyCode, game);
    clearTurnResolutionTimer(lobbyCode);
    finishTurn(lobbyCode);
  });

  socket.on("rollDice", () => {
    const player = socket.data.player;

    if (!player) return;

    const game = getLobbyGame(player.lobbyCode);

    if (
      !game ||
      game.trivia ||
      game.mostLikely ||
      game.rapidTap ||
      game.stopLine ||
      game.jumpBlock ||
      game.firstTap ||
      game.pressRelease ||
      game.wordMath ||
      game.finishLyric ||
      game.drawImage ||
      game.worstAdvice ||
      game.captionThis ||
      game.chase ||
      game.paused ||
      game.resolvingTurn ||
      game.phase !== "awaitingRoll" ||
      game.currentPlayerId !== player.id
    ) {
      return;
    }

    const players = getLobbyPlayers(player.lobbyCode);
    const roll = Math.floor(Math.random() * 6) + 1;
    const fromPosition = game.positions?.[player.id] || 0;
    const toPosition = Math.min(fromPosition + roll, BOARD_TILE_COUNT - 1);
    const path = [];

    for (let position = fromPosition + 1; position <= toPosition; position += 1) {
      path.push(position);
    }

    game.positions = {
      ...game.positions,
      [player.id]: toPosition,
    };

    const currentIndex = players.findIndex(
      (lobbyPlayer) => lobbyPlayer.id === player.id,
    );
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % players.length;

    game.pendingTurnIndex = nextIndex;
    game.pendingNextPlayerId = players[nextIndex]?.id || player.id;
    game.pendingLandingPosition = toPosition;
    game.pendingRollingPlayerId = player.id;
    game.currentPlayerId = null;
    game.resolvingTurn = true;
    game.phase = "moving";
    game.turnResolutionId = (game.turnResolutionId || 0) + 1;

    const turnResolutionId = game.turnResolutionId;

    io.to(player.lobbyCode).emit("diceRolled", {
      playerId: player.id,
      playerName: player.name,
      roll,
      fromPosition,
      toPosition,
      path,
      rollId: turnResolutionId,
    });

    io.to(player.lobbyCode).emit("gameStateUpdated", game);

    io.to(player.lobbyCode).emit("turnUpdated", {
      currentPlayerId: game.currentPlayerId,
    });

    const movementDelay = (path.length + 1) * ROLL_STEP_MS;

    scheduleTurnResolution(
      player.lobbyCode,
      turnResolutionId,
      () => {
        completeRollMovement(player.lobbyCode, turnResolutionId);
      },
      movementDelay + 1200,
    );
  });

  socket.on("rollMovementComplete", ({ lobbyCode, rollId }) => {
    completeRollMovement(lobbyCode, rollId);
  });

  socket.on("submitTriviaAnswer", ({ triviaId, choiceIndex }) => {
    const player = socket.data.player;

    if (!player) return;

    const game = getLobbyGame(player.lobbyCode);
    const trivia = game?.trivia;

    if (
      !trivia ||
      trivia.id !== triviaId ||
      !isMiniGameParticipant(trivia, player.id) ||
      Date.now() < trivia.playStartsAt ||
      trivia.answers[player.id] !== undefined
    ) {
      return;
    }

    trivia.answers[player.id] = choiceIndex;
    emitTriviaState(player.lobbyCode);

    if (Object.keys(trivia.answers).length >= trivia.totalPlayers) {
      resolveTrivia(player.lobbyCode);
    }
  });

  socket.on("submitWordMathAnswer", ({ wordMathId, choiceIndex }) => {
    const player = socket.data.player;

    if (!player) return;

    const game = getLobbyGame(player.lobbyCode);
    const wordMath = game?.wordMath;

    if (
      !wordMath ||
      wordMath.id !== wordMathId ||
      !isMiniGameParticipant(wordMath, player.id) ||
      Date.now() < wordMath.playStartsAt ||
      wordMath.answers[player.id] !== undefined
    ) {
      return;
    }

    wordMath.answers[player.id] = choiceIndex;
    emitWordMathState(player.lobbyCode);

    if (Object.keys(wordMath.answers).length >= wordMath.totalPlayers) {
      resolveWordMath(player.lobbyCode);
    }
  });

  socket.on("submitFinishLyricAnswer", ({ finishLyricId, choiceIndex }) => {
    const player = socket.data.player;

    if (!player) return;

    const game = getLobbyGame(player.lobbyCode);
    const finishLyric = game?.finishLyric;

    if (
      !finishLyric ||
      finishLyric.id !== finishLyricId ||
      !isMiniGameParticipant(finishLyric, player.id) ||
      Date.now() < finishLyric.playStartsAt ||
      finishLyric.answers[player.id] !== undefined
    ) {
      return;
    }

    finishLyric.answers[player.id] = choiceIndex;
    emitFinishLyricState(player.lobbyCode);

    if (Object.keys(finishLyric.answers).length >= finishLyric.totalPlayers) {
      resolveFinishLyric(player.lobbyCode);
    }
  });

  socket.on("submitDrawImage", ({ drawImageId, image }) => {
    const player = socket.data.player;

    if (!player) return;

    const game = getLobbyGame(player.lobbyCode);
    const drawImage = game?.drawImage;
    const isValidImage =
      typeof image === "string" &&
      image.startsWith("data:image/png;base64,") &&
      image.length < 650000;

    if (
      !drawImage ||
      drawImage.id !== drawImageId ||
      !isMiniGameParticipant(drawImage, player.id) ||
      drawImage.stage !== "drawing" ||
      Date.now() < drawImage.playStartsAt ||
      drawImage.drawings[player.id] ||
      !isValidImage
    ) {
      return;
    }

    drawImage.drawings[player.id] = {
      playerId: player.id,
      playerName: player.name,
      image,
    };

    emitDrawImageState(player.lobbyCode);

    if (Object.keys(drawImage.drawings).length >= drawImage.totalPlayers) {
      startDrawImageVoting(player.lobbyCode);
    }
  });

  socket.on("submitDrawImageVote", ({ drawImageId, votedPlayerId }) => {
    const player = socket.data.player;

    if (!player) return;

    const game = getLobbyGame(player.lobbyCode);
    const drawImage = game?.drawImage;
    const canVoteForPlayer =
      drawImage?.drawings[votedPlayerId] && votedPlayerId !== player.id;

    if (
      !drawImage ||
      drawImage.id !== drawImageId ||
      !isMiniGameParticipant(drawImage, player.id) ||
      drawImage.stage !== "voting" ||
      Date.now() < drawImage.playStartsAt ||
      drawImage.votes[player.id] !== undefined ||
      !canVoteForPlayer
    ) {
      return;
    }

    drawImage.votes[player.id] = votedPlayerId;
    emitDrawImageState(player.lobbyCode);

    const drawingPlayerIds = Object.keys(drawImage.drawings);
    const eligibleVoters = getMiniGamePlayers(player.lobbyCode, drawImage).filter(
      (lobbyPlayer) =>
        drawingPlayerIds.some((drawingPlayerId) => drawingPlayerId !== lobbyPlayer.id),
    );

    if (Object.keys(drawImage.votes).length >= eligibleVoters.length) {
      resolveDrawImage(player.lobbyCode);
    }
  });

  socket.on("submitWorstAdviceAnswer", ({ worstAdviceId, answer }) => {
    const player = socket.data.player;

    if (!player) return;

    const game = getLobbyGame(player.lobbyCode);
    const worstAdvice = game?.worstAdvice;
    const cleanedAnswer = String(answer || "").trim().slice(0, 180);

    if (
      !worstAdvice ||
      worstAdvice.id !== worstAdviceId ||
      !isMiniGameParticipant(worstAdvice, player.id) ||
      worstAdvice.stage !== "answering" ||
      Date.now() < worstAdvice.playStartsAt ||
      worstAdvice.answers[player.id] ||
      cleanedAnswer.length < 1
    ) {
      return;
    }

    worstAdvice.answers[player.id] = {
      playerId: player.id,
      playerName: player.name,
      answer: cleanedAnswer,
    };

    emitWorstAdviceState(player.lobbyCode);

    if (Object.keys(worstAdvice.answers).length >= worstAdvice.totalPlayers) {
      startWorstAdviceVoting(player.lobbyCode);
    }
  });

  socket.on("submitWorstAdviceVote", ({ worstAdviceId, votedPlayerId }) => {
    const player = socket.data.player;

    if (!player) return;

    const game = getLobbyGame(player.lobbyCode);
    const worstAdvice = game?.worstAdvice;
    const canVoteForPlayer =
      worstAdvice?.answers[votedPlayerId] && votedPlayerId !== player.id;

    if (
      !worstAdvice ||
      worstAdvice.id !== worstAdviceId ||
      !isMiniGameParticipant(worstAdvice, player.id) ||
      worstAdvice.stage !== "voting" ||
      worstAdvice.votes[player.id] !== undefined ||
      !canVoteForPlayer
    ) {
      return;
    }

    worstAdvice.votes[player.id] = votedPlayerId;
    emitWorstAdviceState(player.lobbyCode);

    const answerPlayerIds = Object.keys(worstAdvice.answers);
    const eligibleVoters = getMiniGamePlayers(player.lobbyCode, worstAdvice).filter(
      (lobbyPlayer) =>
        answerPlayerIds.some((answerPlayerId) => answerPlayerId !== lobbyPlayer.id),
    );

    if (Object.keys(worstAdvice.votes).length >= eligibleVoters.length) {
      resolveWorstAdvice(player.lobbyCode);
    }
  });

  socket.on("submitCaptionThisPhoto", ({ captionThisId, image }) => {
    const player = socket.data.player;

    if (!player) return;

    const game = getLobbyGame(player.lobbyCode);
    const captionThis = game?.captionThis;
    const isValidImage =
      typeof image === "string" &&
      image.startsWith("data:image/jpeg;base64,") &&
      image.length < 950000;

    if (
      !captionThis ||
      captionThis.id !== captionThisId ||
      !isMiniGameParticipant(captionThis, player.id) ||
      captionThis.stage !== "photo" ||
      captionThis.photoPlayerId !== player.id ||
      captionThis.photo ||
      !isValidImage
    ) {
      return;
    }

    captionThis.photo = image;
    startCaptionThisCaptioning(player.lobbyCode);
  });

  socket.on("submitCaptionThisCaption", ({ captionThisId, caption }) => {
    const player = socket.data.player;

    if (!player) return;

    const game = getLobbyGame(player.lobbyCode);
    const captionThis = game?.captionThis;
    const cleanedCaption = String(caption || "").trim().slice(0, 160);

    if (
      !captionThis ||
      captionThis.id !== captionThisId ||
      !isMiniGameParticipant(captionThis, player.id) ||
      captionThis.stage !== "captioning" ||
      captionThis.captions[player.id] ||
      cleanedCaption.length < 1
    ) {
      return;
    }

    captionThis.captions[player.id] = {
      playerId: player.id,
      playerName: player.name,
      caption: cleanedCaption,
    };

    emitCaptionThisState(player.lobbyCode);

    if (Object.keys(captionThis.captions).length >= captionThis.totalPlayers) {
      startCaptionThisVoting(player.lobbyCode);
    }
  });

  socket.on("submitCaptionThisVote", ({ captionThisId, votedPlayerId }) => {
    const player = socket.data.player;

    if (!player) return;

    const game = getLobbyGame(player.lobbyCode);
    const captionThis = game?.captionThis;
    const canVoteForPlayer =
      captionThis?.captions[votedPlayerId] && votedPlayerId !== player.id;

    if (
      !captionThis ||
      captionThis.id !== captionThisId ||
      !isMiniGameParticipant(captionThis, player.id) ||
      captionThis.stage !== "voting" ||
      captionThis.votes[player.id] !== undefined ||
      !canVoteForPlayer
    ) {
      return;
    }

    captionThis.votes[player.id] = votedPlayerId;
    emitCaptionThisState(player.lobbyCode);

    const captionPlayerIds = Object.keys(captionThis.captions);
    const eligibleVoters = getMiniGamePlayers(player.lobbyCode, captionThis).filter(
      (lobbyPlayer) =>
        captionPlayerIds.some((captionPlayerId) => captionPlayerId !== lobbyPlayer.id),
    );

    if (Object.keys(captionThis.votes).length >= eligibleVoters.length) {
      resolveCaptionThis(player.lobbyCode);
    }
  });

  socket.on("setChaseDirection", ({ chaseId, direction }) => {
    const player = socket.data.player;

    if (!player) return;

    const game = getLobbyGame(player.lobbyCode);
    const chase = game?.chase;
    const directions = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };
    const nextDirection = directions[direction];

    if (
      !chase ||
      chase.id !== chaseId ||
      Date.now() < chase.playStartsAt ||
      !chase.players[player.id] ||
      !nextDirection
    ) {
      return;
    }

    chase.players[player.id].direction = nextDirection;
    emitChaseState(player.lobbyCode);
  });

  socket.on("submitMostLikelyVote", ({ mostLikelyId, votedPlayerId }) => {
    const player = socket.data.player;

    if (!player) return;

    const game = getLobbyGame(player.lobbyCode);
    const mostLikely = game?.mostLikely;
    const validChoice = mostLikely?.choices.some(
      (choice) => choice.id === votedPlayerId,
    );

    if (
      !mostLikely ||
      mostLikely.id !== mostLikelyId ||
      !isMiniGameParticipant(mostLikely, player.id) ||
      Date.now() < mostLikely.playStartsAt ||
      mostLikely.votes[player.id] !== undefined ||
      !validChoice
    ) {
      return;
    }

    mostLikely.votes[player.id] = votedPlayerId;
    emitMostLikelyState(player.lobbyCode);

    if (Object.keys(mostLikely.votes).length >= mostLikely.totalPlayers) {
      resolveMostLikely(player.lobbyCode);
    }
  });

  socket.on("updateRapidTapScore", ({ rapidTapId, score }) => {
    const player = socket.data.player;

    if (!player) return;

    const game = getLobbyGame(player.lobbyCode);
    const rapidTap = game?.rapidTap;

    if (
      !rapidTap ||
      rapidTap.id !== rapidTapId ||
      !isMiniGameParticipant(rapidTap, player.id) ||
      Date.now() < rapidTap.playStartsAt ||
      rapidTap.finalScores[player.id] !== undefined
    ) {
      return;
    }

    rapidTap.scores[player.id] = Math.max(0, Number(score) || 0);
    emitRapidTapState(player.lobbyCode);
  });

  socket.on("submitRapidTapScore", ({ rapidTapId, score }) => {
    const player = socket.data.player;

    if (!player) return;

    const game = getLobbyGame(player.lobbyCode);
    const rapidTap = game?.rapidTap;

    if (
      !rapidTap ||
      rapidTap.id !== rapidTapId ||
      !isMiniGameParticipant(rapidTap, player.id) ||
      Date.now() < rapidTap.playStartsAt ||
      rapidTap.finalScores[player.id] !== undefined
    ) {
      return;
    }

    const finalScore = Math.max(0, Number(score) || 0);

    rapidTap.scores[player.id] = finalScore;
    rapidTap.finalScores[player.id] = finalScore;
    emitRapidTapState(player.lobbyCode);

    if (Object.keys(rapidTap.finalScores).length >= rapidTap.totalPlayers) {
      resolveRapidTap(player.lobbyCode);
    }
  });

  socket.on("updateStopLineResult", ({ stopLineId, position, distance }) => {
    const player = socket.data.player;

    if (!player) return;

    const game = getLobbyGame(player.lobbyCode);
    const stopLine = game?.stopLine;

    if (
      !stopLine ||
      stopLine.id !== stopLineId ||
      !isMiniGameParticipant(stopLine, player.id) ||
      Date.now() < stopLine.playStartsAt - STOP_LINE_START_GRACE_MS ||
      stopLine.finalResults[player.id]
    ) {
      return;
    }

    stopLine.results[player.id] = {
      position: Math.max(0, Math.min(100, Number(position) || 0)),
      distance: Math.max(0, Math.min(100, Number(distance) || 0)),
    };
    emitStopLineState(player.lobbyCode);
  });

  socket.on("submitStopLineResult", ({ stopLineId, position, distance }) => {
    const player = socket.data.player;

    if (!player) return;

    const game = getLobbyGame(player.lobbyCode);
    const stopLine = game?.stopLine;

    if (
      !stopLine ||
      stopLine.id !== stopLineId ||
      !isMiniGameParticipant(stopLine, player.id) ||
      Date.now() < stopLine.playStartsAt - STOP_LINE_START_GRACE_MS ||
      stopLine.finalResults[player.id]
    ) {
      return;
    }

    const result = {
      position: Math.max(0, Math.min(100, Number(position) || 0)),
      distance: Math.max(0, Math.min(100, Number(distance) || 0)),
    };

    stopLine.results[player.id] = result;
    stopLine.finalResults[player.id] = result;
    emitStopLineState(player.lobbyCode);

    if (Object.keys(stopLine.finalResults).length >= stopLine.totalPlayers) {
      resolveStopLine(player.lobbyCode);
    }
  });

  socket.on("updateJumpBlockScore", ({ jumpBlockId, score }) => {
    const player = socket.data.player;

    if (!player) return;

    const game = getLobbyGame(player.lobbyCode);
    const jumpBlock = game?.jumpBlock;

    if (
      !jumpBlock ||
      jumpBlock.id !== jumpBlockId ||
      !isMiniGameParticipant(jumpBlock, player.id) ||
      Date.now() < jumpBlock.playStartsAt ||
      jumpBlock.finalScores[player.id] !== undefined
    ) {
      return;
    }

    jumpBlock.scores[player.id] = Math.min(
      JUMP_BLOCK_MAX_SCORE,
      Math.max(0, Number(score) || 0),
    );
    emitJumpBlockState(player.lobbyCode);
  });

  socket.on("submitJumpBlockScore", ({ jumpBlockId, score }) => {
    const player = socket.data.player;

    if (!player) return;

    const game = getLobbyGame(player.lobbyCode);
    const jumpBlock = game?.jumpBlock;

    if (
      !jumpBlock ||
      jumpBlock.id !== jumpBlockId ||
      !isMiniGameParticipant(jumpBlock, player.id) ||
      Date.now() < jumpBlock.playStartsAt ||
      jumpBlock.finalScores[player.id] !== undefined
    ) {
      return;
    }

    const finalScore = Math.min(
      JUMP_BLOCK_MAX_SCORE,
      Math.max(0, Number(score) || 0),
    );

    jumpBlock.scores[player.id] = finalScore;
    jumpBlock.finalScores[player.id] = finalScore;
    emitJumpBlockState(player.lobbyCode);

    if (Object.keys(jumpBlock.finalScores).length >= jumpBlock.totalPlayers) {
      resolveJumpBlock(player.lobbyCode);
    }
  });

  socket.on("submitFirstTap", ({ firstTapId }) => {
    const player = socket.data.player;

    if (!player) return;

    const game = getLobbyGame(player.lobbyCode);
    const firstTap = game?.firstTap;

    if (
      !firstTap ||
      firstTap.id !== firstTapId ||
      !isMiniGameParticipant(firstTap, player.id) ||
      Date.now() < firstTap.playStartsAt ||
      firstTap.pressedPlayerIds[player.id]
    ) {
      return;
    }

    firstTap.pressedPlayerIds[player.id] = true;
    firstTap.pressOrder.push({
      playerId: player.id,
      playerName: player.name,
      pressedAt: Date.now(),
    });
    emitFirstTapState(player.lobbyCode);

    if (firstTap.pressOrder.length >= firstTap.totalPlayers) {
      resolveFirstTap(player.lobbyCode);
    }
  });

  socket.on("submitPressRelease", ({ pressReleaseId, heldMs }) => {
    const player = socket.data.player;

    if (!player) return;

    const game = getLobbyGame(player.lobbyCode);
    const pressRelease = game?.pressRelease;
    const finalHeldMs = Math.max(
      0,
      Math.min(PRESS_RELEASE_DURATION_MS, Math.round(Number(heldMs) || 0)),
    );

    if (
      !pressRelease ||
      pressRelease.id !== pressReleaseId ||
      !isMiniGameParticipant(pressRelease, player.id) ||
      Date.now() < pressRelease.playStartsAt ||
      pressRelease.results[player.id]
    ) {
      return;
    }

    pressRelease.results[player.id] = {
      playerId: player.id,
      playerName: player.name,
      heldMs: finalHeldMs,
      differenceMs: Math.abs(finalHeldMs - pressRelease.targetMs),
    };

    emitPressReleaseState(player.lobbyCode);

    if (Object.keys(pressRelease.results).length >= pressRelease.totalPlayers) {
      resolvePressRelease(player.lobbyCode);
    }
  });

  socket.on("toggleReady", () => {
    const player = socket.data.player;

    if (!player) return;

    player.ready = !player.ready;

    const lobbyCode = player.lobbyCode;
    const players = getLobbyPlayers(lobbyCode);

    io.to(lobbyCode).emit("playersUpdated", players);

    socket.emit("readyUpdated", player.ready);
  });

  socket.on("disconnect", () => {
    const player = socket.data.player;

    if (!player) return;

    const lobbyCode = player.lobbyCode;
    const roster = getLobbyPlayers(lobbyCode);
    const rosterPlayerIndex = roster.findIndex(
      (lobbyPlayer) => lobbyPlayer.id === player.id,
    );
    const rosterPlayer = roster[rosterPlayerIndex];
    const game = getLobbyGame(lobbyCode);

    if (rosterPlayer && rosterPlayer.socketId === socket.id) {
      if (!game) {
        roster.splice(rosterPlayerIndex, 1);

        if (roster.length === 0) {
          lobbyRosters.delete(lobbyCode);
        }
      } else {
        rosterPlayer.connected = false;
        rosterPlayer.socketId = "";
      }
    }

    io.to(lobbyCode).emit("playersUpdated", getLobbyPlayers(lobbyCode));

    if (game) {
      emitPauseState(lobbyCode);
    }

    console.log("Disconnected:", socket.id);
  });
});

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^(?!\/(?:api|music|images|socket\.io)(?:\/|$)).*/, (_request, response) => {
    response.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
}

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Game server port ${PORT} is already in use. Stop that process and run npm run dev again.`);
    process.exit(1);
  }

  throw error;
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Game server running on port ${PORT}`);
});
