"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { MotionConfig } from "motion/react";

const ReducedMotionContext = createContext(true);
const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const preference = window.matchMedia(QUERY);
  preference.addEventListener("change", onChange);
  return () => preference.removeEventListener("change", onChange);
}

function getPreference() {
  return window.matchMedia(QUERY).matches;
}

export function useReducedMotionSetting() {
  return useContext(ReducedMotionContext);
}

export default function MotionProvider({ children }: { children: ReactNode }) {
  // Stay still until the browser preference is known, and react to live changes.
  const reduced = useSyncExternalStore(subscribe, getPreference, () => true);
  return (
    <ReducedMotionContext value={reduced}>
      <MotionConfig reducedMotion={reduced ? "always" : "never"} transition={{ type: "tween", duration: 0.24, ease: "easeOut" }}>
        {children}
      </MotionConfig>
    </ReducedMotionContext>
  );
}
