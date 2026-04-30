import { useRef, useCallback, useEffect } from "react";

interface JoystickProps {
  onMove: (dx: number, dy: number) => void; // -1 to 1
  side: "left" | "right";
  label?: string;
  color?: string;
}

export default function Joystick({ onMove, side, label, color = "#00e5ff" }: JoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeTouch = useRef<number | null>(null);
  const baseCenter = useRef({ x: 0, y: 0 });
  const maxRadius = 40;

  const updateKnob = useCallback((clientX: number, clientY: number) => {
    const cx = baseCenter.current.x;
    const cy = baseCenter.current.y;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    if (knobRef.current) {
      knobRef.current.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
    }

    onMove(knobX / maxRadius, knobY / maxRadius);
  }, [onMove]);

  const resetKnob = useCallback(() => {
    if (knobRef.current) {
      knobRef.current.style.transform = "translate(-50%, -50%)";
    }
    onMove(0, 0);
  }, [onMove]);

  useEffect(() => {
    const base = baseRef.current;
    if (!base) return;

    const onTouchStart = (e: TouchEvent) => {
      if (activeTouch.current !== null) return;
      const touch = e.changedTouches[0];
      activeTouch.current = touch.identifier;
      const rect = base.getBoundingClientRect();
      baseCenter.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      updateKnob(touch.clientX, touch.clientY);
      e.preventDefault();
    };

    const onTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === activeTouch.current) {
          updateKnob(touch.clientX, touch.clientY);
          e.preventDefault();
          break;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouch.current) {
          activeTouch.current = null;
          resetKnob();
          break;
        }
      }
    };

    base.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      base.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [updateKnob, resetKnob]);

  // Mouse support for desktop testing
  const isDragging = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    const rect = baseRef.current!.getBoundingClientRect();
    baseCenter.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    updateKnob(e.clientX, e.clientY);
  }, [updateKnob]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging.current) updateKnob(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      if (isDragging.current) { isDragging.current = false; resetKnob(); }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [updateKnob, resetKnob]);

  return (
    <div
      ref={baseRef}
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        bottom: side === "left" ? "24px" : "24px",
        left: side === "left" ? "24px" : undefined,
        right: side === "right" ? "24px" : undefined,
        width: "100px",
        height: "100px",
        borderRadius: "50%",
        background: "rgba(0,0,0,0.35)",
        border: `2px solid ${color}44`,
        userSelect: "none",
        touchAction: "none",
        cursor: "grab",
      }}
    >
      {/* Knob */}
      <div
        ref={knobRef}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          background: `${color}cc`,
          border: `2px solid ${color}`,
          boxShadow: `0 0 12px ${color}88`,
          pointerEvents: "none",
          transition: "transform 0.05s",
        }}
      />
      {label && (
        <div style={{
          position: "absolute",
          bottom: "-22px",
          left: "50%",
          transform: "translateX(-50%)",
          color: `${color}99`,
          fontSize: "10px",
          fontFamily: "monospace",
          letterSpacing: "2px",
          whiteSpace: "nowrap",
        }}>
          {label}
        </div>
      )}
    </div>
  );
}
