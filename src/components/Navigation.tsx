"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import LoginLink from "./LoginLink";
import { useReducedMotionSetting } from "./motion/MotionProvider";
import { Button } from "./ui";

const links = [
  { href: "/", label: "Book Us" },
  { href: "/reviews", label: "Reviews" },
  { href: "/about", label: "About" },
];

export default function Navigation({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const reduced = useReducedMotionSetting();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => dialog.current?.close();

  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 640px)");
    const onResize = () => { if (desktop.matches) dialog.current?.close(); };
    desktop.addEventListener("change", onResize);
    return () => desktop.removeEventListener("change", onResize);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  function navigationLinks(mobile = false) {
    const linkClass = mobile
      ? "block rounded-xl px-4 py-3 hover:bg-primary-soft hover:text-primary"
      : "rounded-lg px-1 py-2 hover:text-foreground";
    const accountClass = mobile
      ? "block rounded-xl bg-primary-soft px-4 py-3 text-primary break-words"
      : "max-w-40 truncate rounded-full bg-primary-soft px-3 py-2 text-primary hover:opacity-80";
    return <>
      {links.map(({ href, label }) => (
        <Link key={href} href={href} className={linkClass} onClick={close}
          aria-current={pathname === href ? "page" : undefined}>
          {label}
        </Link>
      ))}
      {userName ? (
        <Link href="/account" onClick={close} className={accountClass}
          aria-label={`My account: ${userName}`}
          aria-current={pathname === "/account" ? "page" : undefined}>
          Hi, {userName.split(" ")[0]}
        </Link>
      ) : <LoginLink className={accountClass} onClick={close} />}
    </>;
  }

  return <>
    <nav aria-label="Main navigation" className="hidden min-w-0 items-center gap-5 text-sm font-medium text-muted sm:flex">
      {navigationLinks()}
    </nav>
    <Button variant="secondary" className="flex min-h-11 items-center gap-2 sm:hidden"
      aria-label="Open menu" aria-haspopup="dialog" aria-expanded={open} aria-controls="mobile-menu"
      onClick={() => { dialog.current?.showModal(); setOpen(true); }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
      Menu
    </Button>
    <dialog ref={dialog} id="mobile-menu" aria-labelledby="mobile-menu-title"
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-foreground backdrop:bg-foreground/35"
      onClose={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const items = event.currentTarget.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)");
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first?.focus();
        }
      }}>
      {open && <motion.div
        data-motion="drawer"
        initial={reduced ? false : { x: "100%" }} animate={{ x: 0 }}
        transition={{ type: "tween", duration: reduced ? 0 : 0.24, ease: "easeOut" }}
        className="ml-auto flex h-full w-[min(22rem,90%)] flex-col overflow-y-auto bg-card p-5 shadow-xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 id="mobile-menu-title" className="text-lg font-semibold">Explore Partiers</h2>
          <Button variant="secondary" onClick={close} autoFocus aria-label="Close menu" className="min-h-11">✕</Button>
        </div>
        <nav aria-label="Mobile navigation" className="flex flex-col gap-2 font-medium text-muted">
          {navigationLinks(true)}
        </nav>
        <p className="mt-auto pt-8 text-sm text-muted">A little more fun for families in Metro Vancouver.</p>
      </motion.div>}
    </dialog>
  </>;
}
