import { useMemo, useRef } from "react";

function createAudioContext() {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
}

function safeVibrate(pattern: number | number[]) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    // ignore
  }
}

function playTone(freq: number, duration = 0.14, type: OscillatorType = "sine", gainLevel = 0.25) {
  const ctx = createAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(gainLevel, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration = 0.08, volume = 0.22) {
  const ctx = createAudioContext();
  if (!ctx) return;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.start(ctx.currentTime);
  source.stop(ctx.currentTime + duration);
}

export function useSoundEffects() {
  const contextRef = useRef<AudioContext | null>(null);

  return useMemo(
    () => ({
      shot: () => {
        const ctx = contextRef.current || createAudioContext();
        if (ctx) contextRef.current = ctx;
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "square";
        osc.frequency.setValueAtTime(320 + Math.random() * 80, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
        safeVibrate(18);
      },
      hit: () => {
        const ctx = contextRef.current || createAudioContext();
        if (ctx) contextRef.current = ctx;
        if (!ctx) return;
        playTone(180, 0.18, "sine", 0.35);
        playNoise(0.08, 0.2);
        safeVibrate([30, 10, 50]);
      },
      roundStart: () => {
        const ctx = contextRef.current || createAudioContext();
        if (ctx) contextRef.current = ctx;
        if (!ctx) return;
        [440, 550, 660].forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "triangle";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, ctx.currentTime + index * 0.12);
          gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + index * 0.12 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.12 + 0.15);
          osc.start(ctx.currentTime + index * 0.12);
          osc.stop(ctx.currentTime + index * 0.12 + 0.18);
        });
      },
      win: () => {
        const ctx = contextRef.current || createAudioContext();
        if (ctx) contextRef.current = ctx;
        if (!ctx) return;
        [523, 659, 784, 1047].forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "triangle";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, ctx.currentTime + index * 0.1);
          gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + index * 0.1 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.1 + 0.25);
          osc.start(ctx.currentTime + index * 0.1);
          osc.stop(ctx.currentTime + index * 0.1 + 0.28);
        });
      },
      lose: () => {
        const ctx = contextRef.current || createAudioContext();
        if (ctx) contextRef.current = ctx;
        if (!ctx) return;
        [400, 320, 240].forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sawtooth";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, ctx.currentTime + index * 0.15);
          gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + index * 0.15 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.15 + 0.22);
          osc.start(ctx.currentTime + index * 0.15);
          osc.stop(ctx.currentTime + index * 0.15 + 0.25);
        });
      },
    }),
    []
  );
}
