import { useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMatchViewModel } from "@/hooks/useMatchViewModel";
import PaintballGame2D from "@/game/PaintballGame2D";

function Hearts({ count, max = 3, color }: { count: number; max?: number; color: string }) {
  const sequence = useMemo(() => Array.from({ length: max }), [max]);
  return (
    <div className="heart-row">
      {sequence.map((_, index) => (
        <svg key={index} viewBox="0 0 24 24" className="heart-icon">
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill={index < count ? color : "rgba(255,255,255,0.18)"}
            stroke={index < count ? color : "rgba(255,255,255,0.28)"}
            strokeWidth="0.9"
          />
        </svg>
      ))}
    </div>
  );
}

function AvatarChip({ name, color, side }: { name: string; color: string; side: "left" | "right" }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className={`avatar-chip avatar-chip--${side}`}>
      <div className="avatar-chip__icon" style={{ background: `radial-gradient(circle at 30% 30%, ${color}cc, ${color}55)` }}>
        {initial}
      </div>
      <div className="avatar-chip__label">
        <span>{name.length > 10 ? `${name.slice(0, 10)}...` : name}</span>
      </div>
    </div>
  );
}

export default function Game() {
  const { matchId } = useParams<{ matchId: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const {
    connected,
    playerName,
    opponentName,
    playerColor,
    opponentColor,
    status,
    showActions,
    handleTap,
    handleRematch,
  } = useMatchViewModel(matchId);

  const {
    playerHearts,
    opponentHearts,
    isMyTurn,
    matchOver,
    playerWon,
    playerHit,
    opponentHit,
    opponentShot,
    roundStarting,
    statusMsg,
  } = status;

  return (
    <div className="game-page">
      <div className="game-page__header">
        <section className="game-panel game-panel--compact">
          <AvatarChip name={playerName} color={playerColor} side="left" />
          <div className="game-panel__meta">
            <Hearts count={playerHearts} color={playerColor} />
            <span className="status-tag status-tag--player">{playerHearts > 0 ? "ALIVE" : "ELIMINATED"}</span>
          </div>
        </section>

        <section className="game-page__status">
          <div className="status-badge">{statusMsg}</div>
          <div className="status-subtitle">
            {matchOver ? "Match complete" : isMyTurn ? "Your turn to fire" : "Opponent is aiming"}
          </div>
        </section>

        <section className="game-panel game-panel--compact game-panel--alt">
          <AvatarChip name={opponentName} color={opponentColor} side="right" />
          <div className="game-panel__meta game-panel__meta--right">
            <Hearts count={opponentHearts} color={opponentColor} />
            <span className="status-tag status-tag--opponent">{opponentHearts > 0 ? "ALIVE" : "ELIMINATED"}</span>
          </div>
        </section>
      </div>

      <div className="game-canvas-container">
        <PaintballGame2D
          playerName={playerName}
          opponentName={opponentName}
          playerColor={playerColor}
          opponentColor={opponentColor}
          playerHearts={playerHearts}
          opponentHearts={opponentHearts}
          isMyTurn={isMyTurn}
          matchOver={matchOver}
          playerWon={playerWon}
          onTap={handleTap}
          opponentShot={opponentShot}
          playerHit={playerHit}
          opponentHit={opponentHit}
          roundStarting={roundStarting}
        />

        {matchOver && (
          <div className="match-overlay">
            <div className={`match-overlay__banner ${playerWon ? "match-overlay__banner--win" : "match-overlay__banner--lose"}`}>
              {playerWon ? "VICTORY" : "DEFEAT"}
            </div>
            <div className="match-overlay__subtext">
              {playerWon ? "Paint domination confirmed" : "Opponent outplayed you"}
            </div>
            <div className="match-overlay__actions">
              <button className="btn btn--primary" onClick={handleRematch}>
                REMATCH
              </button>
              <button className="btn btn--secondary" onClick={() => navigate("/")}>
                EXIT
              </button>
            </div>
          </div>
        )}

        {!connected && (
          <div className="game-warning-banner">DISCONNECTED - RECONNECTING...</div>
        )}
      </div>
    </div>
  );
}
