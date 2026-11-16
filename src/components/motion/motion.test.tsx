// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useContext } from "react";
import { MotionConfigContext } from "motion/react";
import MotionProvider, { useReducedMotionSetting } from "./MotionProvider";
import FadeIn from "./FadeIn";
import StaggerChildren from "./StaggerChildren";

let reduced = false;
const listeners = new Set<() => void>();
beforeEach(() => {
  reduced = false;
  listeners.clear();
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    get matches() { return reduced; }, media: "(prefers-reduced-motion: reduce)",
    addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
    addListener: vi.fn(), removeListener: vi.fn(),
  })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function Policy() {
  const setting = useReducedMotionSetting();
  const config = useContext(MotionConfigContext);
  return <p>{String(setting)}:{config.reducedMotion}</p>;
}

describe("animation accessibility", () => {
  it("uses the device setting and responds when it changes without reloading", () => {
    const { unmount } = render(<MotionProvider><Policy /></MotionProvider>);
    expect(screen.getByText("false:never")).toBeDefined();
    act(() => { reduced = true; listeners.forEach((listener) => listener()); });
    expect(screen.getByText("true:always")).toBeDefined();
    act(() => { reduced = false; listeners.forEach((listener) => listener()); });
    expect(screen.getByText("false:never")).toBeDefined();
    unmount(); expect(listeners.size).toBe(0);
  });
  it("keeps server-rendered content visible without JavaScript", () => {
    const html = renderToStaticMarkup(<MotionProvider><StaggerChildren><p>First</p><p>Second</p></StaggerChildren></MotionProvider>);
    expect(html).toContain("First"); expect(html).toContain("Second");
    expect(html).not.toContain("opacity:0"); expect(html).not.toContain("translateY");
  });
  it("never translates or hides content when reduced motion is on", () => {
    reduced = true;
    const { container } = render(<MotionProvider><FadeIn><button>Ready now</button></FadeIn></MotionProvider>);
    const animated = container.querySelector<HTMLElement>("[data-motion]")!;
    expect(animated.style.opacity).toBe("1"); expect(animated.style.transform).toBe("none");
    expect(screen.getByRole("button", { name: "Ready now" })).toBeDefined();
  });
  it("settles the normal entrance and resets movement when reduction is enabled", async () => {
    const { container } = render(<MotionProvider><FadeIn>Visible content</FadeIn></MotionProvider>);
    const animated = container.querySelector<HTMLElement>("[data-motion]")!;
    await waitFor(() => expect(animated.style.transform).toContain("translateY"));
    act(() => { reduced = true; listeners.forEach((listener) => listener()); });
    await waitFor(() => { expect(animated.style.transform).toBe("none"); expect(animated.style.opacity).toBe("1"); });
  });
});
