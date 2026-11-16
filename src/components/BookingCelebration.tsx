"use client";

import { useEffect, useRef } from "react";
import { useReducedMotionSetting } from "./motion/MotionProvider";

export default function BookingCelebration() {
  const reduced = useReducedMotionSetting();
  const canvas = useRef<HTMLCanvasElement>(null);
  const played = useRef(false);
  useEffect(() => {
    if (reduced) {
      played.current = true;
      return;
    }
    if (played.current) return;
    let active = true;
    let reset: (() => void) | undefined;
    void import("canvas-confetti")
      .then(({ default: confetti }) => {
        if (
          !active ||
          !canvas.current ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        )
          return;
        played.current = true;
        const fire = confetti.create(canvas.current, { resize: true });
        reset = fire.reset;
        void fire({
          particleCount: 55,
          spread: 65,
          startVelocity: 28,
          ticks: 100,
          origin: { y: 0.65 },
          colors: ["#7c3aed", "#fb7185", "#f59e0b"],
          disableForReducedMotion: true,
        });
      })
      .catch(() => {
        /* A celebration must never affect a successfully saved booking. */
      });
    return () => {
      active = false;
      reset?.();
    };
  }, [reduced]);
  return reduced ? null : (
    <canvas
      ref={canvas}
      data-booking-celebration
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 h-full w-full"
    />
  );
}
