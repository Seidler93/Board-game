import "./Lobby.css";

const MINI_GAMES = [
  { id: "trivia", label: "Trivia" },
  { id: "mostLikely", label: "Most Likely" },
  { id: "rapidTap", label: "Rapid Tap" },
  { id: "stopLine", label: "Stop Line" },
  { id: "jumpBlock", label: "Jump Blocks" },
  { id: "firstTap", label: "First Tap" },
  { id: "pressRelease", label: "Press Hold" },
  { id: "wordMath", label: "Word Math" },
  { id: "finishLyric", label: "Lyrics" },
  { id: "drawImage", label: "Draw" },
  { id: "worstAdvice", label: "Bad Advice" },
  { id: "captionThis", label: "Caption" },
  { id: "chase", label: "Chase" },
];

function Lobby({ players, lobbyCode, onStart, onStartMiniGame }) {
  const allReady =
    players.length >= 2 &&
    players.every((player) => player.connected !== false) &&
    players.every((player) => player.ready);
  const canTestMiniGame = players.length > 0;

  return (
    <div className="lobby">
      <div className="lobby-left">
        <h1>Players</h1>

        <div className="player-list">
          {players.map((player) => (
            <div className="player-card" key={player.id}>
              <span
                className={player.avatar ? "lobby-player-avatar has-avatar" : "lobby-player-avatar"}
                style={
                  player.avatar
                    ? {
                        backgroundImage: `url(${player.avatar})`,
                      }
                    : undefined
                }
              >
                {!player.avatar && player.name.trim().charAt(0).toUpperCase()}
              </span>

              <span className="player-name">
                {player.name}
              </span>

              <span
                className={
                  player.connected === false
                    ? "ready-status disconnected"
                    : player.ready
                    ? "ready-status ready"
                    : "ready-status not-ready"
                }
              >
                {player.connected === false
                  ? "OFFLINE"
                  : player.ready
                  ? "READY"
                  : "NOT READY"}
              </span>
            </div>
          ))}
        </div>

        <div className="player-count">
          {players.length} Players Connected
        </div>
      </div>

      <div className="lobby-right">
        <div className="code-section">
          <p>LOBBY CODE</p>

          <div className="lobby-code">
            {lobbyCode}
          </div>
        </div>

        <button
          className="start-button"
          disabled={!allReady}
          onClick={onStart}
        >
          START GAME
        </button>

        <div className="mini-games-section">
          <p>TEST A MINI GAME</p>

          <div className="mini-games-grid">
            {MINI_GAMES.map((miniGame) => (
              <button
                className="mini-game-button"
                disabled={!canTestMiniGame}
                key={miniGame.id}
                onClick={() => {
                  onStartMiniGame(miniGame.id);
                }}
              >
                {miniGame.label}
              </button>
            ))}
          </div>
        </div>

        {!allReady && (
          <p className="start-message">
            {players.length < 2
              ? "Waiting for at least 2 players..."
              : players.some((player) => player.connected === false)
              ? "Waiting for everyone to reconnect..."
              : "Waiting for everyone to be ready..."}
          </p>
        )}
      </div>
    </div>
  );
}

export default Lobby;
