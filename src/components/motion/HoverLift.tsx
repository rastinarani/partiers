"use client";

import type { ReactNode } from "react";
import { motion, type Transition } from "motion/react";
import { useReducedMotionSetting } from "./MotionProvider";

export default function HoverLift({ children }: { children: ReactNode }) {
  const reduced = useReducedMotionSetting();
  const transition = { duration: 0.18, ease: "easeOut", reduceMotion: reduced } satisfies Transition & { reduceMotion: boolean };
  return (
    <motion.div data-motion="hover" initial={false} animate={{ y: 0 }} whileHover={reduced ? { y: 0 } : { y: -3 }} transition={transition}>
      {children}
    </motion.div>
  );
}
