import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { normalizeInput } from "@/lib/gameUtils";

interface Splat {
  x: number; y: number; r: number; color: string; alpha: number;
}
interface Projectile {
  id: number;
  x: number; y: number; tx: number; ty: number;
  color: string; speed: number; done: boolean;
}
interface HitSplat {
  x: number; y: number; r: number; color: string; alpha: number; decay: number;
}

export interface PaintballGame2DProps {
  playerName: string;
  opponentName: string;
  playerColor: string;
  opponentColor: string;
  playerHearts: number;
  opponentHearts: number;
  isMyTurn: boolean;
  matchOver: boolean;
  playerWon: boolean | null;
  onTap: (nx: number, ny: number) => void;
  opponentShot?: { nx: number; ny: number } | null;
  playerHit?: boolean;
  opponentHit?: boolean;
  roundStarting?: boolean;
}

const backgroundColors = ["#3498db", "#e67e22", "#2ecc71", "#9b59b6", "#e74c3c", "#f1c40f"];

function drawPaintSplat(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  const drips = 7;
  for (let i = 0; i < drips; i++) {
    const angle = (i / drips) * Math.PI * 2;
    const dr = r * (0.55 + Math.random() * 0.7);
    const dx = x + Math.cos(angle) * dr;
    const dy = y + Math.sin(angle) * dr * 0.65;
    const br = r * (0.18 + Math.random() * 0.18);
    ctx.beginPath();
    ctx.ellipse(dx, dy, br, br * 0.78, angle, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTireStack(ctx: CanvasRenderingContext2D, cx: number, cy: number, count: number, tireR: number) {
  for (let i = 0; i < count; i++) {
    const ty = cy - i * tireR * 1.6;
    ctx.beginPath();
    ctx.ellipse(cx, ty, tireR, tireR * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#121212";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, ty, tireR * 0.52, tireR * 0.28, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#282828";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - tireR * 0.2, ty - tireR * 0.12, tireR * 0.18, tireR * 0.08, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fill();
  }
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  bodyColor: string,
  tufColor: string,
  isEliminated: boolean,
  hitFlash: number,
  splatColor?: string,
) {
  const R = 32;
  ctx.save();
  if (isEliminated) {
    ctx.translate(cx, cy);
    ctx.scale(1, 0.84 + Math.sin(Date.now() * 0.008) * 0.12);
    ctx.translate(-cx, -cy);
  }

  if (hitFlash > 0) {
    ctx.save();
    ctx.globalAlpha = hitFlash * 0.45;
    ctx.fillStyle = splatColor || "#ff3b3b";
    ctx.beginPath();
    ctx.arc(cx, cy, R + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.beginPath();
  ctx.ellipse(cx, cy + R * 1.1, R * 0.55, R * 0.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#cccccc";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy - R + 4, R * 0.35, Math.PI, Math.PI * 2);
  ctx.fillStyle = tufColor;
  ctx.fill();

  if (isEliminated) {
    const eyeY = cy - 4;
    const eyeOffX = 11;
    ctx.strokeStyle = "#202020";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    [-1, 1].forEach((side) => {
      const ex = cx + side * eyeOffX;
      ctx.beginPath();
      ctx.moveTo(ex - 6, eyeY - 6);
      ctx.lineTo(ex + 6, eyeY + 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ex + 6, eyeY - 6);
      ctx.lineTo(ex - 6, eyeY + 6);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.arc(cx, cy + 10, 10, 0.2, Math.PI - 0.2);
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  } else {
    const dCx = cx - 12;
    const dCy = cy + 2;
    ctx.fillStyle = "#111";
    ctx.fillRect(dCx - 9, dCy - 3, 18, 6);
    ctx.fillRect(dCx - 3, dCy - 9, 6, 18);

    const btnCx = cx + 12;
    const btnCy = cy + 2;
    const btns = [
      { dx: 0, dy: -8, c: "#e74c3c" },
      { dx: 8, dy: 0, c: "#3498db" },
      { dx: 0, dy: 8, c: "#2ecc71" },
      { dx: -8, dy: 0, c: "#f39c12" },
    ];
    btns.forEach((b) => {
      ctx.beginPath();
      ctx.arc(btnCx + b.dx, btnCy + b.dy, 4, 0, Math.PI * 2);
      ctx.fillStyle = b.c;
      ctx.fill();
    });
    ctx.beginPath();
    ctx.moveTo(cx, cy + 14);
    ctx.lineTo(cx - 5, cy + 20);
    ctx.lineTo(cx + 5, cy + 20);
    ctx.closePath();
    ctx.fillStyle = "#e67e22";
    ctx.fill();
  }

  if (hitFlash > 0.25 && splatColor) {
    ctx.save();
    ctx.globalAlpha = hitFlash * 0.75;
    drawPaintSplat(ctx, cx + 10, cy - 10, R * 0.55, splatColor, 1);
    ctx.restore();
  }
  ctx.restore();
}

function clampVector(x: number, min: number, max: number) {
  return Math.max(min, Math.min(max, x));
}

export default function PaintballGame2D({
  playerName,
  opponentName,
  playerColor,
  opponentColor,
  playerHearts,
  opponentHearts,
  isMyTurn,
  matchOver,
  playerWon,
  onTap,
  opponentShot,
  playerHit = false,
  opponentHit = false,
  roundStarting = false,
}: PaintballGame2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const effectState = useRef({
    splats: [] as Splat[],
    projectiles: [] as Projectile[],
    hitSplats: [] as HitSplat[],
    playerHitFlash: 0,
    opponentHitFlash: 0,
    animFrame: 0,
    lastOpponentShot: null as { nx: number; ny: number } | null,
    lastPlayerHit: false,
    lastOpponentHit: false,
    lastRoundStarting: false,
    lastMatchOver: false,
    lastPlayerWon: null as boolean | null,
    lastTimestamp: 0,
    pauseUntil: 0,
    shake: 0,
    nextProjectileId: 1,
  });
  const [hitFlash, setHitFlash] = useState(false);
  const { shot, hit, roundStart, win, lose } = useSoundEffects();

  const backgroundSplats = useMemo(() =>
    Array.from({ length: 14 }, (_, index) => ({
      x: 80 + (index * 137) % 700,
      y: 200 + (index * 89) % 250,
      r: 28 + (index * 23) % 40,
      color: backgroundColors[index % backgroundColors.length],
      alpha: 0.5 + (index % 3) * 0.1,
    })),
    []);

  useEffect(() => {
    const state = effectState.current;
    if ((playerHit || opponentHit) && !(playerHit ? state.lastPlayerHit : state.lastOpponentHit)) {
      state.lastPlayerHit = playerHit;
      state.lastOpponentHit = opponentHit;
      state.pauseUntil = performance.now() + 80;
      state.shake = Math.max(state.shake, 1.2);
      setHitFlash(true);
      setTimeout(() => setHitFlash(false), 130);
      hit();
      const canvas = canvasRef.current;
      if (canvas) {
        const x = playerHit ? canvas.width * 0.18 : canvas.width * 0.82;
        const y = canvas.height * 0.35;
        const color = playerHit ? opponentColor : playerColor;
        state.hitSplats.push({ x, y, r: 42, color, alpha: 1, decay: 0.014 });
      }
    } else if (!playerHit) {
      state.lastPlayerHit = false;
    } else if (!opponentHit) {
      state.lastOpponentHit = false;
    }
  }, [playerHit, opponentHit, opponentColor, playerColor, hit]);

  useEffect(() => {
    if (roundStarting && !effectState.current.lastRoundStarting) {
      effectState.current.lastRoundStarting = true;
      roundStart();
    } else if (!roundStarting) {
      effectState.current.lastRoundStarting = false;
    }
  }, [roundStarting, roundStart]);

  useEffect(() => {
    if (matchOver && effectState.current.lastMatchOver === false) {
      effectState.current.lastMatchOver = true;
      if (playerWon) win(); else lose();
    }
  }, [matchOver, playerWon, win, lose]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const setSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(320, parent.clientWidth);
      const height = Math.max(240, parent.clientHeight);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    setSize();
    window.addEventListener("resize", setSize);
    return () => window.removeEventListener("resize", setSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let running = true;

    const drawScene = (ctx: CanvasRenderingContext2D, width: number, height: number, state: typeof effectState.current) => {
      ctx.save();
      const shake = state.shake;
      if (shake > 0) {
        const offsetX = (Math.random() - 0.5) * shake * 8;
        const offsetY = (Math.random() - 0.5) * shake * 6;
        ctx.translate(offsetX, offsetY);
      }

      ctx.fillStyle = "#101010";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 38) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 38) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      backgroundSplats.forEach((splat) => drawPaintSplat(ctx, splat.x * (width / 900), splat.y * (height / 500), splat.r * (width / 900), splat.color, splat.alpha));
      const tire = Math.max(18, width * 0.032);
      drawTireStack(ctx, width * 0.38, height * 0.72, 3, tire);
      drawTireStack(ctx, width * 0.38 + tire * 2.2, height * 0.72, 2, tire);
      drawTireStack(ctx, width * 0.38 - tire * 2.2, height * 0.72, 2, tire);
      drawTireStack(ctx, width * 0.5, height * 0.68, 4, tire * 1.1);
      drawTireStack(ctx, width * 0.5 + tire * 2.5, height * 0.72, 3, tire);
      drawTireStack(ctx, width * 0.5 - tire * 2.5, height * 0.72, 3, tire);
      drawTireStack(ctx, width * 0.62, height * 0.72, 3, tire);
      drawTireStack(ctx, width * 0.62 + tire * 2.2, height * 0.72, 2, tire);
      drawTireStack(ctx, width * 0.62 - tire * 2.2, height * 0.72, 2, tire);

      state.hitSplats = state.hitSplats.filter((hs) => hs.alpha > 0.01);
      state.hitSplats.forEach((spl) => {
        drawPaintSplat(ctx, spl.x, spl.y, spl.r, spl.color, spl.alpha);
        spl.alpha -= spl.decay;
      });

      state.projectiles = state.projectiles.filter((projectile) => !projectile.done);
      state.projectiles.forEach((projectile) => {
        const dx = projectile.tx - projectile.x;
        const dy = projectile.ty - projectile.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < projectile.speed + 4) {
          state.splats.push({ x: projectile.tx, y: projectile.ty, r: 12 + Math.random() * 10, color: projectile.color, alpha: 0.88 });
          projectile.done = true;
          return;
        }
        const moveX = (dx / dist) * projectile.speed;
        const moveY = (dy / dist) * projectile.speed;
        projectile.x += moveX;
        projectile.y += moveY;
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = projectile.color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(projectile.x - 2, projectile.y - 2, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fill();
      });

      state.splats.forEach((splat) => drawPaintSplat(ctx, splat.x, splat.y, splat.r, splat.color, splat.alpha));
      const pidx = Math.abs(playerName.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 0)) % 5;
      const oidx = Math.abs(opponentName.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 0) + 3) % 5;
      const playerR = playerHearts <= 0;
      const opponentR = opponentHearts <= 0;
      const playerPalette = ["#27ae60", "#8e44ad", "#2980b9", "#c0392b", "#d35400"];

      drawCharacter(ctx, width * 0.18, height * 0.35, playerPalette[pidx], playerColor, playerR, state.playerHitFlash, opponentColor);
      drawCharacter(ctx, width * 0.82, height * 0.35, playerPalette[oidx], opponentColor, opponentR, state.opponentHitFlash, playerColor);

      if (state.playerHitFlash > 0) state.playerHitFlash = Math.max(0, state.playerHitFlash - 0.05);
      if (state.opponentHitFlash > 0) state.opponentHitFlash = Math.max(0, state.opponentHitFlash - 0.05);
      if (state.shake > 0) state.shake = Math.max(0, state.shake - 1.8 * 0.016);

      if (!matchOver) {
        ctx.save();
        ctx.font = `bold ${Math.max(12, width * 0.018)}px 'Share Tech Mono', monospace`;
        ctx.textAlign = "center";
        ctx.fillStyle = isMyTurn ? "#27ae60" : "#e74c3c";
        ctx.fillText(isMyTurn ? "TAP TO SHOOT" : "OPPONENT TURN", width * 0.5, height * 0.90);
        ctx.restore();
      }

      ctx.restore();
    };

    const frame = (timestamp: number) => {
      if (!running) return;
      const state = effectState.current;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (state.lastTimestamp === 0) state.lastTimestamp = timestamp;
      const dt = Math.min((timestamp - state.lastTimestamp) / 1000, 0.032);
      state.lastTimestamp = timestamp;

      if (timestamp < state.pauseUntil) {
        drawScene(ctx, width, height, state);
        state.animFrame = requestAnimationFrame(frame);
        return;
      }

      drawScene(ctx, width, height, state);
      state.animFrame = requestAnimationFrame(frame);
    };

    const state = effectState.current;
    state.animFrame = requestAnimationFrame(frame);
    return () => {
      running = false;
      cancelAnimationFrame(state.animFrame);
    };
  }, [backgroundSplats, isMyTurn, matchOver, opponentColor, playerColor, playerHearts, opponentHearts, playerName, opponentName]);

  const handleTap = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    if (matchOver || !isMyTurn) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const { nx, ny } = normalizeInput(x, y, rect.width, rect.height);
    const state = effectState.current;
    const id = state.nextProjectileId++;
    state.projectiles.push({
      id,
      x: rect.width * 0.18,
      y: rect.height * 0.35,
      tx: nx * rect.width,
      ty: ny * rect.height,
      color: playerColor,
      speed: 16,
      done: false,
    });
    shot();
    onTap(nx, ny);
  }, [matchOver, isMyTurn, onTap, playerColor, shot]);

  useEffect(() => {
    if (!opponentShot) return;
    const state = effectState.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (state.lastOpponentShot?.nx === opponentShot.nx && state.lastOpponentShot?.ny === opponentShot.ny) return;
    state.lastOpponentShot = opponentShot;
    state.projectiles.push({
      id: state.nextProjectileId++,
      x: canvas.clientWidth * 0.82,
      y: canvas.clientHeight * 0.35,
      tx: opponentShot.nx * canvas.clientWidth,
      ty: opponentShot.ny * canvas.clientHeight,
      color: opponentColor,
      speed: 14,
      done: false,
    });
    shot();
  }, [opponentShot, opponentColor, shot]);

  return (
    <div className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        onPointerDown={handleTap}
      />
      <div className={`impact-overlay ${hitFlash ? "impact-overlay--active" : ""}`} />
    </div>
  );
}
