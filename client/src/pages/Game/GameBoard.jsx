import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getServerOrigin } from "../../serverOrigin";
import "./GameBoard.css";

const BOARD_COLUMNS = 10;
const BOARD_ROWS = 9;
const SERVER_ORIGIN = getServerOrigin();
const MOVEMENT_POP_URL = `${SERVER_ORIGIN}/music/${encodeURIComponent("universfield-bubble-pop-04-323580.mp3")}`;
const MOVE_BACK_SOUND_URL = `${SERVER_ORIGIN}/music/${encodeURIComponent("freesound_community-wah-ah-108289.mp3")}`;
const DRAWING_SONG_URL = `${SERVER_ORIGIN}/music/${encodeURIComponent("drawing song.mp3")}`;
const DICE_ROLL_SOUND_URL = `${SERVER_ORIGIN}/music/${encodeURIComponent("dice roll.mp3")}`;
const DICE_FACE_URLS = {
  1: `${SERVER_ORIGIN}/images/${encodeURIComponent("dice-six-faces-one.png")}`,
  2: `${SERVER_ORIGIN}/images/${encodeURIComponent("dice-six-faces-two.png")}`,
  3: `${SERVER_ORIGIN}/images/${encodeURIComponent("dice-six-faces-three.png")}`,
  4: `${SERVER_ORIGIN}/images/${encodeURIComponent("dice-six-faces-four.png")}`,
  5: `${SERVER_ORIGIN}/images/${encodeURIComponent("dice-six-faces-five.png")}`,
  6: `${SERVER_ORIGIN}/images/${encodeURIComponent("dice-six-faces-six.png")}`,
};
const PLAYER_COLORS = [
  "#2ecc71",
  "#3498db",
  "#f1c40f",
  "#e74c3c",
  "#9b59b6",
  "#1abc9c",
];
const TRIVIA_TILE_POSITIONS = new Set([6, 14, 23, 31, 42, 55, 67, 76, 88]);
const MOST_LIKELY_TILE_POSITIONS = new Set([9, 18, 27, 36, 49, 58, 72, 83]);
const RAPID_TAP_TILE_POSITIONS = new Set([21, 61, 85]);
const STOP_LINE_TILE_POSITIONS = new Set([2, 16, 29, 44, 53, 64, 79]);
const JUMP_BLOCK_TILE_POSITIONS = new Set([7, 25, 34, 47, 57, 68, 81]);
const FIRST_TAP_TILE_POSITIONS = new Set([11, 37, 73]);
const PRESS_RELEASE_TILE_POSITIONS = new Set([12, 60]);
const WORD_MATH_TILE_POSITIONS = new Set([19, 48, 78]);
const FINISH_LYRIC_TILE_POSITIONS = new Set([33, 69]);
const DRAW_IMAGE_TILE_POSITIONS = new Set([41, 86]);
const WORST_ADVICE_TILE_POSITIONS = new Set([24, 62]);
const CAPTION_THIS_TILE_POSITIONS = new Set([45, 75]);
const CHASE_TILE_POSITIONS = new Set([52]);

function getPlayerInitial(name) {
  return name?.trim().charAt(0).toUpperCase() || "?";
}

function getTileCoordinates(position) {
  const safePosition = Math.max(0, Math.min(position, BOARD_COLUMNS * BOARD_ROWS - 1));
  const row = Math.floor(safePosition / BOARD_COLUMNS);
  const columnInRow = safePosition % BOARD_COLUMNS;
  const column = row % 2 === 0 ? columnInRow : BOARD_COLUMNS - 1 - columnInRow;

  return { row, column };
}

function getSnakePositionFromGridIndex(index) {
  const row = Math.floor(index / BOARD_COLUMNS);
  const column = index % BOARD_COLUMNS;
  const columnInPath = row % 2 === 0 ? column : BOARD_COLUMNS - 1 - column;

  return row * BOARD_COLUMNS + columnInPath;
}

function isMiniGameStarted(miniGame) {
  return !miniGame?.playStartsAt || Date.now() >= miniGame.playStartsAt;
}

function getStartCountdown(miniGame) {
  return Math.max(0, Math.ceil(((miniGame?.playStartsAt || 0) - Date.now()) / 1000));
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

function GameBoard({
  players,
  positions,
  currentPlayerId,
  lastRoll,
  trivia,
  triviaResult,
  mostLikely,
  mostLikelyResult,
  rapidTap,
  rapidTapResult,
  stopLine,
  stopLineResult,
  jumpBlock,
  jumpBlockResult,
  firstTap,
  firstTapResult,
  pressRelease,
  pressReleaseResult,
  wordMath,
  wordMathResult,
  finishLyric,
  finishLyricResult,
  drawImage,
  drawImageResult,
  worstAdvice,
  worstAdviceResult,
  captionThis,
  captionThisResult,
  chase,
  chaseResult,
  paused,
  pausedPlayers,
  winner,
  onRollMovementComplete,
  onRestart,
  onQuit,
}) {
  const tileCount = BOARD_COLUMNS * BOARD_ROWS;
  const [displayedPositions, setDisplayedPositions] = useState({});
  const [movingPlayerId, setMovingPlayerId] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [musicTracks, setMusicTracks] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicMessage, setMusicMessage] = useState("");
  const audioRef = useRef(null);
  const movementAudioRef = useRef(null);
  const moveBackAudioRef = useRef(null);
  const diceRollAudioRef = useRef(null);
  const drawMusicRef = useRef(null);
  const resumeMusicAfterDrawRef = useRef(false);

  const currentTrack = musicTracks[currentTrackIndex];

  const playMovementPop = useCallback(() => {
    if (!movementAudioRef.current) {
      movementAudioRef.current = new Audio(MOVEMENT_POP_URL);
      movementAudioRef.current.volume = 0.55;
      movementAudioRef.current.preload = "auto";
    }

    const pop = movementAudioRef.current.cloneNode();
    pop.volume = movementAudioRef.current.volume;
    pop.play().catch(() => {});
  }, []);

  const playMoveBackSound = useCallback(() => {
    if (!moveBackAudioRef.current) {
      moveBackAudioRef.current = new Audio(MOVE_BACK_SOUND_URL);
      moveBackAudioRef.current.volume = 0.7;
      moveBackAudioRef.current.preload = "auto";
    }

    const wah = moveBackAudioRef.current.cloneNode();
    wah.volume = moveBackAudioRef.current.volume;
    wah.play().catch(() => {});
  }, []);

  const playDiceRollSound = useCallback(() => {
    if (!diceRollAudioRef.current) {
      diceRollAudioRef.current = new Audio(DICE_ROLL_SOUND_URL);
      diceRollAudioRef.current.volume = 0.8;
      diceRollAudioRef.current.preload = "auto";
    }

    const diceRollSound = diceRollAudioRef.current.cloneNode();
    diceRollSound.volume = diceRollAudioRef.current.volume;
    diceRollSound.play().catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch(`${SERVER_ORIGIN}/api/music`)
      .then((response) => (response.ok ? response.json() : []))
      .then((tracks) => {
        if (cancelled) return;

        setMusicTracks(Array.isArray(tracks) ? tracks : []);
        setMusicMessage(
          Array.isArray(tracks) && tracks.length > 0
            ? ""
            : "No songs found",
        );
      })
      .catch(() => {
        if (!cancelled) {
          setMusicMessage("Music unavailable");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!musicPlaying || musicTracks.length === 0) return;

    audioRef.current?.play().catch(() => {
      setMusicPlaying(false);
      setMusicMessage("Tap play to start music");
    });
  }, [currentTrackIndex, musicPlaying, musicTracks.length]);

  const handleToggleMusic = () => {
    if (!currentTrack || !audioRef.current) return;

    if (musicPlaying) {
      audioRef.current.pause();
      setMusicPlaying(false);
      return;
    }

    audioRef.current
      .play()
      .then(() => {
        setMusicPlaying(true);
        setMusicMessage("");
      })
      .catch(() => {
        setMusicMessage("Tap play to start music");
      });
  };

  const handleNextTrack = () => {
    if (musicTracks.length === 0) return;

    setCurrentTrackIndex((index) => (index + 1) % musicTracks.length);
  };

  useEffect(() => {
    if (!drawImage) return;

    const backgroundAudio = audioRef.current;
    const drawAudio = new Audio(DRAWING_SONG_URL);
    let cleanedUp = false;

    resumeMusicAfterDrawRef.current = musicPlaying;

    if (backgroundAudio && !backgroundAudio.paused) {
      backgroundAudio.pause();
    }

    drawAudio.volume = 0.82;
    drawAudio.loop = true;
    drawMusicRef.current = drawAudio;

    const startDrawMusic = () => {
      if (cleanedUp) return;

      if (Number.isFinite(drawAudio.duration) && drawAudio.duration > 20) {
        drawAudio.currentTime = Math.random() * Math.max(1, drawAudio.duration - 15);
      }

      drawAudio.play().catch(() => {
        setMusicMessage("Tap play to allow drawing song");
      });
    };

    drawAudio.addEventListener("loadedmetadata", startDrawMusic, { once: true });
    drawAudio.load();
    startDrawMusic();

    return () => {
      cleanedUp = true;
      drawAudio.pause();
      drawAudio.src = "";

      if (drawMusicRef.current === drawAudio) {
        drawMusicRef.current = null;
      }

      if (resumeMusicAfterDrawRef.current && audioRef.current) {
        audioRef.current.play().catch(() => {
          setMusicPlaying(false);
          setMusicMessage("Tap play to restart music");
        });
      }
    };
  }, [drawImage?.id]);

  useEffect(() => {
    setDisplayedPositions((currentPositions) => {
      const nextPositions = {};

      for (const player of players) {
        nextPositions[player.id] =
          lastRoll || triviaResult
          || mostLikelyResult
          || rapidTapResult
          || stopLineResult
          || jumpBlockResult
          || firstTapResult
          || pressReleaseResult
          || wordMathResult
          || finishLyricResult
          || drawImageResult
          || worstAdviceResult
          || captionThisResult
          || chaseResult
            ? currentPositions[player.id] ?? positions[player.id] ?? 0
            : positions[player.id] ?? 0;
      }

      return nextPositions;
    });
  }, [captionThisResult, chaseResult, drawImageResult, finishLyricResult, firstTapResult, jumpBlockResult, lastRoll, mostLikelyResult, players, positions, pressReleaseResult, rapidTapResult, stopLineResult, triviaResult, wordMathResult, worstAdviceResult]);

  useEffect(() => {
    if (!lastRoll) return;

    playDiceRollSound();

    const { playerId, fromPosition, path } = lastRoll;
    const timers = [];

    setMovingPlayerId(playerId);
    setDisplayedPositions((currentPositions) => ({
      ...currentPositions,
      [playerId]: fromPosition,
    }));

    path.forEach((position, index) => {
      timers.push(
        window.setTimeout(() => {
          playMovementPop();
          setDisplayedPositions((currentPositions) => ({
            ...currentPositions,
            [playerId]: position,
          }));
        }, (index + 1) * 280),
      );
    });

    timers.push(
      window.setTimeout(() => {
        setMovingPlayerId("");
        onRollMovementComplete(lastRoll.rollId);
      }, (path.length + 1) * 280),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [lastRoll, onRollMovementComplete, playDiceRollSound, playMovementPop]);

  useEffect(() => {
    const result = triviaResult || mostLikelyResult || rapidTapResult || stopLineResult || jumpBlockResult || firstTapResult || pressReleaseResult || wordMathResult || finishLyricResult || drawImageResult || worstAdviceResult || captionThisResult || chaseResult;

    if (!result) return;

    const timers = [];

    result.penalties.forEach((penalty) => {
      const path = [];

      for (
        let position = penalty.fromPosition - 1;
        position >= penalty.toPosition;
        position -= 1
      ) {
        path.push(position);
      }

      playMoveBackSound();
      setMovingPlayerId(penalty.playerId);
      setDisplayedPositions((currentPositions) => ({
        ...currentPositions,
        [penalty.playerId]: penalty.fromPosition,
      }));

      path.forEach((position, index) => {
        timers.push(
        window.setTimeout(() => {
            playMovementPop();
            setDisplayedPositions((currentPositions) => ({
              ...currentPositions,
              [penalty.playerId]: position,
            }));
          }, (index + 1) * 240),
        );
      });
    });

    timers.push(
      window.setTimeout(() => {
        setMovingPlayerId("");
      }, 1200),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [captionThisResult, chaseResult, drawImageResult, finishLyricResult, firstTapResult, jumpBlockResult, mostLikelyResult, playMoveBackSound, playMovementPop, pressReleaseResult, rapidTapResult, stopLineResult, triviaResult, wordMathResult, worstAdviceResult]);

  useEffect(() => {
    const activeMiniGame = trivia || mostLikely || rapidTap || stopLine || jumpBlock || firstTap || pressRelease || wordMath || finishLyric || drawImage || worstAdvice || captionThis || chase;

    if (!activeMiniGame) return;

    const updateSecondsLeft = () => {
      setSecondsLeft(
        Math.max(0, Math.ceil((activeMiniGame.endsAt - Date.now()) / 1000)),
      );
    };

    updateSecondsLeft();
    const timer = window.setInterval(updateSecondsLeft, 250);

    return () => {
      window.clearInterval(timer);
    };
  }, [captionThis, chase, drawImage, finishLyric, firstTap, jumpBlock, mostLikely, pressRelease, rapidTap, stopLine, trivia, wordMath, worstAdvice]);

  const playersWithBoardPosition = useMemo(() => {
    const tileCounts = {};

    return players.map((player, playerIndex) => {
      const position = displayedPositions[player.id] ?? positions[player.id] ?? 0;
      const tileStackIndex = tileCounts[position] || 0;

      tileCounts[position] = tileStackIndex + 1;

      return {
        ...player,
        color: PLAYER_COLORS[playerIndex % PLAYER_COLORS.length],
        position,
        tileStackIndex,
      };
    });
  }, [displayedPositions, players, positions]);

  if (chase) {
    return (
      <main className="chase-host-screen">
        <div className="chase-host-header">
          <div>
            <span>Chase</span>
            <strong>
              {isMiniGameStarted(chase)
                ? `${chase.players[chase.runnerId]?.name || "Runner"} is running`
                : `Starting in ${getStartCountdown(chase)}`}
            </strong>
          </div>
          <div className="chase-clock">{secondsLeft}s</div>
        </div>

        <div
          className="chase-map"
          style={{
            "--chase-columns": chase.columns,
            "--chase-rows": chase.rows,
          }}
        >
          {Array.from({ length: chase.columns * chase.rows }, (_, index) => {
            const x = index % chase.columns;
            const y = Math.floor(index / chase.columns);
            const isBarrier = chase.barriers.some(
              (barrier) => barrier.x === x && barrier.y === y,
            );

            return (
              <div
                className={isBarrier ? "chase-cell barrier" : "chase-cell"}
                key={`${x}-${y}`}
              />
            );
          })}

          {Object.values(chase.players).map((player) => {
            const isRunner = player.id === chase.runnerId;

            return (
              <div
                className={isRunner ? "chase-piece runner" : "chase-piece chaser"}
                key={player.id}
                style={{
                  left: `${(player.x / chase.columns) * 100}%`,
                  top: `${(player.y / chase.rows) * 100}%`,
                  backgroundImage: player.avatar ? `url(${player.avatar})` : undefined,
                }}
              >
                {!player.avatar && getPlayerInitial(player.name)}
              </div>
            );
          })}
        </div>

        <div className="chase-host-footer">
          <span>Runner: {chase.players[chase.runnerId]?.name || "Player"}</span>
          <span>Swipe on phones to change direction</span>
        </div>
      </main>
    );
  }

  if (chaseResult) {
    return (
      <main className="chase-host-screen chase-result-screen">
        <div className="chase-result-card">
          <span>Chase Results</span>
          <h1>
            {chaseResult.caught
              ? `${chaseResult.caughtByName} caught ${chaseResult.runnerName}`
              : `${chaseResult.runnerName} escaped`}
          </h1>

          {chaseResult.penalties.length > 0 ? (
            <div className="trivia-penalty-list">
              {chaseResult.penalties.map((penalty) => (
                <p key={penalty.playerId}>
                  {penalty.playerName} moves back {penalty.spacesBack}
                </p>
              ))}
            </div>
          ) : (
            <p className="trivia-progress">No one moves back</p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="game-board-screen">
      {lastRoll && (
        <div className="roll-notification dice-roll-notification">
          <DiceFace key={lastRoll.rollId} roll={lastRoll.roll} />
          <span>{lastRoll.playerName} rolled a {lastRoll.roll}</span>
        </div>
      )}

      {winner && (
        <div className="winner-banner">
          <span>Winner</span>
          <strong>{winner.name || "Player"}</strong>
        </div>
      )}

      {paused && (
        <div className="pause-banner">
          <span>Paused</span>
          <strong>
            Waiting for {pausedPlayers.map((player) => player.name).join(", ") || "players"}
          </strong>
          <button
            className="pause-quit-button"
            onClick={() => {
              onQuit();
            }}
          >
            Quit Game
          </button>
        </div>
      )}

      <section className="game-board-stage">
        <div
          className="game-board"
          style={{
            "--board-columns": BOARD_COLUMNS,
            "--board-rows": BOARD_ROWS,
          }}
        >
          {Array.from({ length: tileCount }, (_, index) => {
            const boardPosition = getSnakePositionFromGridIndex(index);
            const isStart = index === 0;
            const isFinish = index === tileCount - 1;
            const isTrivia = TRIVIA_TILE_POSITIONS.has(boardPosition);
            const isMostLikely = MOST_LIKELY_TILE_POSITIONS.has(boardPosition);
            const isRapidTap = RAPID_TAP_TILE_POSITIONS.has(boardPosition);
            const isStopLine = STOP_LINE_TILE_POSITIONS.has(boardPosition);
            const isJumpBlock = JUMP_BLOCK_TILE_POSITIONS.has(boardPosition);
            const isFirstTap = FIRST_TAP_TILE_POSITIONS.has(boardPosition);
            const isPressRelease = PRESS_RELEASE_TILE_POSITIONS.has(boardPosition);
            const isWordMath = WORD_MATH_TILE_POSITIONS.has(boardPosition);
            const isFinishLyric = FINISH_LYRIC_TILE_POSITIONS.has(boardPosition);
            const isDrawImage = DRAW_IMAGE_TILE_POSITIONS.has(boardPosition);
            const isWorstAdvice = WORST_ADVICE_TILE_POSITIONS.has(boardPosition);
            const isCaptionThis = CAPTION_THIS_TILE_POSITIONS.has(boardPosition);
            const isChase = CHASE_TILE_POSITIONS.has(boardPosition);

            return (
              <div
                className={[
                  "board-tile",
                  isStart ? "start-tile" : "",
                  isFinish ? "finish-tile" : "",
                  isTrivia ? "trivia-tile" : "",
                  isMostLikely ? "most-likely-tile" : "",
                  isRapidTap ? "rapid-tap-tile" : "",
                  isStopLine ? "stop-line-tile" : "",
                  isJumpBlock ? "jump-block-tile" : "",
                  isFirstTap ? "first-tap-tile" : "",
                  isPressRelease ? "press-release-tile" : "",
                  isWordMath ? "word-math-tile" : "",
                  isFinishLyric ? "finish-lyric-tile" : "",
                  isDrawImage ? "draw-image-tile" : "",
                  isWorstAdvice ? "worst-advice-tile" : "",
                  isCaptionThis ? "caption-this-tile" : "",
                  isChase ? "chase-tile" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={index}
              >
                {isStart && <span className="tile-label">Start</span>}
                {isFinish && <span className="tile-label">Finish</span>}
                {isTrivia && <span className="tile-label">Trivia</span>}
                {isMostLikely && <span className="tile-label">Most</span>}
                {isRapidTap && <span className="tile-label">Tap</span>}
                {isStopLine && <span className="tile-label">Stop</span>}
                {isJumpBlock && <span className="tile-label">Jump</span>}
                {isFirstTap && <span className="tile-label">First</span>}
                {isPressRelease && <span className="tile-label">Hold</span>}
                {isWordMath && <span className="tile-label">Math</span>}
                {isFinishLyric && <span className="tile-label">Lyrics</span>}
                {isDrawImage && <span className="tile-label">Draw</span>}
                {isWorstAdvice && <span className="tile-label">Advice</span>}
                {isCaptionThis && <span className="tile-label">Caption</span>}
                {isChase && <span className="tile-label">Chase</span>}
              </div>
            );
          })}

          <div className="player-piece-layer">
            {playersWithBoardPosition.map((player) => {
              const { row, column } = getTileCoordinates(player.position);
              const offsetDirection = player.tileStackIndex % 2 === 0 ? -1 : 1;
              const offsetMagnitude = Math.ceil(player.tileStackIndex / 2) * 18;

              return (
                <div
                  className={
                    movingPlayerId === player.id
                      ? "player-piece hopping"
                      : "player-piece"
                  }
                  key={player.id}
                  style={{
                    "--piece-row": row,
                    "--piece-column": column,
                    "--piece-offset-x": `${offsetDirection * offsetMagnitude}%`,
                    "--piece-offset-y": `${player.tileStackIndex * 10}%`,
                  }}
                  title={player.name}
                >
                  <div
                    className={player.avatar ? "player-token has-avatar" : "player-token"}
                    style={{
                      backgroundColor: player.color,
                      backgroundImage: player.avatar
                        ? `url(${player.avatar})`
                        : undefined,
                      backgroundPosition: player.avatar ? "center" : undefined,
                      backgroundRepeat: player.avatar ? "no-repeat" : undefined,
                      backgroundSize: player.avatar ? "cover" : undefined,
                    }}
                  >
                    {!player.avatar && getPlayerInitial(player.name)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="game-lobby-panel">
        <div className="game-lobby-header">
          <h2>Lobby</h2>
          <span>{players.length} Players</span>
        </div>

        <div className="game-lobby-list">
          {players.map((player, playerIndex) => {
            const isCurrentTurn = currentPlayerId === player.id;
            const isDisconnected = player.connected === false;

            return (
            <div
              className={
                isCurrentTurn
                  ? "game-lobby-player current-turn"
                  : isDisconnected
                  ? "game-lobby-player disconnected-player"
                  : "game-lobby-player"
              }
              key={player.id}
            >
              <div
                className={
                  player.avatar
                    ? "game-lobby-initial has-avatar"
                    : "game-lobby-initial"
                }
                style={{
                  backgroundColor:
                    PLAYER_COLORS[playerIndex % PLAYER_COLORS.length],
                  backgroundImage: player.avatar
                    ? `url(${player.avatar})`
                    : undefined,
                  backgroundPosition: player.avatar ? "center" : undefined,
                  backgroundRepeat: player.avatar ? "no-repeat" : undefined,
                  backgroundSize: player.avatar ? "cover" : undefined,
                }}
              >
                {!player.avatar && getPlayerInitial(player.name)}
              </div>

              <span className="game-lobby-name">{player.name}</span>

              {isDisconnected && (
                <span className="game-lobby-status offline">
                  Offline
                </span>
              )}

              {!isDisconnected && isCurrentTurn && (
                <span className="game-lobby-status">
                  Turn
                </span>
              )}
            </div>
            );
          })}

          {players.length === 0 && (
            <div className="game-lobby-empty">No players yet</div>
          )}
        </div>

        <div className="music-panel">
          <audio
            ref={audioRef}
            src={currentTrack ? `${SERVER_ORIGIN}${currentTrack.url}` : undefined}
            onEnded={handleNextTrack}
          />

          <div className="music-track-name">
            {currentTrack?.name || musicMessage || "No songs found"}
          </div>

          <div className="music-controls">
            <button
              className="music-control-button"
              disabled={!currentTrack}
              onClick={handleToggleMusic}
            >
              {musicPlaying ? "Pause" : "Play"}
            </button>

            <button
              className="music-control-button"
              disabled={musicTracks.length < 2}
              onClick={handleNextTrack}
            >
              Next
            </button>
          </div>
        </div>

        <button
          className="settings-button"
          aria-label="Open settings"
          onClick={() => {
            setSettingsOpen(true);
          }}
        >
          ⚙
        </button>
      </aside>

      {settingsOpen && (
        <div
          className="settings-modal-backdrop"
          role="presentation"
          onClick={() => {
            setSettingsOpen(false);
          }}
        >
          <div
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="settings-modal-header">
              <h2 id="settings-title">Settings</h2>

              <button
                className="settings-close-button"
                aria-label="Close settings"
                onClick={() => {
                  setSettingsOpen(false);
                }}
              >
                ×
              </button>
            </div>

            <div className="settings-actions">
              <button
                className="settings-action-button"
                onClick={() => {
                  setSettingsOpen(false);
                  onRestart();
                }}
              >
                Restart Game
              </button>

              <button
                className="settings-action-button danger"
                onClick={() => {
                  setSettingsOpen(false);
                  onQuit();
                }}
              >
                Quit Game
              </button>
            </div>
          </div>
        </div>
      )}

      {trivia && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal">
            <div className="trivia-modal-header">
              <span>Trivia</span>
              <strong>{secondsLeft}s</strong>
            </div>

            <h2>
              {isMiniGameStarted(trivia)
                ? trivia.question
                : `Starting in ${getStartCountdown(trivia)}`}
            </h2>

            <div className="trivia-answer-grid">
              {trivia.choices.map((choice, index) => (
                <div className="trivia-answer-option" key={choice}>
                  <span>{String.fromCharCode(65 + index)}</span>
                  {choice}
                </div>
              ))}
            </div>

            <p className="trivia-progress">
              {trivia.answeredPlayerIds.length} / {trivia.totalPlayers} answered
            </p>
          </div>
        </div>
      )}

      {triviaResult && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal">
            <div className="trivia-modal-header">
              <span>Answer</span>
            </div>

            <h2>
              {triviaResult.choices[triviaResult.correctIndex]}
            </h2>

            {triviaResult.penalties.length > 0 ? (
              <div className="trivia-penalty-list">
                {triviaResult.penalties.map((penalty) => (
                  <p key={penalty.playerId}>
                    {penalty.playerName} moves back {penalty.spacesBack}
                  </p>
                ))}
              </div>
            ) : (
              <p className="trivia-progress">Everyone got it right</p>
            )}
          </div>
        </div>
      )}

      {wordMath && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal word-math-modal">
            <div className="trivia-modal-header">
              <span>Word Math</span>
              <strong>{secondsLeft}s</strong>
            </div>

            <h2>
              {isMiniGameStarted(wordMath)
                ? wordMath.question
                : `Starting in ${getStartCountdown(wordMath)}`}
            </h2>

            <div className="trivia-answer-grid">
              {wordMath.choices.map((choice, index) => (
                <div className="trivia-answer-option" key={choice}>
                  <span>{String.fromCharCode(65 + index)}</span>
                  {choice}
                </div>
              ))}
            </div>

            <p className="trivia-progress">
              {wordMath.answeredPlayerIds.length} / {wordMath.totalPlayers} answered
            </p>
          </div>
        </div>
      )}

      {wordMathResult && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal word-math-modal">
            <div className="trivia-modal-header">
              <span>Word Math</span>
            </div>

            <h2>
              Answer: {wordMathResult.choices[wordMathResult.correctIndex]}
            </h2>

            {wordMathResult.penalties.length > 0 ? (
              <div className="trivia-penalty-list">
                {wordMathResult.penalties.map((penalty) => (
                  <p key={penalty.playerId}>
                    {penalty.playerName} moves back {penalty.spacesBack}
                  </p>
                ))}
              </div>
            ) : (
              <p className="trivia-progress">Everyone got it right</p>
            )}
          </div>
        </div>
      )}

      {finishLyric && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal finish-lyric-modal">
            <div className="trivia-modal-header">
              <span>Finish the Lyric</span>
              <strong>{secondsLeft}s</strong>
            </div>

            <h2>
              {isMiniGameStarted(finishLyric)
                ? finishLyric.prompt
                : `Starting in ${getStartCountdown(finishLyric)}`}
            </h2>

            <div className="trivia-answer-grid">
              {finishLyric.choices.map((choice, index) => (
                <div className="trivia-answer-option" key={choice}>
                  <span>{String.fromCharCode(65 + index)}</span>
                  {choice}
                </div>
              ))}
            </div>

            <p className="trivia-progress">
              {finishLyric.answeredPlayerIds.length} / {finishLyric.totalPlayers} answered
            </p>
          </div>
        </div>
      )}

      {finishLyricResult && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal finish-lyric-modal">
            <div className="trivia-modal-header">
              <span>Finish the Lyric</span>
            </div>

            <h2>
              Next phrase: {finishLyricResult.choices[finishLyricResult.correctIndex]}
            </h2>

            {finishLyricResult.penalties.length > 0 ? (
              <div className="trivia-penalty-list">
                {finishLyricResult.penalties.map((penalty) => (
                  <p key={penalty.playerId}>
                    {penalty.playerName} moves back {penalty.spacesBack}
                  </p>
                ))}
              </div>
            ) : (
              <p className="trivia-progress">Everyone got it right</p>
            )}
          </div>
        </div>
      )}

      {drawImage && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal draw-image-modal">
            <div className="trivia-modal-header">
              <span>{drawImage.stage === "voting" ? "Vote Best Drawing" : "Draw It"}</span>
              <strong>{secondsLeft}s</strong>
            </div>

            <h2>
              {isMiniGameStarted(drawImage)
                ? drawImage.prompt
                : `Starting in ${getStartCountdown(drawImage)}`}
            </h2>

            {drawImage.submissions.length > 0 ? (
              <div className="draw-gallery">
                {drawImage.submissions.map((submission, index) => (
                  <div className="draw-card" key={submission.playerId}>
                    <img src={submission.image} alt={`Anonymous drawing ${index + 1}`} />
                    <span>Drawing {index + 1}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="trivia-progress">Waiting for drawings</p>
            )}

            <p className="trivia-progress">
              {drawImage.stage === "voting"
                ? `${drawImage.votedPlayerIds.length} / ${drawImage.totalPlayers} voted`
                : `${drawImage.submittedPlayerIds.length} / ${drawImage.totalPlayers} submitted`}
            </p>
          </div>
        </div>
      )}

      {drawImageResult && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal draw-image-modal">
            <div className="trivia-modal-header">
              <span>Drawing Results</span>
            </div>

            <h2>{drawImageResult.prompt}</h2>

            <div className="draw-gallery">
              {drawImageResult.submissions.map((submission) => (
                <div className="draw-card" key={submission.playerId}>
                  <img src={submission.image} alt={`${submission.playerName} drawing`} />
                  <span>
                    {submission.playerName}: {drawImageResult.voteCounts[submission.playerId] || 0}
                  </span>
                </div>
              ))}
            </div>

            {drawImageResult.penalties.length > 0 ? (
              <div className="trivia-penalty-list">
                {drawImageResult.penalties.map((penalty) => (
                  <p key={penalty.playerId}>
                    {penalty.playerName} moves back {penalty.spacesBack}
                  </p>
                ))}
              </div>
            ) : (
              <p className="trivia-progress">No one moves back</p>
            )}
          </div>
        </div>
      )}

      {worstAdvice && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal worst-advice-modal">
            <div className="trivia-modal-header">
              <span>{worstAdvice.stage === "voting" ? "Vote Best Bad Advice" : "Worst Advice"}</span>
              <strong>{secondsLeft}s</strong>
            </div>

            <h2>{worstAdvice.prompt}</h2>

            {worstAdvice.submissions.length > 0 ? (
              <div className="draw-gallery">
                {worstAdvice.submissions.map((submission, index) => (
                  <div className="draw-card advice-card" key={submission.playerId}>
                    <p>{submission.answer}</p>
                    <span>Answer {index + 1}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="trivia-progress">Waiting for advice</p>
            )}

            <p className="trivia-progress">
              {worstAdvice.stage === "voting"
                ? `${worstAdvice.votedPlayerIds.length} / ${worstAdvice.totalPlayers} voted`
                : `${worstAdvice.submittedPlayerIds.length} / ${worstAdvice.totalPlayers} submitted`}
            </p>
          </div>
        </div>
      )}

      {worstAdviceResult && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal worst-advice-modal">
            <div className="trivia-modal-header">
              <span>Worst Advice Results</span>
            </div>

            <h2>{worstAdviceResult.prompt}</h2>

            <div className="draw-gallery">
              {worstAdviceResult.submissions.map((submission) => (
                <div className="draw-card advice-card" key={submission.playerId}>
                  <p>{submission.answer}</p>
                  <span>
                    {submission.playerName}: {worstAdviceResult.voteCounts[submission.playerId] || 0}
                  </span>
                </div>
              ))}
            </div>

            {worstAdviceResult.penalties.length > 0 ? (
              <div className="trivia-penalty-list">
                {worstAdviceResult.penalties.map((penalty) => (
                  <p key={penalty.playerId}>
                    {penalty.playerName} moves back {penalty.spacesBack}
                  </p>
                ))}
              </div>
            ) : (
              <p className="trivia-progress">No one moves back</p>
            )}
          </div>
        </div>
      )}

      {captionThis && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal caption-this-modal">
            <div className="trivia-modal-header">
              <span>
                {captionThis.stage === "photo"
                  ? "Caption This"
                  : captionThis.stage === "voting"
                  ? "Vote Best Caption"
                  : "Write Captions"}
              </span>
              <strong>{secondsLeft}s</strong>
            </div>

            {captionThis.stage === "photo" ? (
              <h2>{captionThis.photoPlayerName} is choosing a photo</h2>
            ) : (
              <>
                <img
                  className="caption-this-photo"
                  src={captionThis.photo}
                  alt="Caption this"
                />

                {captionThis.submissions.length > 0 ? (
                  <div className="draw-gallery">
                    {captionThis.submissions.map((submission, index) => (
                      <div className="draw-card advice-card" key={submission.playerId}>
                        <p>{submission.caption}</p>
                        <span>Caption {index + 1}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="trivia-progress">Waiting for captions</p>
                )}
              </>
            )}

            <p className="trivia-progress">
              {captionThis.stage === "photo"
                ? "Waiting for photo"
                : captionThis.stage === "voting"
                ? `${captionThis.votedPlayerIds.length} / ${captionThis.totalPlayers} voted`
                : `${captionThis.submittedPlayerIds.length} / ${captionThis.totalPlayers} submitted`}
            </p>
          </div>
        </div>
      )}

      {captionThisResult && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal caption-this-modal">
            <div className="trivia-modal-header">
              <span>Caption Results</span>
            </div>

            <img
              className="caption-this-photo"
              src={captionThisResult.photo}
              alt="Caption this result"
            />

            <div className="draw-gallery">
              {captionThisResult.submissions.map((submission) => (
                <div className="draw-card advice-card" key={submission.playerId}>
                  <p>{submission.caption}</p>
                  <span>
                    {submission.playerName}: {captionThisResult.voteCounts[submission.playerId] || 0}
                  </span>
                </div>
              ))}
            </div>

            {captionThisResult.penalties.length > 0 ? (
              <div className="trivia-penalty-list">
                {captionThisResult.penalties.map((penalty) => (
                  <p key={penalty.playerId}>
                    {penalty.playerName} moves back {penalty.spacesBack}
                  </p>
                ))}
              </div>
            ) : (
              <p className="trivia-progress">No one moves back</p>
            )}
          </div>
        </div>
      )}

      {mostLikely && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal most-likely-modal">
            <div className="trivia-modal-header">
              <span>Most Likely</span>
              <strong>{secondsLeft}s</strong>
            </div>

            <h2>
              {isMiniGameStarted(mostLikely)
                ? mostLikely.prompt
                : `Starting in ${getStartCountdown(mostLikely)}`}
            </h2>

            <div className="trivia-answer-grid">
              {mostLikely.choices.map((choice) => (
                <div className="trivia-answer-option" key={choice.id}>
                  {choice.name}
                </div>
              ))}
            </div>

            <p className="trivia-progress">
              {mostLikely.answeredPlayerIds.length} / {mostLikely.totalPlayers} voted
            </p>
          </div>
        </div>
      )}

      {mostLikelyResult && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal most-likely-modal">
            <div className="trivia-modal-header">
              <span>Most Likely</span>
            </div>

            <h2>{mostLikelyResult.prompt}</h2>

            {mostLikelyResult.penalties.length > 0 ? (
              <div className="trivia-penalty-list">
                {mostLikelyResult.penalties.map((penalty) => (
                  <p key={penalty.playerId}>
                    {penalty.playerName} moves back {penalty.spacesBack}
                  </p>
                ))}
              </div>
            ) : (
              <p className="trivia-progress">No votes were cast</p>
            )}
          </div>
        </div>
      )}

      {rapidTap && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal rapid-tap-modal">
            <div className="trivia-modal-header">
              <span>Rapid Tap</span>
              <strong>{secondsLeft}s</strong>
            </div>

            <h2>
              {isMiniGameStarted(rapidTap)
                ? "Tap as fast as you can"
                : `Starting in ${getStartCountdown(rapidTap)}`}
            </h2>

            <div className="rapid-score-list">
              {rapidTap.choices
                .map((choice) => ({
                  ...choice,
                  score: rapidTap.scores[choice.id] || 0,
                }))
                .sort((a, b) => b.score - a.score)
                .map((choice) => (
                  <div className="rapid-score-row" key={choice.id}>
                    <span>{choice.name}</span>
                    <strong>{choice.score}</strong>
                  </div>
                ))}
            </div>

            <p className="trivia-progress">
              {rapidTap.submittedPlayerIds.length} / {rapidTap.totalPlayers} final scores in
            </p>
          </div>
        </div>
      )}

      {rapidTapResult && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal rapid-tap-modal">
            <div className="trivia-modal-header">
              <span>Rapid Tap</span>
            </div>

            <h2>Lowest score moves back</h2>

            {rapidTapResult.penalties.length > 0 ? (
              <div className="trivia-penalty-list">
                {rapidTapResult.penalties.map((penalty) => (
                  <p key={penalty.playerId}>
                    {penalty.playerName} scored {penalty.score} and moves back {penalty.spacesBack}
                  </p>
                ))}
              </div>
            ) : (
              <p className="trivia-progress">No scores were submitted</p>
            )}
          </div>
        </div>
      )}

      {stopLine && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal stop-line-modal">
            <div className="trivia-modal-header">
              <span>Stop the Line</span>
              <strong>{secondsLeft}s</strong>
            </div>

            <h2>
              {isMiniGameStarted(stopLine)
                ? "Stop closest to the target"
                : `Starting in ${getStartCountdown(stopLine)}`}
            </h2>

            <div className="stop-line-host-track">
              <span className="stop-line-host-target" />
            </div>

            <div className="rapid-score-list">
              {stopLine.choices
                .map((choice) => ({
                  ...choice,
                  distance: stopLine.results[choice.id]?.distance,
                }))
                .sort((a, b) => (a.distance ?? 101) - (b.distance ?? 101))
                .map((choice) => (
                  <div className="rapid-score-row" key={choice.id}>
                    <span>{choice.name}</span>
                    <strong>
                      {choice.distance === undefined
                        ? "--"
                        : `${choice.distance.toFixed(1)}`}
                    </strong>
                  </div>
                ))}
            </div>

            <p className="trivia-progress">
              {stopLine.submittedPlayerIds.length} / {stopLine.totalPlayers} stopped
            </p>
          </div>
        </div>
      )}

      {stopLineResult && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal stop-line-modal">
            <div className="trivia-modal-header">
              <span>Stop the Line</span>
            </div>

            <h2>Farthest from the line moves back</h2>

            {stopLineResult.penalties.length > 0 ? (
              <div className="trivia-penalty-list">
                {stopLineResult.penalties.map((penalty) => (
                  <p key={penalty.playerId}>
                    {penalty.playerName} missed by {penalty.distance.toFixed(1)} and moves back {penalty.spacesBack}
                  </p>
                ))}
              </div>
            ) : (
              <p className="trivia-progress">No stops were submitted</p>
            )}
          </div>
        </div>
      )}

      {jumpBlock && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal jump-block-modal">
            <div className="trivia-modal-header">
              <span>Jump Blocks</span>
              <strong>{secondsLeft}s</strong>
            </div>

            <h2>
              {isMiniGameStarted(jumpBlock)
                ? "Jump the blocks as they speed up"
                : `Starting in ${getStartCountdown(jumpBlock)}`}
            </h2>

            <div className="rapid-score-list">
              {jumpBlock.choices
                .map((choice) => ({
                  ...choice,
                  score: jumpBlock.scores[choice.id] || 0,
                }))
                .sort((a, b) => b.score - a.score)
                .map((choice) => (
                  <div className="rapid-score-row" key={choice.id}>
                    <span>{choice.name}</span>
                    <strong>{choice.score}</strong>
                  </div>
                ))}
            </div>

            <p className="trivia-progress">
              {jumpBlock.submittedPlayerIds.length} / {jumpBlock.totalPlayers} final scores in
            </p>
          </div>
        </div>
      )}

      {jumpBlockResult && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal jump-block-modal">
            <div className="trivia-modal-header">
              <span>Jump Blocks</span>
            </div>

            <h2>Lowest score moves back</h2>

            {jumpBlockResult.penalties.length > 0 ? (
              <div className="trivia-penalty-list">
                {jumpBlockResult.penalties.map((penalty) => (
                  <p key={penalty.playerId}>
                    {penalty.playerName} scored {penalty.score} and moves back {penalty.spacesBack}
                  </p>
                ))}
              </div>
            ) : (
              <p className="trivia-progress">No scores were submitted</p>
            )}
          </div>
        </div>
      )}

      {firstTap && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal first-tap-modal">
            <div className="trivia-modal-header">
              <span>First Tap</span>
              <strong>{secondsLeft}s</strong>
            </div>

            <h2>
              {isMiniGameStarted(firstTap)
                ? "Green means go. Last press loses."
                : "Wait for green."
              }
            </h2>

            <div className="rapid-score-list">
              {firstTap.pressOrder.length > 0 ? (
                firstTap.pressOrder.map((press, index) => (
                  <div className="rapid-score-row" key={press.playerId}>
                    <span>{press.playerName}</span>
                    <strong>{index + 1}</strong>
                  </div>
                ))
              ) : (
                <div className="rapid-score-row">
                  <span>Waiting for presses</span>
                  <strong>--</strong>
                </div>
              )}
            </div>

            <p className="trivia-progress">
              {firstTap.submittedPlayerIds.length} / {firstTap.totalPlayers} pressed
            </p>
          </div>
        </div>
      )}

      {firstTapResult && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal first-tap-modal">
            <div className="trivia-modal-header">
              <span>First Tap</span>
            </div>

            <h2>Last press moves back</h2>

            {firstTapResult.penalties.length > 0 ? (
              <div className="trivia-penalty-list">
                {firstTapResult.penalties.map((penalty) => (
                  <p key={penalty.playerId}>
                    {penalty.playerName} moves back {penalty.spacesBack}
                  </p>
                ))}
              </div>
            ) : (
              <p className="trivia-progress">No penalties</p>
            )}
          </div>
        </div>
      )}

      {pressRelease && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal press-release-modal">
            <div className="trivia-modal-header">
              <span>Press Hold</span>
              <strong>{secondsLeft}s</strong>
            </div>

            <h2>
              {isMiniGameStarted(pressRelease)
                ? `Target: ${(pressRelease.targetMs / 1000).toFixed(1)} seconds`
                : `Starting in ${getStartCountdown(pressRelease)}`}
            </h2>

            <div className="rapid-score-list">
              {pressRelease.choices.map((choice) => {
                const result = pressRelease.results[choice.id];

                return (
                  <div className="rapid-score-row" key={choice.id}>
                    <span>{choice.name}</span>
                    <strong>
                      {result ? `${(result.heldMs / 1000).toFixed(2)}s` : "--"}
                    </strong>
                  </div>
                );
              })}
            </div>

            <p className="trivia-progress">
              {pressRelease.submittedPlayerIds.length} / {pressRelease.totalPlayers} released
            </p>
          </div>
        </div>
      )}

      {pressReleaseResult && (
        <div className="trivia-modal-backdrop">
          <div className="trivia-modal host-trivia-modal press-release-modal">
            <div className="trivia-modal-header">
              <span>Press Hold</span>
            </div>

            <h2>Target: {(pressReleaseResult.targetMs / 1000).toFixed(1)} seconds</h2>

            <div className="rapid-score-list">
              {Object.values(pressReleaseResult.results)
                .sort((a, b) => a.differenceMs - b.differenceMs)
                .map((result) => (
                  <div className="rapid-score-row" key={result.playerId}>
                    <span>{result.playerName}</span>
                    <strong>
                      {(result.heldMs / 1000).toFixed(2)}s
                    </strong>
                  </div>
                ))}
            </div>

            {pressReleaseResult.penalties.length > 0 ? (
              <div className="trivia-penalty-list">
                {pressReleaseResult.penalties.map((penalty) => (
                  <p key={penalty.playerId}>
                    {penalty.playerName} missed by {(penalty.differenceMs / 1000).toFixed(2)}s and moves back {penalty.spacesBack}
                  </p>
                ))}
              </div>
            ) : (
              <p className="trivia-progress">No penalties</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default GameBoard;
