"use client";

import { Children, isValidElement, type ReactNode } from "react";
import FadeIn from "./FadeIn";

export default function StaggerChildren({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      {Children.toArray(children).map((child, index) => (
        <FadeIn key={isValidElement(child) ? child.key : index} delay={index * 0.04}>{child}</FadeIn>
      ))}
    </div>
  );
}
