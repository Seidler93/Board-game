import { useEffect, useRef, useState } from "react";
import socket from "../../socket";
import { getServerOrigin } from "../../serverOrigin";
import "./ControllerPage.css";

const SERVER_ORIGIN = getServerOrigin();
const SAVED_CONTROLLER_SESSION_KEY = "boardGameControllerSession";
const MOVE_BACK_SOUND_URL = `${SERVER_ORIGIN}/music/${encodeURIComponent("freesound_community-wah-ah-108289.mp3")}`;
const WINNING_SOUND_URL = `${SERVER_ORIGIN}/music/${encodeURIComponent("winning sound.mp3")}`;
const DICE_FACE_URLS = {
  1: `${SERVER_ORIGIN}/images/${encodeURIComponent("dice-six-faces-one.png")}`,
  2: `${SERVER_ORIGIN}/images/${encodeURIComponent("dice-six-faces-two.png")}`,
  3: `${SERVER_ORIGIN}/images/${encodeURIComponent("dice-six-faces-three.png")}`,
  4: `${SERVER_ORIGIN}/images/${encodeURIComponent("dice-six-faces-four.png")}`,
  5: `${SERVER_ORIGIN}/images/${encodeURIComponent("dice-six-faces-five.png")}`,
  6: `${SERVER_ORIGIN}/images/${encodeURIComponent("dice-six-faces-six.png")}`,
};

function getRandomRapidTapTarget() {
  return {
    x: 14 + Math.random() * 72,
    y: 18 + Math.random() * 64,
  };
}

function DiceFace({ roll }) {
  return (
    <img
      className="dice-face"
      src={DICE_FACE_URLS[roll]}
      alt={`Rolled ${roll}`}
      draggable="false"
    />
  );
}

function getSavedControllerSession() {
  try {
    const savedSession = JSON.parse(
      window.localStorage.getItem(SAVED_CONTROLLER_SESSION_KEY) || "null",
    );

    if (!savedSession?.name || !savedSession?.lobbyCode) return null;

    return {
      name: String(savedSession.name),
      lobbyCode: String(savedSession.lobbyCode).toUpperCase(),
      avatar: typeof savedSession.avatar === "string" ? savedSession.avatar : "",
    };
  } catch {
    return null;
  }
}

function saveControllerSession(session) {
  window.localStorage.setItem(
    SAVED_CONTROLLER_SESSION_KEY,
    JSON.stringify({
      name: session.name,
      lobbyCode: session.lobbyCode,
      avatar: session.avatar || "",
    }),
  );
}

function clearControllerSession() {
  window.localStorage.removeItem(SAVED_CONTROLLER_SESSION_KEY);
}

function ControllerPage() {
  const [name, setName] = useState("");
  const [lobbyCode, setLobbyCode] = useState("");
  const [avatar, setAvatar] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [joined, setJoined] = useState(false);
  const [ready, setReady] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState("");
  const [myLastRoll, setMyLastRoll] = useState(null);
  const [trivia, setTrivia] = useState(null);
  const [selectedTriviaAnswer, setSelectedTriviaAnswer] = useState(null);
  const [triviaResult, setTriviaResult] = useState(null);
  const [wordMath, setWordMath] = useState(null);
  const [selectedWordMathAnswer, setSelectedWordMathAnswer] = useState(null);
  const [wordMathResult, setWordMathResult] = useState(null);
  const [finishLyric, setFinishLyric] = useState(null);
  const [selectedFinishLyricAnswer, setSelectedFinishLyricAnswer] = useState(null);
  const [finishLyricResult, setFinishLyricResult] = useState(null);
  const [drawImage, setDrawImage] = useState(null);
  const [drawImageResult, setDrawImageResult] = useState(null);
  const [drawImageSubmitted, setDrawImageSubmitted] = useState(false);
  const [selectedDrawVote, setSelectedDrawVote] = useState("");
  const [worstAdvice, setWorstAdvice] = useState(null);
  const [worstAdviceResult, setWorstAdviceResult] = useState(null);
  const [worstAdviceAnswer, setWorstAdviceAnswer] = useState("");
  const [worstAdviceSubmitted, setWorstAdviceSubmitted] = useState(false);
  const [selectedWorstAdviceVote, setSelectedWorstAdviceVote] = useState("");
  const [captionThis, setCaptionThis] = useState(null);
  const [captionThisResult, setCaptionThisResult] = useState(null);
  const [captionThisCaption, setCaptionThisCaption] = useState("");
  const [captionThisSubmitted, setCaptionThisSubmitted] = useState(false);
  const [captionPhotoSubmitted, setCaptionPhotoSubmitted] = useState(false);
  const [selectedCaptionVote, setSelectedCaptionVote] = useState("");
  const [chase, setChase] = useState(null);
  const [chaseResult, setChaseResult] = useState(null);
  const [chaseDirection, setChaseDirection] = useState("right");
  const [mostLikely, setMostLikely] = useState(null);
  const [selectedMostLikelyVote, setSelectedMostLikelyVote] = useState(null);
  const [mostLikelyResult, setMostLikelyResult] = useState(null);
  const [rapidTap, setRapidTap] = useState(null);
  const [rapidTapResult, setRapidTapResult] = useState(null);
  const [tapCount, setTapCount] = useState(0);
  const [rapidTapTarget, setRapidTapTarget] = useState(() => getRandomRapidTapTarget());
  const [rapidTapSubmitted, setRapidTapSubmitted] = useState(false);
  const [stopLine, setStopLine] = useState(null);
  const [stopLineResult, setStopLineResult] = useState(null);
  const [stopLinePosition, setStopLinePosition] = useState(0);
  const [stopLineDistance, setStopLineDistance] = useState(null);
  const [stopLineSubmitted, setStopLineSubmitted] = useState(false);
  const [jumpBlock, setJumpBlock] = useState(null);
  const [jumpBlockResult, setJumpBlockResult] = useState(null);
  const [jumpBlockScore, setJumpBlockScore] = useState(0);
  const [jumpBlockScene, setJumpBlockScene] = useState({
    playerY: 0,
    blockX: 112,
    blockHeight: 10,
    blockWidth: 7,
    difficulty: 1,
    countdown: 3,
    playing: false,
  });
  const [jumpBlockSubmitted, setJumpBlockSubmitted] = useState(false);
  const [firstTap, setFirstTap] = useState(null);
  const [firstTapResult, setFirstTapResult] = useState(null);
  const [firstTapSubmitted, setFirstTapSubmitted] = useState(false);
  const [pressRelease, setPressRelease] = useState(null);
  const [pressReleaseResult, setPressReleaseResult] = useState(null);
  const [pressReleaseSubmitted, setPressReleaseSubmitted] = useState(false);
  const [pressReleaseHolding, setPressReleaseHolding] = useState(false);
  const [pressReleaseHeldMs, setPressReleaseHeldMs] = useState(null);
  const [winner, setWinner] = useState(null);
  const [gamePaused, setGamePaused] = useState(false);
  const [pausedPlayers, setPausedPlayers] = useState([]);
  const [miniGameNow, setMiniGameNow] = useState(Date.now());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const tapCountRef = useRef(0);
  const rapidTapSubmittedRef = useRef(false);
  const stopLineSubmittedRef = useRef(false);
  const jumpBlockSubmittedRef = useRef(false);
  const jumpRequestedRef = useRef(false);
  const jumpBlockScoreRef = useRef(0);
  const drawCanvasRef = useRef(null);
  const drawImageSubmittedRef = useRef(false);
  const chaseTouchStartRef = useRef(null);
  const lastMoveBackSoundKeyRef = useRef("");
  const lastWinningSoundKeyRef = useRef("");
  const pressReleaseStartedAtRef = useRef(0);
  const pressReleaseSubmittedRef = useRef(false);
  const drawingPointerRef = useRef({
    active: false,
    lastX: 0,
    lastY: 0,
  });

  useEffect(() => {
    document.body.classList.add("controller-page-active");

    const preventGestureZoom = (event) => {
      event.preventDefault();
    };
    const preventMultiTouchZoom = (event) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };
    const preventWheelZoom = (event) => {
      if (event.ctrlKey) {
        event.preventDefault();
      }
    };

    document.addEventListener("gesturestart", preventGestureZoom);
    document.addEventListener("gesturechange", preventGestureZoom);
    document.addEventListener("gestureend", preventGestureZoom);
    document.addEventListener("dblclick", preventGestureZoom);
    document.addEventListener("touchstart", preventMultiTouchZoom, {
      passive: false,
    });
    document.addEventListener("touchmove", preventMultiTouchZoom, {
      passive: false,
    });
    document.addEventListener("wheel", preventWheelZoom, {
      passive: false,
    });

    return () => {
      document.body.classList.remove("controller-page-active");
      document.removeEventListener("gesturestart", preventGestureZoom);
      document.removeEventListener("gesturechange", preventGestureZoom);
      document.removeEventListener("gestureend", preventGestureZoom);
      document.removeEventListener("dblclick", preventGestureZoom);
      document.removeEventListener("touchstart", preventMultiTouchZoom);
      document.removeEventListener("touchmove", preventMultiTouchZoom);
      document.removeEventListener("wheel", preventWheelZoom);
    };
  }, []);

  useEffect(() => {
    const savedSession = getSavedControllerSession();

    if (!savedSession) return;

    setName(savedSession.name);
    setLobbyCode(savedSession.lobbyCode);
    setAvatar(savedSession.avatar);

    const joinSavedSession = () => {
      socket.emit("joinLobby", savedSession);
    };

    if (socket.connected) {
      joinSavedSession();
    }

    socket.on("connect", joinSavedSession);

    return () => {
      socket.off("connect", joinSavedSession);
    };
  }, []);

  useEffect(() => {
    socket.on("joinSuccess", (player) => {
      setPlayerId(player.id);
      setJoined(true);
    });

    socket.on("leftLobby", () => {
      clearControllerSession();
      setPlayerId("");
      setJoined(false);
      setReady(false);
      setGameStarted(false);
      setCurrentPlayerId("");
      setMyLastRoll(null);
      setGamePaused(false);
      setPausedPlayers([]);
      setSettingsOpen(false);
    });

    socket.on("readyUpdated", (newReadyState) => {
      setReady(newReadyState);
    });

    socket.on("gameStarted", (game) => {
      setGameStarted(true);
      setCurrentPlayerId(game.currentPlayerId);
      setMyLastRoll(null);
      setTriviaResult(null);
      setWordMathResult(null);
      setFinishLyricResult(null);
      setDrawImageResult(null);
      setWorstAdvice(null);
      setWorstAdviceResult(null);
      setWorstAdviceAnswer("");
      setWorstAdviceSubmitted(false);
      setSelectedWorstAdviceVote("");
      setCaptionThis(null);
      setCaptionThisResult(null);
      setCaptionThisCaption("");
      setCaptionThisSubmitted(false);
      setCaptionPhotoSubmitted(false);
      setSelectedCaptionVote("");
      setChase(null);
      setChaseResult(null);
      setChaseDirection("right");
      setMostLikelyResult(null);
      setRapidTapResult(null);
      setStopLineResult(null);
      setJumpBlockResult(null);
      setFirstTapResult(null);
      setPressReleaseResult(null);
      setWinner(null);
      setGamePaused(game.paused || false);
      setPausedPlayers([]);
    });

    socket.on("gameEnded", () => {
      clearControllerSession();
      setName("");
      setLobbyCode("");
      setAvatar("");
      setPlayerId("");
      setJoined(false);
      setReady(false);
      setGameStarted(false);
      setCurrentPlayerId("");
      setMyLastRoll(null);
      setTrivia(null);
      setSelectedTriviaAnswer(null);
      setTriviaResult(null);
      setWordMath(null);
      setSelectedWordMathAnswer(null);
      setWordMathResult(null);
      setFinishLyric(null);
      setSelectedFinishLyricAnswer(null);
      setFinishLyricResult(null);
      setDrawImage(null);
      setDrawImageResult(null);
      setDrawImageSubmitted(false);
      setSelectedDrawVote("");
      setWorstAdvice(null);
      setWorstAdviceResult(null);
      setWorstAdviceAnswer("");
      setWorstAdviceSubmitted(false);
      setSelectedWorstAdviceVote("");
      setCaptionThis(null);
      setCaptionThisResult(null);
      setCaptionThisCaption("");
      setCaptionThisSubmitted(false);
      setCaptionPhotoSubmitted(false);
      setSelectedCaptionVote("");
      setChase(null);
      setChaseResult(null);
      setChaseDirection("right");
      setMostLikely(null);
      setSelectedMostLikelyVote(null);
      setMostLikelyResult(null);
      setRapidTap(null);
      setRapidTapResult(null);
      setTapCount(0);
      setRapidTapTarget(getRandomRapidTapTarget());
      setRapidTapSubmitted(false);
      setStopLine(null);
      setStopLineResult(null);
      setStopLinePosition(0);
      setStopLineDistance(null);
      setStopLineSubmitted(false);
      setJumpBlock(null);
      setJumpBlockResult(null);
      setJumpBlockScore(0);
      setJumpBlockScene({
        playerY: 0,
        blockX: 112,
        blockHeight: 10,
        blockWidth: 7,
        difficulty: 1,
        countdown: 3,
        playing: false,
      });
      setJumpBlockSubmitted(false);
      setFirstTap(null);
      setFirstTapResult(null);
      setFirstTapSubmitted(false);
      setPressRelease(null);
      setPressReleaseResult(null);
      setPressReleaseSubmitted(false);
      setPressReleaseHolding(false);
      setPressReleaseHeldMs(null);
      setWinner(null);
      setGamePaused(false);
      setPausedPlayers([]);
      tapCountRef.current = 0;
      rapidTapSubmittedRef.current = false;
      stopLineSubmittedRef.current = false;
      jumpBlockSubmittedRef.current = false;
      jumpRequestedRef.current = false;
      jumpBlockScoreRef.current = 0;
      drawImageSubmittedRef.current = false;
      pressReleaseStartedAtRef.current = 0;
      pressReleaseSubmittedRef.current = false;
    });

    socket.on("testMiniGameEnded", () => {
      setGameStarted(false);
      setCurrentPlayerId("");
      setMyLastRoll(null);
      setTrivia(null);
      setSelectedTriviaAnswer(null);
      setTriviaResult(null);
      setWordMath(null);
      setSelectedWordMathAnswer(null);
      setWordMathResult(null);
      setFinishLyric(null);
      setSelectedFinishLyricAnswer(null);
      setFinishLyricResult(null);
      setDrawImage(null);
      setDrawImageResult(null);
      setDrawImageSubmitted(false);
      setSelectedDrawVote("");
      setWorstAdvice(null);
      setWorstAdviceResult(null);
      setWorstAdviceAnswer("");
      setWorstAdviceSubmitted(false);
      setSelectedWorstAdviceVote("");
      setCaptionThis(null);
      setCaptionThisResult(null);
      setCaptionThisCaption("");
      setCaptionThisSubmitted(false);
      setCaptionPhotoSubmitted(false);
      setSelectedCaptionVote("");
      setChase(null);
      setChaseResult(null);
      setChaseDirection("right");
      setMostLikely(null);
      setSelectedMostLikelyVote(null);
      setMostLikelyResult(null);
      setRapidTap(null);
      setRapidTapResult(null);
      setTapCount(0);
      setRapidTapTarget(getRandomRapidTapTarget());
      setRapidTapSubmitted(false);
      setStopLine(null);
      setStopLineResult(null);
      setStopLinePosition(0);
      setStopLineDistance(null);
      setStopLineSubmitted(false);
      setJumpBlock(null);
      setJumpBlockResult(null);
      setJumpBlockScore(0);
      setJumpBlockScene({
        playerY: 0,
        blockX: 112,
        blockHeight: 10,
        blockWidth: 7,
        difficulty: 1,
        countdown: 3,
        playing: false,
      });
      setJumpBlockSubmitted(false);
      setFirstTap(null);
      setFirstTapResult(null);
      setFirstTapSubmitted(false);
      setPressRelease(null);
      setPressReleaseResult(null);
      setPressReleaseSubmitted(false);
      setPressReleaseHolding(false);
      setPressReleaseHeldMs(null);
      setWinner(null);
      setGamePaused(false);
      setPausedPlayers([]);
      tapCountRef.current = 0;
      rapidTapSubmittedRef.current = false;
      stopLineSubmittedRef.current = false;
      jumpBlockSubmittedRef.current = false;
      jumpRequestedRef.current = false;
      jumpBlockScoreRef.current = 0;
      drawImageSubmittedRef.current = false;
      pressReleaseStartedAtRef.current = 0;
      pressReleaseSubmittedRef.current = false;
    });

    socket.on("turnUpdated", ({ currentPlayerId: nextPlayerId }) => {
      setCurrentPlayerId(nextPlayerId);
    });

    socket.on("gameStateUpdated", (game) => {
      setGamePaused(game?.paused || false);
    });

    socket.on("gamePausedUpdated", ({ paused, disconnectedPlayers }) => {
      setGamePaused(paused);
      setPausedPlayers(disconnectedPlayers || []);
    });

    socket.on("gameWon", (nextWinner) => {
      setWinner(nextWinner);
      setCurrentPlayerId("");
      setTrivia(null);
      setWordMath(null);
      setFinishLyric(null);
      setDrawImage(null);
      setWorstAdvice(null);
      setCaptionThis(null);
      setChase(null);
      setMostLikely(null);
      setRapidTap(null);
      setStopLine(null);
      setJumpBlock(null);
      setFirstTap(null);
      setPressRelease(null);
    });

    socket.on("diceRolled", (rollEvent) => {
      if (!rollEvent) {
        setMyLastRoll(null);
        return;
      }

      const { playerId: rollingPlayerId } = rollEvent;

      if (rollingPlayerId === playerId) {
        setMyLastRoll(rollEvent);
      }
    });

    socket.on("triviaStarted", (nextTrivia) => {
      setTrivia(nextTrivia);
      setTriviaResult(null);

      if (!nextTrivia.answeredPlayerIds.includes(playerId)) {
        setSelectedTriviaAnswer(null);
      }
    });

    socket.on("triviaResolved", (result) => {
      setTrivia(null);
      setTriviaResult(result);

      if (result) {
        window.setTimeout(() => {
          setTriviaResult((currentResult) =>
            currentResult === result ? null : currentResult,
          );
        }, 6000);
      }
    });

    socket.on("wordMathStarted", (nextWordMath) => {
      setWordMath(nextWordMath);
      setWordMathResult(null);

      if (!nextWordMath.answeredPlayerIds.includes(playerId)) {
        setSelectedWordMathAnswer(null);
      }
    });

    socket.on("wordMathResolved", (result) => {
      setWordMath(null);
      setWordMathResult(result);

      if (result) {
        window.setTimeout(() => {
          setWordMathResult((currentResult) =>
            currentResult === result ? null : currentResult,
          );
        }, 6000);
      }
    });

    socket.on("finishLyricStarted", (nextFinishLyric) => {
      setFinishLyric(nextFinishLyric);
      setFinishLyricResult(null);

      if (!nextFinishLyric.answeredPlayerIds.includes(playerId)) {
        setSelectedFinishLyricAnswer(null);
      }
    });

    socket.on("finishLyricResolved", (result) => {
      setFinishLyric(null);
      setFinishLyricResult(result);

      if (result) {
        window.setTimeout(() => {
          setFinishLyricResult((currentResult) =>
            currentResult === result ? null : currentResult,
          );
        }, 6000);
      }
    });

    socket.on("drawImageStarted", (nextDrawImage) => {
      setDrawImage(nextDrawImage);
      setDrawImageResult(null);
      setSelectedDrawVote("");
      setDrawImageSubmitted(nextDrawImage.submittedPlayerIds.includes(playerId));
      drawImageSubmittedRef.current = nextDrawImage.submittedPlayerIds.includes(playerId);
    });

    socket.on("drawImageUpdated", (nextDrawImage) => {
      setDrawImage(nextDrawImage);
      setDrawImageSubmitted(nextDrawImage.submittedPlayerIds.includes(playerId));
      drawImageSubmittedRef.current = nextDrawImage.submittedPlayerIds.includes(playerId);
    });

    socket.on("drawImageResolved", (result) => {
      setDrawImage(null);
      setDrawImageResult(result);
      setDrawImageSubmitted(false);
      setSelectedDrawVote("");
      drawImageSubmittedRef.current = false;

      if (result) {
        window.setTimeout(() => {
          setDrawImageResult((currentResult) =>
            currentResult === result ? null : currentResult,
          );
        }, 6000);
      }
    });

    socket.on("worstAdviceStarted", (nextWorstAdvice) => {
      setWorstAdvice(nextWorstAdvice);
      setWorstAdviceResult(null);
      setWorstAdviceSubmitted(nextWorstAdvice.submittedPlayerIds.includes(playerId));
      setSelectedWorstAdviceVote("");

      if (!nextWorstAdvice.submittedPlayerIds.includes(playerId)) {
        setWorstAdviceAnswer("");
      }
    });

    socket.on("worstAdviceUpdated", (nextWorstAdvice) => {
      setWorstAdvice(nextWorstAdvice);
      setWorstAdviceSubmitted(nextWorstAdvice.submittedPlayerIds.includes(playerId));
    });

    socket.on("worstAdviceResolved", (result) => {
      setWorstAdvice(null);
      setWorstAdviceResult(result);
      setWorstAdviceSubmitted(false);
      setSelectedWorstAdviceVote("");

      if (result) {
        window.setTimeout(() => {
          setWorstAdviceResult((currentResult) =>
            currentResult === result ? null : currentResult,
          );
        }, 6000);
      }
    });

    socket.on("captionThisStarted", (nextCaptionThis) => {
      setCaptionThis(nextCaptionThis);
      setCaptionThisResult(null);
      setCaptionThisSubmitted(nextCaptionThis.submittedPlayerIds.includes(playerId));
      setCaptionPhotoSubmitted(Boolean(nextCaptionThis.photo));
      setSelectedCaptionVote("");

      if (!nextCaptionThis.submittedPlayerIds.includes(playerId)) {
        setCaptionThisCaption("");
      }
    });

    socket.on("captionThisUpdated", (nextCaptionThis) => {
      setCaptionThis(nextCaptionThis);
      setCaptionThisSubmitted(nextCaptionThis.submittedPlayerIds.includes(playerId));
      setCaptionPhotoSubmitted(Boolean(nextCaptionThis.photo));
    });

    socket.on("captionThisResolved", (result) => {
      setCaptionThis(null);
      setCaptionThisResult(result);
      setCaptionThisSubmitted(false);
      setCaptionPhotoSubmitted(false);
      setSelectedCaptionVote("");

      if (result) {
        window.setTimeout(() => {
          setCaptionThisResult((currentResult) =>
            currentResult === result ? null : currentResult,
          );
        }, 6000);
      }
    });

    socket.on("chaseStarted", (nextChase) => {
      const myChasePlayer = nextChase.players[playerId];

      setChase(nextChase);
      setChaseResult(null);
      setChaseDirection(
        myChasePlayer?.direction?.x === -1
          ? "left"
          : myChasePlayer?.direction?.y === -1
          ? "up"
          : myChasePlayer?.direction?.y === 1
          ? "down"
          : "right",
      );
    });

    socket.on("chaseUpdated", (nextChase) => {
      setChase(nextChase);
    });

    socket.on("chaseResolved", (result) => {
      setChase(null);
      setChaseResult(result);

      if (result) {
        window.setTimeout(() => {
          setChaseResult((currentResult) =>
            currentResult === result ? null : currentResult,
          );
        }, 6000);
      }
    });

    socket.on("mostLikelyStarted", (nextMostLikely) => {
      setMostLikely(nextMostLikely);
      setMostLikelyResult(null);

      if (!nextMostLikely.answeredPlayerIds.includes(playerId)) {
        setSelectedMostLikelyVote(null);
      }
    });

    socket.on("mostLikelyResolved", (result) => {
      setMostLikely(null);
      setMostLikelyResult(result);

      if (result) {
        window.setTimeout(() => {
          setMostLikelyResult((currentResult) =>
            currentResult === result ? null : currentResult,
          );
        }, 6000);
      }
    });

    socket.on("rapidTapStarted", (nextRapidTap) => {
      setRapidTap(nextRapidTap);
      setRapidTapResult(null);
      setTapCount(0);
      setRapidTapTarget(getRandomRapidTapTarget());
      setRapidTapSubmitted(false);
      tapCountRef.current = 0;
      rapidTapSubmittedRef.current = false;
    });

    socket.on("rapidTapResolved", (result) => {
      setRapidTap(null);
      setRapidTapResult(result);
      setRapidTapSubmitted(false);
      rapidTapSubmittedRef.current = false;

      if (result) {
        window.setTimeout(() => {
          setRapidTapResult((currentResult) =>
            currentResult === result ? null : currentResult,
          );
        }, 6000);
      }
    });

    socket.on("stopLineStarted", (nextStopLine) => {
      setStopLine(nextStopLine);
      setStopLineResult(null);
      setStopLineDistance(null);
      setStopLineSubmitted(false);
      stopLineSubmittedRef.current = false;
    });

    socket.on("stopLineResolved", (result) => {
      setStopLine(null);
      setStopLineResult(result);
      setStopLineSubmitted(false);
      stopLineSubmittedRef.current = false;

      if (result) {
        window.setTimeout(() => {
          setStopLineResult((currentResult) =>
            currentResult === result ? null : currentResult,
          );
        }, 6000);
      }
    });

    socket.on("jumpBlockStarted", (nextJumpBlock) => {
      setJumpBlock(nextJumpBlock);
      setJumpBlockResult(null);
      setJumpBlockScore(0);
      setJumpBlockScene({
        playerY: 0,
        blockX: 112,
        blockHeight: 10,
        blockWidth: 7,
        difficulty: 1,
        countdown: 3,
        playing: false,
      });
      setJumpBlockSubmitted(false);
      jumpBlockScoreRef.current = 0;
      jumpBlockSubmittedRef.current = false;
      jumpRequestedRef.current = false;
    });

    socket.on("jumpBlockResolved", (result) => {
      setJumpBlock(null);
      setJumpBlockResult(result);
      setJumpBlockSubmitted(false);
      jumpBlockSubmittedRef.current = false;
      jumpRequestedRef.current = false;

      if (result) {
        window.setTimeout(() => {
          setJumpBlockResult((currentResult) =>
            currentResult === result ? null : currentResult,
          );
        }, 6000);
      }
    });

    socket.on("firstTapStarted", (nextFirstTap) => {
      setFirstTap(nextFirstTap);
      setFirstTapResult(null);
      setFirstTapSubmitted(nextFirstTap.submittedPlayerIds.includes(playerId));
    });

    socket.on("firstTapUpdated", (nextFirstTap) => {
      setFirstTap(nextFirstTap);
      setFirstTapSubmitted(nextFirstTap.submittedPlayerIds.includes(playerId));
    });

    socket.on("firstTapResolved", (result) => {
      setFirstTap(null);
      setFirstTapResult(result);
      setFirstTapSubmitted(false);

      if (result) {
        window.setTimeout(() => {
          setFirstTapResult((currentResult) =>
            currentResult === result ? null : currentResult,
          );
        }, 6000);
      }
    });

    socket.on("pressReleaseStarted", (nextPressRelease) => {
      setPressRelease(nextPressRelease);
      setPressReleaseResult(null);
      setPressReleaseSubmitted(nextPressRelease.submittedPlayerIds.includes(playerId));
      setPressReleaseHolding(false);
      setPressReleaseHeldMs(null);
      pressReleaseSubmittedRef.current = nextPressRelease.submittedPlayerIds.includes(playerId);
      pressReleaseStartedAtRef.current = 0;
    });

    socket.on("pressReleaseUpdated", (nextPressRelease) => {
      setPressRelease(nextPressRelease);
      setPressReleaseSubmitted(nextPressRelease.submittedPlayerIds.includes(playerId));
      pressReleaseSubmittedRef.current = nextPressRelease.submittedPlayerIds.includes(playerId);
    });

    socket.on("pressReleaseResolved", (result) => {
      setPressRelease(null);
      setPressReleaseResult(result);
      setPressReleaseSubmitted(false);
      setPressReleaseHolding(false);
      pressReleaseSubmittedRef.current = false;
      pressReleaseStartedAtRef.current = 0;

      if (result) {
        window.setTimeout(() => {
          setPressReleaseResult((currentResult) =>
            currentResult === result ? null : currentResult,
          );
        }, 6000);
      }
    });

    return () => {
      socket.off("joinSuccess");
      socket.off("leftLobby");
      socket.off("readyUpdated");
      socket.off("gameStarted");
      socket.off("gameEnded");
      socket.off("testMiniGameEnded");
      socket.off("turnUpdated");
      socket.off("gameStateUpdated");
      socket.off("gamePausedUpdated");
      socket.off("gameWon");
      socket.off("diceRolled");
      socket.off("triviaStarted");
      socket.off("triviaResolved");
      socket.off("wordMathStarted");
      socket.off("wordMathResolved");
      socket.off("finishLyricStarted");
      socket.off("finishLyricResolved");
      socket.off("drawImageStarted");
      socket.off("drawImageUpdated");
      socket.off("drawImageResolved");
      socket.off("worstAdviceStarted");
      socket.off("worstAdviceUpdated");
      socket.off("worstAdviceResolved");
      socket.off("captionThisStarted");
      socket.off("captionThisUpdated");
      socket.off("captionThisResolved");
      socket.off("chaseStarted");
      socket.off("chaseUpdated");
      socket.off("chaseResolved");
      socket.off("mostLikelyStarted");
      socket.off("mostLikelyResolved");
      socket.off("rapidTapStarted");
      socket.off("rapidTapResolved");
      socket.off("stopLineStarted");
      socket.off("stopLineResolved");
      socket.off("jumpBlockStarted");
      socket.off("jumpBlockResolved");
      socket.off("firstTapStarted");
      socket.off("firstTapUpdated");
      socket.off("firstTapResolved");
      socket.off("pressReleaseStarted");
      socket.off("pressReleaseUpdated");
      socket.off("pressReleaseResolved");
    };
  }, [playerId]);

  useEffect(() => {
    if (!joined || !playerId) return;

    socket.emit("requestGameSnapshot");
  }, [joined, playerId]);

  useEffect(() => {
    if (!rapidTap) return;

    const submitFinalScore = () => {
      if (rapidTapSubmittedRef.current) return;

      rapidTapSubmittedRef.current = true;
      setRapidTapSubmitted(true);
      socket.emit("submitRapidTapScore", {
        rapidTapId: rapidTap.id,
        score: tapCountRef.current,
      });
    };

    const liveUpdateTimer = window.setInterval(() => {
      if (Date.now() < rapidTap.playStartsAt) return;

      socket.emit("updateRapidTapScore", {
        rapidTapId: rapidTap.id,
        score: tapCountRef.current,
      });
    }, 350);
    const finalTimer = window.setTimeout(
      submitFinalScore,
      Math.max(0, rapidTap.endsAt - Date.now()),
    );

    return () => {
      window.clearInterval(liveUpdateTimer);
      window.clearTimeout(finalTimer);
    };
  }, [rapidTap]);

  useEffect(() => {
    const activeMiniGame = trivia || wordMath || finishLyric || drawImage || worstAdvice || captionThis || chase || mostLikely || rapidTap || stopLine || jumpBlock || firstTap || pressRelease;

    if (!activeMiniGame) return;

    setMiniGameNow(Date.now());
    const timer = window.setInterval(() => {
      setMiniGameNow(Date.now());
    }, 250);

    return () => {
      window.clearInterval(timer);
    };
  }, [captionThis, chase, drawImage, finishLyric, firstTap, jumpBlock, mostLikely, pressRelease, rapidTap, stopLine, trivia, wordMath, worstAdvice]);

  useEffect(() => {
    if (!playerId) return;

    const results = [
      ["trivia", triviaResult],
      ["wordMath", wordMathResult],
      ["finishLyric", finishLyricResult],
      ["drawImage", drawImageResult],
      ["worstAdvice", worstAdviceResult],
      ["captionThis", captionThisResult],
      ["chase", chaseResult],
      ["mostLikely", mostLikelyResult],
      ["rapidTap", rapidTapResult],
      ["stopLine", stopLineResult],
      ["jumpBlock", jumpBlockResult],
      ["firstTap", firstTapResult],
      ["pressRelease", pressReleaseResult],
    ];

    for (const [resultType, result] of results) {
      const penalty = result?.penalties?.find(
        (nextPenalty) => nextPenalty.playerId === playerId,
      );

      if (!penalty) continue;

      const soundKey = [
        resultType,
        penalty.playerId,
        penalty.fromPosition,
        penalty.toPosition,
        penalty.spacesBack,
      ].join(":");

      if (lastMoveBackSoundKeyRef.current === soundKey) return;

      lastMoveBackSoundKeyRef.current = soundKey;

      const wah = new Audio(MOVE_BACK_SOUND_URL);
      wah.volume = 0.85;
      wah.play().catch(() => {});
      return;
    }
  }, [
    captionThisResult,
    chaseResult,
    drawImageResult,
    finishLyricResult,
    firstTapResult,
    jumpBlockResult,
    mostLikelyResult,
    playerId,
    pressReleaseResult,
    rapidTapResult,
    stopLineResult,
    triviaResult,
    wordMathResult,
    worstAdviceResult,
  ]);

  useEffect(() => {
    if (!playerId) return;

    const getTopScoreWinners = (scores) => {
      const entries = Object.entries(scores || {});
      const topScore = Math.max(0, ...entries.map(([, score]) => Number(score) || 0));

      if (topScore <= 0) return [];

      return entries
        .filter(([, score]) => (Number(score) || 0) === topScore)
        .map(([nextPlayerId]) => nextPlayerId);
    };
    const getLowestResultWinners = (results, resultKey) => {
      const entries = Object.entries(results || {});
      const getResultValue = (result) => {
        const value = Number(result?.[resultKey]);

        return Number.isFinite(value) ? value : Infinity;
      };
      const bestValue = Math.min(
        Infinity,
        ...entries.map(([, result]) => getResultValue(result)),
      );

      if (!Number.isFinite(bestValue)) return [];

      return entries
        .filter(([, result]) => getResultValue(result) === bestValue)
        .map(([nextPlayerId]) => nextPlayerId);
    };
    const getTopVoteWinners = (voteCounts) => {
      const entries = Object.entries(voteCounts || {});
      const topVotes = Math.max(0, ...entries.map(([, count]) => Number(count) || 0));

      if (topVotes <= 0) return [];

      return entries
        .filter(([, count]) => (Number(count) || 0) === topVotes)
        .map(([nextPlayerId]) => nextPlayerId);
    };
    const resultWinners = [
      ["drawImage", drawImageResult, getTopVoteWinners(drawImageResult?.voteCounts)],
      ["worstAdvice", worstAdviceResult, getTopVoteWinners(worstAdviceResult?.voteCounts)],
      ["captionThis", captionThisResult, captionThisResult?.winningPlayerIds || []],
      ["chase", chaseResult, chaseResult ? [chaseResult.caught ? chaseResult.caughtById : chaseResult.runnerId].filter(Boolean) : []],
      ["rapidTap", rapidTapResult, getTopScoreWinners(rapidTapResult?.scores)],
      ["stopLine", stopLineResult, getLowestResultWinners(stopLineResult?.results, "distance")],
      ["jumpBlock", jumpBlockResult, getTopScoreWinners(jumpBlockResult?.scores)],
      ["firstTap", firstTapResult, firstTapResult?.pressOrder?.[0]?.playerId ? [firstTapResult.pressOrder[0].playerId] : []],
      ["pressRelease", pressReleaseResult, getLowestResultWinners(pressReleaseResult?.results, "differenceMs")],
    ];

    for (const [resultType, result, winnerIds] of resultWinners) {
      if (!result || !winnerIds.includes(playerId)) continue;

      const soundKey = [resultType, playerId, winnerIds.join(",")].join(":");

      if (lastWinningSoundKeyRef.current === soundKey) return;

      lastWinningSoundKeyRef.current = soundKey;

      const winnerSound = new Audio(WINNING_SOUND_URL);
      winnerSound.volume = 0.85;
      winnerSound.play().catch(() => {});
      return;
    }
  }, [
    captionThisResult,
    chaseResult,
    drawImageResult,
    firstTapResult,
    jumpBlockResult,
    playerId,
    pressReleaseResult,
    rapidTapResult,
    stopLineResult,
    worstAdviceResult,
  ]);

  useEffect(() => {
    if (!stopLine) return;

    let animationFrame = 0;
    const cycleMs = 1600;

    const getCurrentPosition = () => {
      const elapsed = Math.max(0, Date.now() - stopLine.playStartsAt);
      const progress = (elapsed % cycleMs) / cycleMs;

      return progress <= 0.5 ? progress * 200 : (1 - progress) * 200;
    };

    const submitStop = () => {
      if (stopLineSubmittedRef.current) return;

      const position = getCurrentPosition();
      const distance = Math.abs(position - stopLine.target);

      stopLineSubmittedRef.current = true;
      setStopLineSubmitted(true);
      setStopLinePosition(position);
      setStopLineDistance(distance);
      socket.emit("submitStopLineResult", {
        stopLineId: stopLine.id,
        position,
        distance,
      });
    };

    const updatePosition = () => {
      if (!stopLineSubmittedRef.current) {
        setStopLinePosition(Date.now() < stopLine.playStartsAt ? 0 : getCurrentPosition());
        animationFrame = window.requestAnimationFrame(updatePosition);
      }
    };

    updatePosition();
    const finalTimer = window.setTimeout(
      submitStop,
      Math.max(0, stopLine.endsAt - Date.now()),
    );

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(finalTimer);
    };
  }, [stopLine]);

  useEffect(() => {
    if (!jumpBlock) return;

    let animationFrame = 0;
    let lastTime = performance.now();
    let playerY = 0;
    let playerVelocity = 0;
    let blockX = 112;
    let score = 0;
    let liveUpdateAt = 0;
    let passedCurrentBlock = false;
    const maxJumpBlockScore = 50;
    const blockWidth = 7;
    const getNextBlockStart = () => 108 + Math.random() * 34;
    const playerCenterX = 30;
    const playerWidth = 8;
    const playerCollisionInset = 1.1;

    const submitFinalScore = () => {
      if (jumpBlockSubmittedRef.current) return;

      jumpBlockSubmittedRef.current = true;
      setJumpBlockSubmitted(true);
      socket.emit("submitJumpBlockScore", {
        jumpBlockId: jumpBlock.id,
        score: jumpBlockScoreRef.current,
      });
    };

    const updateGame = (now) => {
      const timeUntilStart = Math.max(0, jumpBlock.playStartsAt - Date.now());
      const countdown = Math.ceil(timeUntilStart / 1000);

      if (timeUntilStart > 0) {
        lastTime = now;
        setJumpBlockScene({
          playerY: 0,
          blockX: 112,
          blockHeight: 10,
          blockWidth,
          difficulty: 1,
          countdown,
          playing: false,
        });

        animationFrame = window.requestAnimationFrame(updateGame);
        return;
      }

      const dt = Math.min(0.04, (now - lastTime) / 1000);
      const elapsed = Math.max(0, (Date.now() - jumpBlock.playStartsAt) / 1000);
      const difficulty = 1 + elapsed / 5 + score * 0.16;
      const blockSpeed = 38 + difficulty * 13;
      const blockHeight = 10;
      const obstacleClearance = blockHeight * 0.86;
      const playerLeft = playerCenterX - playerWidth / 2 + playerCollisionInset;
      const playerRight = playerCenterX + playerWidth / 2 - playerCollisionInset;

      lastTime = now;

      if (jumpRequestedRef.current && playerY <= 0.4) {
        playerVelocity = 130;
      }

      jumpRequestedRef.current = false;
      playerVelocity -= 360 * dt;
      playerY = Math.max(0, playerY + playerVelocity * dt);

      if (playerY === 0 && playerVelocity < 0) {
        playerVelocity = 0;
      }

      blockX -= blockSpeed * dt;

      const blockLeft = blockX;
      const blockRight = blockX + blockWidth;
      const isOverlappingPlayer = blockRight >= playerLeft && blockLeft <= playerRight;

      if (
        isOverlappingPlayer &&
        playerY < obstacleClearance &&
        !jumpBlockSubmittedRef.current
      ) {
        submitFinalScore();
      }

      if (blockRight < playerLeft && !passedCurrentBlock) {
        passedCurrentBlock = true;
        score = Math.min(maxJumpBlockScore, score + 1);
        jumpBlockScoreRef.current = score;
        setJumpBlockScore(score);

        if (score >= maxJumpBlockScore) {
          submitFinalScore();
        }
      }

      if (blockX < -16) {
        blockX = getNextBlockStart();
        passedCurrentBlock = false;
      }

      setJumpBlockScene({
        playerY,
        blockX,
        blockHeight,
        blockWidth,
        difficulty,
        countdown: 0,
        playing: true,
      });

      if (now - liveUpdateAt > 350) {
        liveUpdateAt = now;
        socket.emit("updateJumpBlockScore", {
          jumpBlockId: jumpBlock.id,
          score: jumpBlockScoreRef.current,
        });
      }

      if (!jumpBlockSubmittedRef.current) {
        animationFrame = window.requestAnimationFrame(updateGame);
      }
    };

    animationFrame = window.requestAnimationFrame(updateGame);
    const finalTimer = window.setTimeout(
      submitFinalScore,
      Math.max(0, jumpBlock.endsAt - Date.now()),
    );

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(finalTimer);
    };
  }, [jumpBlock]);

  useEffect(() => {
    if (!pressRelease) return;

    const finalTimer = window.setTimeout(() => {
      if (pressReleaseSubmittedRef.current) return;

      const heldMs = pressReleaseStartedAtRef.current
        ? performance.now() - pressReleaseStartedAtRef.current
        : 0;

      submitPressReleaseHold(heldMs);
    }, Math.max(0, pressRelease.endsAt - Date.now()));

    return () => {
      window.clearTimeout(finalTimer);
    };
  }, [pressRelease, pressReleaseHolding]);

  useEffect(() => {
    if (!drawImage || drawImage.stage !== "drawing") return;

    const canvas = drawCanvasRef.current;

    if (!canvas) return;

    const width = 640;
    const height = 480;
    const context = canvas.getContext("2d");

    canvas.width = width;
    canvas.height = height;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 10;
    context.strokeStyle = "#111111";
  }, [drawImage?.id, drawImage?.stage]);

  useEffect(() => {
    if (!drawImage || drawImage.stage !== "drawing") return;

    const submitDrawing = () => {
      if (drawImageSubmittedRef.current) return;

      const canvas = drawCanvasRef.current;

      if (!canvas) return;

      drawImageSubmittedRef.current = true;
      setDrawImageSubmitted(true);
      socket.emit("submitDrawImage", {
        drawImageId: drawImage.id,
        image: canvas.toDataURL("image/png"),
      });
    };

    const finalTimer = window.setTimeout(
      submitDrawing,
      Math.max(0, drawImage.endsAt - Date.now()),
    );

    return () => {
      window.clearTimeout(finalTimer);
    };
  }, [drawImage]);

  function getCanvasPoint(event) {
    const canvas = drawCanvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function submitCurrentDrawing() {
    if (!drawImage || drawImage.stage !== "drawing" || drawImageSubmittedRef.current) {
      return;
    }

    const canvas = drawCanvasRef.current;

    if (!canvas) return;

    drawImageSubmittedRef.current = true;
    setDrawImageSubmitted(true);
    socket.emit("submitDrawImage", {
      drawImageId: drawImage.id,
      image: canvas.toDataURL("image/png"),
    });
  }

  function clearDrawing() {
    const canvas = drawCanvasRef.current;

    if (!canvas || drawImageSubmitted) return;

    const context = canvas.getContext("2d");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  function handleDrawPointerDown(event) {
    if (!drawImage || drawImage.stage !== "drawing" || drawImageSubmitted) return;
    if (Date.now() < drawImage.playStartsAt) return;

    event.preventDefault();
    event.stopPropagation();

    const point = getCanvasPoint(event);

    event.currentTarget.setPointerCapture(event.pointerId);
    drawingPointerRef.current = {
      active: true,
      lastX: point.x,
      lastY: point.y,
    };
  }

  function handleDrawPointerMove(event) {
    if (!drawingPointerRef.current.active || drawImageSubmitted) return;

    event.preventDefault();
    event.stopPropagation();

    const canvas = drawCanvasRef.current;

    if (!canvas) return;

    const point = getCanvasPoint(event);
    const context = canvas.getContext("2d");

    context.beginPath();
    context.moveTo(drawingPointerRef.current.lastX, drawingPointerRef.current.lastY);
    context.lineTo(point.x, point.y);
    context.stroke();
    drawingPointerRef.current = {
      active: true,
      lastX: point.x,
      lastY: point.y,
    };
  }

  function handleDrawPointerUp(event) {
    event?.preventDefault();
    event?.stopPropagation();

    drawingPointerRef.current = {
      active: false,
      lastX: 0,
      lastY: 0,
    };
  }

  function submitPressReleaseHold(heldMs) {
    if (!pressRelease || pressReleaseSubmittedRef.current) return;

    const finalHeldMs = Math.max(0, Math.round(heldMs));

    pressReleaseSubmittedRef.current = true;
    setPressReleaseSubmitted(true);
    setPressReleaseHolding(false);
    setPressReleaseHeldMs(finalHeldMs);
    socket.emit("submitPressRelease", {
      pressReleaseId: pressRelease.id,
      heldMs: finalHeldMs,
    });
  }

  function handlePressReleaseDown(event) {
    const hasStarted = pressRelease && miniGameNow >= pressRelease.playStartsAt;

    if (!hasStarted || pressReleaseSubmittedRef.current) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pressReleaseStartedAtRef.current = performance.now();
    setPressReleaseHolding(true);
    setPressReleaseHeldMs(null);
  }

  function handlePressReleaseUp(event) {
    if (!pressReleaseHolding || pressReleaseSubmittedRef.current) return;

    event.preventDefault();
    submitPressReleaseHold(performance.now() - pressReleaseStartedAtRef.current);
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 160;
        const scale = Math.max(size / image.width, size / image.height) * 1.04;
        const width = image.width * scale;
        const height = image.height * scale;
        const x = (size - width) / 2;
        const y = (size - height) / 2;
        const context = canvas.getContext("2d");

        canvas.width = size;
        canvas.height = size;
        context.fillStyle = "#202020";
        context.fillRect(0, 0, size, size);
        context.drawImage(image, x, y, width, height);
        setAvatar(canvas.toDataURL("image/jpeg", 0.72));
      };

      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  }

  function handleCaptionPhotoChange(event) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !captionThis || captionThis.stage !== "photo") return;
    if (captionThis.photoPlayerId !== playerId || captionPhotoSubmitted) return;

    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 900;
        const maxHeight = 900;
        const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
        const width = Math.round(image.width * scale);
        const height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");

        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0, width, height);

        setCaptionPhotoSubmitted(true);
        socket.emit("submitCaptionThisPhoto", {
          captionThisId: captionThis.id,
          image: canvas.toDataURL("image/jpeg", 0.76),
        });
      };

      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  }

  function setChaseMoveDirection(direction) {
    if (!chase || Date.now() < chase.playStartsAt) return;

    setChaseDirection(direction);
    socket.emit("setChaseDirection", {
      chaseId: chase.id,
      direction,
    });
  }

  function handleChaseTouchStart(event) {
    const touch = event.touches?.[0];

    if (!touch) return;

    chaseTouchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  }

  function handleChaseTouchEnd(event) {
    const start = chaseTouchStartRef.current;
    const touch = event.changedTouches?.[0];

    chaseTouchStartRef.current = null;

    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (Math.hypot(deltaX, deltaY) < 24) return;

    setChaseMoveDirection(
      Math.abs(deltaX) > Math.abs(deltaY)
        ? deltaX > 0
          ? "right"
          : "left"
        : deltaY > 0
        ? "down"
        : "up",
    );
  }

  function leaveGame() {
    clearControllerSession();
    setSettingsOpen(false);
    setJoined(false);
    setReady(false);
    setGameStarted(false);
    setCurrentPlayerId("");
    setMyLastRoll(null);
    setGamePaused(false);
    setPausedPlayers([]);

    socket.emit(
      "leaveLobby",
      {
        lobbyCode,
        playerId,
      },
      () => {},
    );
  }

  const settingsOverlay = (
    <>
      <button
        className="controller-settings-button"
        type="button"
        onClick={() => setSettingsOpen(true)}
      >
        SETTINGS
      </button>

      {settingsOpen && (
        <div className="controller-settings-backdrop">
          <div className="controller-settings-modal" role="dialog" aria-modal="true">
            <h2>Settings</h2>

            <button
              className="controller-leave-button"
              type="button"
              onClick={leaveGame}
            >
              LEAVE GAME
            </button>

            <button
              className="controller-close-settings-button"
              type="button"
              onClick={() => setSettingsOpen(false)}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </>
  );

  const renderControllerContent = () => {
  if (!joined) {
    return (
      <div className="controller-screen">
        <h1>Join Game</h1>

        <input
          type="text"
          placeholder="Lobby Code"
          value={lobbyCode}
          onChange={(event) => setLobbyCode(event.target.value.toUpperCase())}
        />

        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <label className="avatar-picker">
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
          />

          <span
            className={avatar ? "avatar-preview has-photo" : "avatar-preview"}
            style={
              avatar
                ? {
                    backgroundImage: `url(${avatar})`,
                  }
                : undefined
            }
          >
            {!avatar && (name.trim().charAt(0).toUpperCase() || "+")}
          </span>

          <span>{avatar ? "Change Photo" : "Choose Photo"}</span>
        </label>

        <button
          disabled={!name.trim() || !lobbyCode.trim()}
          onClick={() => {
            const nextSession = {
              name: name.trim(),
              lobbyCode: lobbyCode.trim().toUpperCase(),
              avatar,
            };

            saveControllerSession(nextSession);
            socket.emit("joinLobby", {
              ...nextSession,
            });
          }}
        >
          JOIN GAME
        </button>
      </div>
    );
  }

  if (gameStarted) {
    const isMyTurn = currentPlayerId === playerId;
    const myPenalty = triviaResult?.penalties.find(
      (penalty) => penalty.playerId === playerId,
    ) || wordMathResult?.penalties.find(
      (penalty) => penalty.playerId === playerId,
    ) || finishLyricResult?.penalties.find(
      (penalty) => penalty.playerId === playerId,
    ) || drawImageResult?.penalties.find(
      (penalty) => penalty.playerId === playerId,
    ) || worstAdviceResult?.penalties.find(
      (penalty) => penalty.playerId === playerId,
    ) || captionThisResult?.penalties.find(
      (penalty) => penalty.playerId === playerId,
    ) || chaseResult?.penalties.find(
      (penalty) => penalty.playerId === playerId,
    ) || mostLikelyResult?.penalties.find(
      (penalty) => penalty.playerId === playerId,
    ) || rapidTapResult?.penalties.find(
      (penalty) => penalty.playerId === playerId,
    ) || stopLineResult?.penalties.find(
      (penalty) => penalty.playerId === playerId,
    ) || jumpBlockResult?.penalties.find(
      (penalty) => penalty.playerId === playerId,
    ) || firstTapResult?.penalties.find(
      (penalty) => penalty.playerId === playerId,
    ) || pressReleaseResult?.penalties.find(
      (penalty) => penalty.playerId === playerId,
    );

    if (winner) {
      const didWin = winner.id === playerId;

      return (
        <div className="controller-screen winner-controller-screen">
          <h1>{didWin ? "You Win" : "Game Over"}</h1>

          <p className="winner-message">
            {didWin ? "You landed on Finish" : `${winner.name || "A player"} wins`}
          </p>
        </div>
      );
    }

    if (gamePaused) {
      return (
        <div className="controller-screen">
          <h1>Game Paused</h1>

          <p className="waiting-message">
            Waiting for {pausedPlayers.map((player) => player.name).join(", ") || "player"} to reconnect
          </p>
        </div>
      );
    }

    const activeMiniGame =
      chase ||
      trivia ||
      wordMath ||
      finishLyric ||
      drawImage ||
      worstAdvice ||
      captionThis ||
      mostLikely ||
      rapidTap ||
      stopLine ||
      jumpBlock ||
      firstTap ||
      pressRelease;
    const isMidRoundJoiner =
      Array.isArray(activeMiniGame?.participantIds) &&
      !activeMiniGame.participantIds.includes(playerId);

    if (isMidRoundJoiner) {
      return (
        <div className="controller-screen">
          <h1>You're In</h1>

          <p className="waiting-message">
            Waiting for this round to finish
          </p>
        </div>
      );
    }

    if (chase) {
      const myChasePlayer = chase.players[playerId];
      const isRunner = chase.runnerId === playerId;
      const hasStarted = miniGameNow >= chase.playStartsAt;
      const countdown = Math.max(0, Math.ceil((chase.playStartsAt - miniGameNow) / 1000));

      return (
        <div className="controller-screen chase-controller-screen">
          <h1>{hasStarted ? "Chase" : countdown}</h1>

          <p className="trivia-question">
            {isRunner ? "Run from everyone" : `Catch ${chase.players[chase.runnerId]?.name || "the runner"}`}
          </p>

          <div
            className="chase-swipe-pad"
            onTouchStart={handleChaseTouchStart}
            onTouchEnd={handleChaseTouchEnd}
          >
            <button
              className={chaseDirection === "up" ? "chase-dir active up" : "chase-dir up"}
              disabled={!hasStarted || !myChasePlayer}
              onClick={() => setChaseMoveDirection("up")}
            >
              ↑
            </button>
            <button
              className={chaseDirection === "left" ? "chase-dir active left" : "chase-dir left"}
              disabled={!hasStarted || !myChasePlayer}
              onClick={() => setChaseMoveDirection("left")}
            >
              ←
            </button>
            <div className={isRunner ? "chase-role runner" : "chase-role chaser"}>
              {isRunner ? "RUNNER" : "CHASER"}
            </div>
            <button
              className={chaseDirection === "right" ? "chase-dir active right" : "chase-dir right"}
              disabled={!hasStarted || !myChasePlayer}
              onClick={() => setChaseMoveDirection("right")}
            >
              →
            </button>
            <button
              className={chaseDirection === "down" ? "chase-dir active down" : "chase-dir down"}
              disabled={!hasStarted || !myChasePlayer}
              onClick={() => setChaseMoveDirection("down")}
            >
              ↓
            </button>
          </div>

          <p className="waiting-message">
            {hasStarted ? `Moving ${chaseDirection}` : "Get ready"}
          </p>
        </div>
      );
    }

    if (chaseResult) {
      return (
        <div className="controller-screen trivia-controller-screen">
          <h1>Chase</h1>

          <p className="trivia-question">
            {chaseResult.caught
              ? `${chaseResult.caughtByName} caught ${chaseResult.runnerName}`
              : `${chaseResult.runnerName} escaped`}
          </p>

          <p className="waiting-message">
            {myPenalty
              ? `You move back ${myPenalty.spacesBack}`
              : "You are safe"}
          </p>
        </div>
      );
    }

    if (trivia) {
      const hasAnswered = trivia.answeredPlayerIds.includes(playerId);
      const hasStarted = miniGameNow >= trivia.playStartsAt;
      const countdown = Math.max(0, Math.ceil((trivia.playStartsAt - miniGameNow) / 1000));

      return (
        <div className="controller-screen trivia-controller-screen">
          <h1>{hasStarted ? "Trivia" : countdown}</h1>

          <p className="trivia-question">{trivia.question}</p>

          <div className="controller-answer-list">
            {trivia.choices.map((choice, index) => (
              <button
                className={
                  [
                    "controller-answer",
                    selectedTriviaAnswer === index ? "selected" : "",
                    hasAnswered && selectedTriviaAnswer !== index ? "dimmed" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
                disabled={hasAnswered || !hasStarted}
                key={choice}
                onClick={() => {
                  if (!hasStarted) return;

                  setSelectedTriviaAnswer(index);
                  socket.emit("submitTriviaAnswer", {
                    triviaId: trivia.id,
                    choiceIndex: index,
                  });
                }}
              >
                {choice}
              </button>
            ))}
          </div>

          {hasAnswered && (
            <p className="waiting-message">
              Answer locked in
            </p>
          )}
          {!hasStarted && (
            <p className="waiting-message">
              Get ready
            </p>
          )}
        </div>
      );
    }

    if (triviaResult) {
      return (
        <div className="controller-screen trivia-controller-screen">
          <h1>Answer</h1>

          <p className="trivia-question">
            {triviaResult.choices[triviaResult.correctIndex]}
          </p>

          <p className="waiting-message">
            {myPenalty
              ? `You move back ${myPenalty.spacesBack}`
              : "You got it right"}
          </p>
        </div>
      );
    }

    if (wordMath) {
      const hasAnswered = wordMath.answeredPlayerIds.includes(playerId);
      const hasStarted = miniGameNow >= wordMath.playStartsAt;
      const countdown = Math.max(0, Math.ceil((wordMath.playStartsAt - miniGameNow) / 1000));

      return (
        <div className="controller-screen trivia-controller-screen">
          <h1>{hasStarted ? "Word Math" : countdown}</h1>

          <p className="trivia-question">{wordMath.question}</p>

          <div className="controller-answer-list">
            {wordMath.choices.map((choice, index) => (
              <button
                className={
                  [
                    "controller-answer",
                    selectedWordMathAnswer === index ? "selected" : "",
                    hasAnswered && selectedWordMathAnswer !== index ? "dimmed" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
                disabled={hasAnswered || !hasStarted}
                key={choice}
                onClick={() => {
                  if (!hasStarted) return;

                  setSelectedWordMathAnswer(index);
                  socket.emit("submitWordMathAnswer", {
                    wordMathId: wordMath.id,
                    choiceIndex: index,
                  });
                }}
              >
                {choice}
              </button>
            ))}
          </div>

          {hasAnswered && (
            <p className="waiting-message">
              Answer locked in
            </p>
          )}
          {!hasStarted && (
            <p className="waiting-message">
              Get ready
            </p>
          )}
        </div>
      );
    }

    if (wordMathResult) {
      return (
        <div className="controller-screen trivia-controller-screen">
          <h1>Word Math</h1>

          <p className="trivia-question">
            Answer: {wordMathResult.choices[wordMathResult.correctIndex]}
          </p>

          <p className="waiting-message">
            {myPenalty
              ? `You move back ${myPenalty.spacesBack}`
              : "You got it right"}
          </p>
        </div>
      );
    }

    if (finishLyric) {
      const hasAnswered = finishLyric.answeredPlayerIds.includes(playerId);
      const hasStarted = miniGameNow >= finishLyric.playStartsAt;
      const countdown = Math.max(0, Math.ceil((finishLyric.playStartsAt - miniGameNow) / 1000));

      return (
        <div className="controller-screen trivia-controller-screen">
          <h1>{hasStarted ? "Lyrics" : countdown}</h1>

          <p className="trivia-question">{finishLyric.prompt}</p>

          <div className="controller-answer-list">
            {finishLyric.choices.map((choice, index) => (
              <button
                className={
                  [
                    "controller-answer",
                    selectedFinishLyricAnswer === index ? "selected" : "",
                    hasAnswered && selectedFinishLyricAnswer !== index ? "dimmed" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
                disabled={hasAnswered || !hasStarted}
                key={choice}
                onClick={() => {
                  if (!hasStarted) return;

                  setSelectedFinishLyricAnswer(index);
                  socket.emit("submitFinishLyricAnswer", {
                    finishLyricId: finishLyric.id,
                    choiceIndex: index,
                  });
                }}
              >
                {choice}
              </button>
            ))}
          </div>

          {hasAnswered && (
            <p className="waiting-message">
              Answer locked in
            </p>
          )}
          {!hasStarted && (
            <p className="waiting-message">
              Get ready
            </p>
          )}
        </div>
      );
    }

    if (finishLyricResult) {
      return (
        <div className="controller-screen trivia-controller-screen">
          <h1>Lyrics</h1>

          <p className="trivia-question">
            Next phrase: {finishLyricResult.choices[finishLyricResult.correctIndex]}
          </p>

          <p className="waiting-message">
            {myPenalty
              ? `You move back ${myPenalty.spacesBack}`
              : "You got it right"}
          </p>
        </div>
      );
    }

    if (drawImage) {
      const hasStarted = miniGameNow >= drawImage.playStartsAt;
      const countdown = Math.max(0, Math.ceil((drawImage.playStartsAt - miniGameNow) / 1000));
      const hasVoted = drawImage.votedPlayerIds.includes(playerId);
      const voteChoices = drawImage.submissions.filter(
        (submission) => submission.playerId !== playerId,
      );

      if (drawImage.stage === "voting") {
        return (
          <div className="controller-screen draw-controller-screen">
            <h1>Vote Best</h1>

            <p className="trivia-question">{drawImage.prompt}</p>

            <div className="draw-vote-list">
              {voteChoices.map((submission, index) => (
                <button
                  className={
                    [
                      "draw-vote-card",
                      selectedDrawVote === submission.playerId ? "selected" : "",
                      hasVoted && selectedDrawVote !== submission.playerId ? "dimmed" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")
                  }
                  disabled={hasVoted}
                  key={submission.playerId}
                  onClick={() => {
                    setSelectedDrawVote(submission.playerId);
                    socket.emit("submitDrawImageVote", {
                      drawImageId: drawImage.id,
                      votedPlayerId: submission.playerId,
                    });
                  }}
                >
                  <img src={submission.image} alt={`Anonymous drawing ${index + 1}`} />
                  <span>Drawing {index + 1}</span>
                </button>
              ))}
            </div>

            {hasVoted && (
              <p className="waiting-message">
                Vote locked in
              </p>
            )}
            {voteChoices.length === 0 && (
              <p className="waiting-message">
                Waiting for results
              </p>
            )}
          </div>
        );
      }

      return (
        <div className="controller-screen draw-controller-screen">
          <h1>{hasStarted ? "Draw" : countdown}</h1>

          <p className="trivia-question">{drawImage.prompt}</p>

          <canvas
            ref={drawCanvasRef}
            className="draw-canvas"
            onPointerDown={handleDrawPointerDown}
            onPointerMove={handleDrawPointerMove}
            onPointerUp={handleDrawPointerUp}
            onPointerCancel={handleDrawPointerUp}
          />

          <div className="draw-actions">
            <button
              className="draw-action-button"
              disabled={!hasStarted || drawImageSubmitted}
              onClick={clearDrawing}
            >
              Clear
            </button>

            <button
              className="draw-action-button primary"
              disabled={!hasStarted || drawImageSubmitted}
              onClick={submitCurrentDrawing}
            >
              Submit
            </button>
          </div>

          {drawImageSubmitted && (
            <p className="waiting-message">
              Drawing submitted
            </p>
          )}
          {!hasStarted && (
            <p className="waiting-message">
              Get ready
            </p>
          )}
        </div>
      );
    }

    if (drawImageResult) {
      return (
        <div className="controller-screen trivia-controller-screen">
          <h1>Draw</h1>

          <p className="trivia-question">
            {drawImageResult.prompt}
          </p>

          <p className="waiting-message">
            {myPenalty
              ? `You move back ${myPenalty.spacesBack}`
              : "You are safe"}
          </p>
        </div>
      );
    }

    if (worstAdvice) {
      const hasSubmitted = worstAdvice.submittedPlayerIds.includes(playerId) || worstAdviceSubmitted;
      const hasVoted = worstAdvice.votedPlayerIds.includes(playerId);
      const voteChoices = worstAdvice.submissions.filter(
        (submission) => submission.playerId !== playerId,
      );

      if (worstAdvice.stage === "voting") {
        return (
          <div className="controller-screen worst-advice-controller-screen">
            <h1>Vote Best</h1>

            <p className="trivia-question">{worstAdvice.prompt}</p>

            <div className="advice-vote-list">
              {voteChoices.map((submission, index) => (
                <button
                  className={
                    [
                      "advice-vote-card",
                      selectedWorstAdviceVote === submission.playerId ? "selected" : "",
                      hasVoted && selectedWorstAdviceVote !== submission.playerId ? "dimmed" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")
                  }
                  disabled={hasVoted}
                  key={submission.playerId}
                  onClick={() => {
                    setSelectedWorstAdviceVote(submission.playerId);
                    socket.emit("submitWorstAdviceVote", {
                      worstAdviceId: worstAdvice.id,
                      votedPlayerId: submission.playerId,
                    });
                  }}
                >
                  <span>Answer {index + 1}</span>
                  <strong>{submission.answer}</strong>
                </button>
              ))}
            </div>

            {hasVoted && <p className="waiting-message">Vote locked in</p>}
          </div>
        );
      }

      return (
        <div className="controller-screen worst-advice-controller-screen">
          <h1>Worst Advice</h1>

          <p className="trivia-question">{worstAdvice.prompt}</p>

          <textarea
            className="worst-advice-input"
            disabled={hasSubmitted}
            maxLength={180}
            placeholder="Type the worst advice..."
            value={worstAdviceAnswer}
            onChange={(event) => {
              setWorstAdviceAnswer(event.target.value);
            }}
          />

          <button
            className="advice-submit-button"
            disabled={hasSubmitted || !worstAdviceAnswer.trim()}
            onClick={() => {
              setWorstAdviceSubmitted(true);
              socket.emit("submitWorstAdviceAnswer", {
                worstAdviceId: worstAdvice.id,
                answer: worstAdviceAnswer,
              });
            }}
          >
            SUBMIT
          </button>

          {hasSubmitted && <p className="waiting-message">Advice locked in</p>}
        </div>
      );
    }

    if (worstAdviceResult) {
      return (
        <div className="controller-screen trivia-controller-screen">
          <h1>Worst Advice</h1>

          <p className="trivia-question">{worstAdviceResult.prompt}</p>

          <p className="waiting-message">
            {myPenalty
              ? `You move back ${myPenalty.spacesBack}`
              : "You are safe"}
          </p>
        </div>
      );
    }

    if (captionThis) {
      const isPhotoPlayer = captionThis.photoPlayerId === playerId;
      const hasSubmittedCaption =
        captionThis.submittedPlayerIds.includes(playerId) || captionThisSubmitted;
      const hasVoted = captionThis.votedPlayerIds.includes(playerId);
      const voteChoices = captionThis.submissions.filter(
        (submission) => submission.playerId !== playerId,
      );

      if (captionThis.stage === "photo") {
        return (
          <div className="controller-screen caption-controller-screen">
            <h1>Caption This</h1>

            {isPhotoPlayer ? (
              <>
                <p className="trivia-question">Choose a photo from your phone</p>

                <label className="caption-photo-picker">
                  <input
                    accept="image/*"
                    disabled={captionPhotoSubmitted}
                    onChange={handleCaptionPhotoChange}
                    type="file"
                  />
                  {captionPhotoSubmitted ? "PHOTO SENT" : "PICK PHOTO"}
                </label>
              </>
            ) : (
              <p className="waiting-message">
                {captionThis.photoPlayerName} is choosing a photo
              </p>
            )}
          </div>
        );
      }

      if (captionThis.stage === "voting") {
        return (
          <div className="controller-screen caption-controller-screen">
            <h1>Vote Best</h1>

            <img
              className="caption-controller-photo"
              src={captionThis.photo}
              alt="Caption this"
            />

            <div className="advice-vote-list caption-vote-list">
              {voteChoices.map((submission, index) => (
                <button
                  className={
                    [
                      "advice-vote-card",
                      selectedCaptionVote === submission.playerId ? "selected" : "",
                      hasVoted && selectedCaptionVote !== submission.playerId ? "dimmed" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")
                  }
                  disabled={hasVoted}
                  key={submission.playerId}
                  onClick={() => {
                    setSelectedCaptionVote(submission.playerId);
                    socket.emit("submitCaptionThisVote", {
                      captionThisId: captionThis.id,
                      votedPlayerId: submission.playerId,
                    });
                  }}
                >
                  <span>Caption {index + 1}</span>
                  <strong>{submission.caption}</strong>
                </button>
              ))}
            </div>

            {hasVoted && <p className="waiting-message">Vote locked in</p>}
            {voteChoices.length === 0 && (
              <p className="waiting-message">Waiting for results</p>
            )}
          </div>
        );
      }

      return (
        <div className="controller-screen caption-controller-screen">
          <h1>Caption This</h1>

          <img
            className="caption-controller-photo"
            src={captionThis.photo}
            alt="Caption this"
          />

          <textarea
            className="worst-advice-input caption-input"
            disabled={hasSubmittedCaption}
            maxLength={160}
            placeholder="Write your caption..."
            value={captionThisCaption}
            onChange={(event) => {
              setCaptionThisCaption(event.target.value);
            }}
          />

          <button
            className="advice-submit-button"
            disabled={hasSubmittedCaption || !captionThisCaption.trim()}
            onClick={() => {
              setCaptionThisSubmitted(true);
              socket.emit("submitCaptionThisCaption", {
                captionThisId: captionThis.id,
                caption: captionThisCaption,
              });
            }}
          >
            SUBMIT
          </button>

          {hasSubmittedCaption && <p className="waiting-message">Caption locked in</p>}
        </div>
      );
    }

    if (captionThisResult) {
      return (
        <div className="controller-screen trivia-controller-screen">
          <h1>Caption This</h1>

          <img
            className="caption-controller-photo"
            src={captionThisResult.photo}
            alt="Caption this result"
          />

          <p className="waiting-message">
            {myPenalty
              ? `You move back ${myPenalty.spacesBack}`
              : "You are safe"}
          </p>
        </div>
      );
    }

    if (mostLikely) {
      const hasVoted = mostLikely.answeredPlayerIds.includes(playerId);
      const hasStarted = miniGameNow >= mostLikely.playStartsAt;
      const countdown = Math.max(0, Math.ceil((mostLikely.playStartsAt - miniGameNow) / 1000));

      return (
        <div className="controller-screen trivia-controller-screen">
          <h1>{hasStarted ? "Most Likely" : countdown}</h1>

          <p className="trivia-question">{mostLikely.prompt}</p>

          <div className="controller-answer-list">
            {mostLikely.choices.map((choice) => (
              <button
                className={
                  [
                    "controller-answer",
                    selectedMostLikelyVote === choice.id ? "selected" : "",
                    hasVoted && selectedMostLikelyVote !== choice.id ? "dimmed" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
                disabled={hasVoted || !hasStarted}
                key={choice.id}
                onClick={() => {
                  if (!hasStarted) return;

                  setSelectedMostLikelyVote(choice.id);
                  socket.emit("submitMostLikelyVote", {
                    mostLikelyId: mostLikely.id,
                    votedPlayerId: choice.id,
                  });
                }}
              >
                {choice.name}
              </button>
            ))}
          </div>

          {hasVoted && (
            <p className="waiting-message">
              Vote locked in
            </p>
          )}
          {!hasStarted && (
            <p className="waiting-message">
              Get ready
            </p>
          )}
        </div>
      );
    }

    if (mostLikelyResult) {
      return (
        <div className="controller-screen trivia-controller-screen">
          <h1>Most Likely</h1>

          <p className="trivia-question">{mostLikelyResult.prompt}</p>

          <p className="waiting-message">
            {myPenalty
              ? `You move back ${myPenalty.spacesBack}`
              : "You are safe"}
          </p>
        </div>
      );
    }

    if (rapidTap) {
      const hasStarted = miniGameNow >= rapidTap.playStartsAt;
      const countdown = Math.max(0, Math.ceil((rapidTap.playStartsAt - miniGameNow) / 1000));

      return (
        <div className="controller-screen rapid-tap-controller-screen">
          <h1>{hasStarted ? "Rapid Tap" : countdown}</h1>

          <p className="tap-count">{tapCount}</p>

          <div className="rapid-tap-playfield">
            <button
              className="tap-button"
              disabled={rapidTapSubmitted || !hasStarted}
              style={{
                left: `${rapidTapTarget.x}%`,
                top: `${rapidTapTarget.y}%`,
              }}
              onContextMenu={(event) => {
                event.preventDefault();
              }}
              onPointerDown={(event) => {
                event.preventDefault();

                if (!hasStarted || rapidTapSubmitted || Date.now() >= rapidTap.endsAt) return;

                const nextTapCount = tapCountRef.current + 1;

                tapCountRef.current = nextTapCount;
                setTapCount(nextTapCount);
                setRapidTapTarget(getRandomRapidTapTarget());
              }}
            >
              TAP
            </button>
          </div>

          {rapidTapSubmitted && (
            <p className="waiting-message">
              Final score sent
            </p>
          )}
        </div>
      );
    }

    if (rapidTapResult) {
      return (
        <div className="controller-screen trivia-controller-screen">
          <h1>Rapid Tap</h1>

          <p className="trivia-question">
            Your score: {rapidTapResult.scores[playerId] || 0}
          </p>

          <p className="waiting-message">
            {myPenalty
              ? `You move back ${myPenalty.spacesBack}`
              : "You are safe"}
          </p>
        </div>
      );
    }

    if (stopLine) {
      const hasStarted = miniGameNow >= stopLine.playStartsAt;
      const countdown = Math.max(0, Math.ceil((stopLine.playStartsAt - miniGameNow) / 1000));

      return (
        <div className="controller-screen stop-line-controller-screen">
          <h1>{hasStarted ? "Stop the Line" : countdown}</h1>

          <div className="stop-line-track">
            <span className="stop-line-target" />
            <span
              className="stop-line-marker"
              style={{
                top: `${100 - stopLinePosition}%`,
              }}
            />
          </div>

          {stopLineDistance !== null && (
            <p className="waiting-message">
              Missed by {stopLineDistance.toFixed(1)}
            </p>
          )}

          <button
            className="stop-line-button"
            disabled={stopLineSubmitted || !hasStarted}
            onPointerDown={() => {
              if (stopLineSubmitted || !hasStarted) return;

              const elapsed = Math.max(0, Date.now() - stopLine.playStartsAt);
              const cycleMs = 1600;
              const progress = (elapsed % cycleMs) / cycleMs;
              const position = progress <= 0.5 ? progress * 200 : (1 - progress) * 200;
              const distance = Math.abs(position - stopLine.target);

              stopLineSubmittedRef.current = true;
              setStopLineSubmitted(true);
              setStopLineDistance(distance);
              setStopLinePosition(position);
              socket.emit("updateStopLineResult", {
                stopLineId: stopLine.id,
                position,
                distance,
              });
              socket.emit("submitStopLineResult", {
                stopLineId: stopLine.id,
                position,
                distance,
              });
            }}
          >
            STOP
          </button>
        </div>
      );
    }

    if (stopLineResult) {
      return (
        <div className="controller-screen trivia-controller-screen">
          <h1>Stop the Line</h1>

          <p className="trivia-question">
            Your miss: {(stopLineResult.results[playerId]?.distance ?? 100).toFixed(1)}
          </p>

          <p className="waiting-message">
            {myPenalty
              ? `You move back ${myPenalty.spacesBack}`
              : "You are safe"}
          </p>
        </div>
      );
    }

    if (jumpBlock) {
      const jumpCountdown = Math.max(0, Math.ceil((jumpBlock.playStartsAt - miniGameNow) / 1000));

      return (
        <div className="controller-screen jump-block-controller-screen">
          <h1>Jump Blocks</h1>

          <p className="jump-score">
            {jumpBlockScene.playing ? jumpBlockScore : jumpCountdown}
          </p>

          <div className="jump-stage" aria-hidden="true">
            <span className="jump-ground" />
            <span
              className="jump-player"
              style={{
                bottom: `calc(26% + ${jumpBlockScene.playerY}%)`,
              }}
            />
            <span
              className="jump-block"
              style={{
                left: `${jumpBlockScene.blockX}%`,
                height: `${jumpBlockScene.blockHeight}%`,
                width: `${jumpBlockScene.blockWidth}%`,
              }}
            />
          </div>

          <p className="jump-difficulty">
            {jumpBlockScene.playing
              ? `Speed ${jumpBlockScene.difficulty.toFixed(1)}x`
              : "Get ready"}
          </p>

          <button
            className="jump-button"
            disabled={jumpBlockSubmitted || !jumpBlockScene.playing}
            onContextMenu={(event) => {
              event.preventDefault();
            }}
            onPointerDown={(event) => {
              event.preventDefault();

              if (
                jumpBlockSubmitted ||
                !jumpBlockScene.playing ||
                Date.now() >= jumpBlock.endsAt
              ) {
                return;
              }

              jumpRequestedRef.current = true;
            }}
          >
            JUMP
          </button>

          {jumpBlockSubmitted && (
            <p className="waiting-message">
              Final score sent
            </p>
          )}
        </div>
      );
    }

    if (jumpBlockResult) {
      return (
        <div className="controller-screen trivia-controller-screen">
          <h1>Jump Blocks</h1>

          <p className="trivia-question">
            Your score: {jumpBlockResult.scores[playerId] || 0}
          </p>

          <p className="waiting-message">
            {myPenalty
              ? `You move back ${myPenalty.spacesBack}`
              : "You are safe"}
          </p>
        </div>
      );
    }

    if (firstTap) {
      const hasStarted = miniGameNow >= firstTap.playStartsAt;

      return (
        <div className="controller-screen first-tap-controller-screen">
          <h1>{hasStarted ? "Tap Now" : "Wait"}</h1>

          <button
            className={hasStarted ? "first-tap-button go" : "first-tap-button wait"}
            disabled={!hasStarted || firstTapSubmitted}
            onPointerDown={() => {
              if (!hasStarted || firstTapSubmitted || Date.now() >= firstTap.endsAt) return;

              setFirstTapSubmitted(true);
              socket.emit("submitFirstTap", {
                firstTapId: firstTap.id,
              });
            }}
          >
            {hasStarted ? "PRESS" : "WAIT"}
          </button>

          <p className="waiting-message">
            {firstTapSubmitted
              ? "Press locked in"
              : hasStarted
                ? "Last press loses"
                : "Wait for green"}
          </p>
        </div>
      );
    }

    if (firstTapResult) {
      return (
        <div className="controller-screen trivia-controller-screen">
          <h1>First Tap</h1>

          <p className="trivia-question">
            {myPenalty ? "You were last" : "You are safe"}
          </p>

          <p className="waiting-message">
            {myPenalty
              ? `You move back ${myPenalty.spacesBack}`
              : "Nice reaction"}
          </p>
        </div>
      );
    }

    if (pressRelease) {
      const hasStarted = miniGameNow >= pressRelease.playStartsAt;
      const countdown = Math.max(0, Math.ceil((pressRelease.playStartsAt - miniGameNow) / 1000));

      return (
        <div className="controller-screen press-release-controller-screen">
          <h1>{hasStarted ? "Press Hold" : countdown}</h1>

          <button
            className={pressReleaseHolding ? "press-release-button holding" : "press-release-button"}
            disabled={!hasStarted || pressReleaseSubmitted}
            onPointerDown={handlePressReleaseDown}
            onPointerUp={handlePressReleaseUp}
            onPointerCancel={handlePressReleaseUp}
            onPointerLeave={handlePressReleaseUp}
          >
            {pressReleaseSubmitted
              ? "LOCKED"
              : pressReleaseHolding
              ? "HOLD..."
              : "HOLD"}
          </button>

          <p className="waiting-message">
            {pressReleaseSubmitted
              ? `You held ${(Number(pressReleaseHeldMs || 0) / 1000).toFixed(2)}s`
              : hasStarted
              ? "Release when it feels right"
              : "Get ready"}
          </p>
        </div>
      );
    }

    if (pressReleaseResult) {
      const myResult = pressReleaseResult.results[playerId];

      return (
        <div className="controller-screen trivia-controller-screen">
          <h1>Press Hold</h1>

          <p className="trivia-question">
            Target: {(pressReleaseResult.targetMs / 1000).toFixed(1)}s
            {myResult ? ` | You: ${(myResult.heldMs / 1000).toFixed(2)}s` : ""}
          </p>

          <p className="waiting-message">
            {myPenalty
              ? `You move back ${myPenalty.spacesBack}`
              : "You are safe"}
          </p>
        </div>
      );
    }

    return (
      <div className="controller-screen">
        <h1>{gamePaused ? "Game Paused" : isMyTurn ? "Your Turn" : "Waiting..."}</h1>

        {myLastRoll && (
          <div className="roll-result dice-controller-result">
            <DiceFace key={myLastRoll.rollId} roll={myLastRoll.roll} />
            <span>You rolled a {myLastRoll.roll}</span>
          </div>
        )}

        {gamePaused ? (
          <p className="waiting-message">
            Waiting for {pausedPlayers.map((player) => player.name).join(", ") || "player"} to reconnect
          </p>
        ) : isMyTurn ? (
          <button
            className="roll-button"
            onClick={() => {
              socket.emit("rollDice");
            }}
          >
            ROLL DICE
          </button>
        ) : (
          <p className="waiting-message">
            Another player is taking their turn
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="controller-screen">
      <h1>{name}</h1>

      <p>Lobby {lobbyCode}</p>

      <button
        className={ready ? "ready-button active" : "ready-button"}
        onClick={() => {
          socket.emit("toggleReady");
        }}
      >
        {ready ? "READY" : "NOT READY"}
      </button>
    </div>
  );
  };

  return (
    <>
      {renderControllerContent()}
      {joined && settingsOverlay}
    </>
  );
}

export default ControllerPage;
