import { useCallback, useEffect, useState } from "react";
import Lobby from "../../components/Lobby";
import socket from "../../socket";
import GameBoard from "./GameBoard";

const DEFAULT_LOBBY_CODE = "ABCD";

function GamePage() {
  const [players, setPlayers] = useState([]);
  const [started, setStarted] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [lastRoll, setLastRoll] = useState(null);
  const [trivia, setTrivia] = useState(null);
  const [triviaResult, setTriviaResult] = useState(null);
  const [mostLikely, setMostLikely] = useState(null);
  const [mostLikelyResult, setMostLikelyResult] = useState(null);
  const [rapidTap, setRapidTap] = useState(null);
  const [rapidTapResult, setRapidTapResult] = useState(null);
  const [stopLine, setStopLine] = useState(null);
  const [stopLineResult, setStopLineResult] = useState(null);
  const [jumpBlock, setJumpBlock] = useState(null);
  const [jumpBlockResult, setJumpBlockResult] = useState(null);
  const [firstTap, setFirstTap] = useState(null);
  const [firstTapResult, setFirstTapResult] = useState(null);
  const [pressRelease, setPressRelease] = useState(null);
  const [pressReleaseResult, setPressReleaseResult] = useState(null);
  const [wordMath, setWordMath] = useState(null);
  const [wordMathResult, setWordMathResult] = useState(null);
  const [finishLyric, setFinishLyric] = useState(null);
  const [finishLyricResult, setFinishLyricResult] = useState(null);
  const [drawImage, setDrawImage] = useState(null);
  const [drawImageResult, setDrawImageResult] = useState(null);
  const [worstAdvice, setWorstAdvice] = useState(null);
  const [worstAdviceResult, setWorstAdviceResult] = useState(null);
  const [captionThis, setCaptionThis] = useState(null);
  const [captionThisResult, setCaptionThisResult] = useState(null);
  const [chase, setChase] = useState(null);
  const [chaseResult, setChaseResult] = useState(null);
  const [winner, setWinner] = useState(null);
  const lobbyCode =
    new URLSearchParams(window.location.search).get("lobby")?.toUpperCase() ||
    DEFAULT_LOBBY_CODE;

  useEffect(() => {
    document.body.classList.add("game-page-active");

    return () => {
      document.body.classList.remove("game-page-active");
    };
  }, []);

  useEffect(() => {
    socket.on("playersUpdated", (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });

    socket.on("gameStarted", () => {
      setStarted(true);
    });

    socket.on("gameEnded", () => {
      setStarted(false);
      setGameState(null);
      setLastRoll(null);
      setTrivia(null);
      setTriviaResult(null);
      setMostLikely(null);
      setMostLikelyResult(null);
      setRapidTap(null);
      setRapidTapResult(null);
      setStopLine(null);
      setStopLineResult(null);
      setJumpBlock(null);
      setJumpBlockResult(null);
      setFirstTap(null);
      setFirstTapResult(null);
      setPressRelease(null);
      setPressReleaseResult(null);
      setWordMath(null);
      setWordMathResult(null);
      setFinishLyric(null);
      setFinishLyricResult(null);
      setDrawImage(null);
      setDrawImageResult(null);
      setWorstAdvice(null);
      setWorstAdviceResult(null);
      setCaptionThis(null);
      setCaptionThisResult(null);
      setChase(null);
      setChaseResult(null);
      setWinner(null);
    });

    socket.on("gameStateUpdated", (nextGameState) => {
      setGameState(nextGameState);
      setWinner(nextGameState?.winner || null);
    });

    socket.on("testMiniGameEnded", () => {
      setStarted(false);
      setGameState(null);
      setLastRoll(null);
      setTrivia(null);
      setTriviaResult(null);
      setMostLikely(null);
      setMostLikelyResult(null);
      setRapidTap(null);
      setRapidTapResult(null);
      setStopLine(null);
      setStopLineResult(null);
      setJumpBlock(null);
      setJumpBlockResult(null);
      setFirstTap(null);
      setFirstTapResult(null);
      setPressRelease(null);
      setPressReleaseResult(null);
      setWordMath(null);
      setWordMathResult(null);
      setFinishLyric(null);
      setFinishLyricResult(null);
      setDrawImage(null);
      setDrawImageResult(null);
      setWorstAdvice(null);
      setWorstAdviceResult(null);
      setCaptionThis(null);
      setCaptionThisResult(null);
      setChase(null);
      setChaseResult(null);
      setWinner(null);
    });

    socket.on("diceRolled", (rollEvent) => {
      setLastRoll(rollEvent);

      if (rollEvent) {
        window.setTimeout(() => {
          setLastRoll((currentRoll) =>
            currentRoll === rollEvent ? null : currentRoll,
          );
        }, 3200);
      }
    });

    socket.on("triviaStarted", (nextTrivia) => {
      setTrivia(nextTrivia);
      setTriviaResult(null);
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

    socket.on("mostLikelyStarted", (nextMostLikely) => {
      setMostLikely(nextMostLikely);
      setMostLikelyResult(null);
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
    });

    socket.on("rapidTapUpdated", (nextRapidTap) => {
      setRapidTap(nextRapidTap);
    });

    socket.on("rapidTapResolved", (result) => {
      setRapidTap(null);
      setRapidTapResult(result);

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
    });

    socket.on("stopLineUpdated", (nextStopLine) => {
      setStopLine(nextStopLine);
    });

    socket.on("stopLineResolved", (result) => {
      setStopLine(null);
      setStopLineResult(result);

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
    });

    socket.on("jumpBlockUpdated", (nextJumpBlock) => {
      setJumpBlock(nextJumpBlock);
    });

    socket.on("jumpBlockResolved", (result) => {
      setJumpBlock(null);
      setJumpBlockResult(result);

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
    });

    socket.on("firstTapUpdated", (nextFirstTap) => {
      setFirstTap(nextFirstTap);
    });

    socket.on("firstTapResolved", (result) => {
      setFirstTap(null);
      setFirstTapResult(result);

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
    });

    socket.on("pressReleaseUpdated", (nextPressRelease) => {
      setPressRelease(nextPressRelease);
    });

    socket.on("pressReleaseResolved", (result) => {
      setPressRelease(null);
      setPressReleaseResult(result);

      if (result) {
        window.setTimeout(() => {
          setPressReleaseResult((currentResult) =>
            currentResult === result ? null : currentResult,
          );
        }, 6000);
      }
    });

    socket.on("wordMathStarted", (nextWordMath) => {
      setWordMath(nextWordMath);
      setWordMathResult(null);
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
    });

    socket.on("drawImageUpdated", (nextDrawImage) => {
      setDrawImage(nextDrawImage);
    });

    socket.on("drawImageResolved", (result) => {
      setDrawImage(null);
      setDrawImageResult(result);

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
    });

    socket.on("worstAdviceUpdated", (nextWorstAdvice) => {
      setWorstAdvice(nextWorstAdvice);
    });

    socket.on("worstAdviceResolved", (result) => {
      setWorstAdvice(null);
      setWorstAdviceResult(result);

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
    });

    socket.on("captionThisUpdated", (nextCaptionThis) => {
      setCaptionThis(nextCaptionThis);
    });

    socket.on("captionThisResolved", (result) => {
      setCaptionThis(null);
      setCaptionThisResult(result);

      if (result) {
        window.setTimeout(() => {
          setCaptionThisResult((currentResult) =>
            currentResult === result ? null : currentResult,
          );
        }, 6000);
      }
    });

    socket.on("chaseStarted", (nextChase) => {
      setChase(nextChase);
      setChaseResult(null);
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

    socket.on("gameWon", (nextWinner) => {
      setWinner(nextWinner);
      setTrivia(null);
      setMostLikely(null);
      setRapidTap(null);
      setStopLine(null);
      setJumpBlock(null);
      setFirstTap(null);
      setPressRelease(null);
      setWordMath(null);
      setFinishLyric(null);
      setDrawImage(null);
      setWorstAdvice(null);
      setCaptionThis(null);
      setChase(null);
    });

    socket.emit("watchLobby", {
      lobbyCode,
    });

    return () => {
      socket.off("playersUpdated");
      socket.off("gameStarted");
      socket.off("gameEnded");
      socket.off("gameStateUpdated");
      socket.off("testMiniGameEnded");
      socket.off("diceRolled");
      socket.off("triviaStarted");
      socket.off("triviaResolved");
      socket.off("mostLikelyStarted");
      socket.off("mostLikelyResolved");
      socket.off("rapidTapStarted");
      socket.off("rapidTapUpdated");
      socket.off("rapidTapResolved");
      socket.off("stopLineStarted");
      socket.off("stopLineUpdated");
      socket.off("stopLineResolved");
      socket.off("jumpBlockStarted");
      socket.off("jumpBlockUpdated");
      socket.off("jumpBlockResolved");
      socket.off("firstTapStarted");
      socket.off("firstTapUpdated");
      socket.off("firstTapResolved");
      socket.off("pressReleaseStarted");
      socket.off("pressReleaseUpdated");
      socket.off("pressReleaseResolved");
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
      socket.off("gameWon");
    };
  }, [lobbyCode]);

  const handleRollMovementComplete = useCallback(
    (rollId) => {
      socket.emit("rollMovementComplete", {
        lobbyCode,
        rollId,
      });
    },
    [lobbyCode],
  );

  if (started) {
    return (
      <GameBoard
        players={players}
        positions={gameState?.positions || {}}
        currentPlayerId={gameState?.currentPlayerId || ""}
        lastRoll={lastRoll}
        trivia={trivia}
        triviaResult={triviaResult}
        mostLikely={mostLikely}
        mostLikelyResult={mostLikelyResult}
        rapidTap={rapidTap}
        rapidTapResult={rapidTapResult}
        stopLine={stopLine}
        stopLineResult={stopLineResult}
        jumpBlock={jumpBlock}
        jumpBlockResult={jumpBlockResult}
        firstTap={firstTap}
        firstTapResult={firstTapResult}
        pressRelease={pressRelease}
        pressReleaseResult={pressReleaseResult}
        wordMath={wordMath}
        wordMathResult={wordMathResult}
        finishLyric={finishLyric}
        finishLyricResult={finishLyricResult}
        drawImage={drawImage}
        drawImageResult={drawImageResult}
        worstAdvice={worstAdvice}
        worstAdviceResult={worstAdviceResult}
        captionThis={captionThis}
        captionThisResult={captionThisResult}
        chase={chase}
        chaseResult={chaseResult}
        paused={gameState?.paused || false}
        pausedPlayers={players.filter((player) => player.connected === false)}
        winner={winner}
        onRollMovementComplete={handleRollMovementComplete}
        onRestart={() => {
          setLastRoll(null);
          setTrivia(null);
          setTriviaResult(null);
          setMostLikely(null);
          setMostLikelyResult(null);
          setRapidTap(null);
          setRapidTapResult(null);
          setStopLine(null);
          setStopLineResult(null);
          setJumpBlock(null);
          setJumpBlockResult(null);
          setFirstTap(null);
          setFirstTapResult(null);
          setPressRelease(null);
          setPressReleaseResult(null);
          setWordMath(null);
          setWordMathResult(null);
          setFinishLyric(null);
          setFinishLyricResult(null);
          setDrawImage(null);
          setDrawImageResult(null);
          setWorstAdvice(null);
          setWorstAdviceResult(null);
          setCaptionThis(null);
          setCaptionThisResult(null);
          setChase(null);
          setChaseResult(null);
          setWinner(null);
          socket.emit("restartGame", {
            lobbyCode,
          });
        }}
        onQuit={() => {
          socket.emit("quitGame", {
            lobbyCode,
          });
        }}
        onForceNextTurn={() => {
          socket.emit("forceNextTurn", {
            lobbyCode,
          });
        }}
      />
    );
  }

  return (
    <Lobby
      players={players}
      lobbyCode={lobbyCode}
      onStart={() => {
        socket.emit("startGame", {
          lobbyCode,
        });
      }}
      onStartMiniGame={(miniGameType) => {
        socket.emit("startTestMiniGame", {
          lobbyCode,
          miniGameType,
        });
      }}
    />
  );
}

export default GamePage;
