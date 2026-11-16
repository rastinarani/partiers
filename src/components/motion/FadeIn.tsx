"use client";

import { useEffect, type ReactNode } from "react";
import { motion, useAnimationControls, type Transition } from "motion/react";
import { useReducedMotionSetting } from "./MotionProvider";

export default function FadeIn({ children, className, delay = 0 }: {
  children: ReactNode; className?: string; delay?: number;
}) {
  const reduced = useReducedMotionSetting();
  const controls = useAnimationControls();

  useEffect(() => {
    controls.set({ opacity: 1, y: 0 });
    if (!reduced) {
      // Motion supports this runtime option; its React transition type omits it.
      const transition = {
        reduceMotion: reduced, type: "tween", duration: 0.24,
        delay: Math.min(Math.max(delay, 0), 0.12), ease: "easeOut",
      } satisfies Transition & { reduceMotion: boolean };
      void controls.start({
        opacity: [0.75, 1], y: [8, 0],
        transition,
      });
    }
    return () => controls.stop();
  }, [controls, reduced, delay]);

  return (
    <motion.div className={className} data-motion="entrance" initial={false} animate={controls} style={{ opacity: 1, y: 0 }}>
      {children}
    </motion.div>
  );
}
