"use client";

import { useEffect, useId, useState } from "react";
import { MIN_PUBLIC_FORM_MS, type PublicFormKind } from "@/lib/publicFormRules";
import { Button, FormError } from "./ui";

export function usePublicFormProtection(kind: PublicFormKind) {
  const [token, setToken] = useState("");
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    fetch(`/api/form-token?form=${kind}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Form unavailable");
        const data = await response.json();
        if (typeof data.token !== "string" || !data.token) throw new Error("Form unavailable");
        if (controller.signal.aborted) return;
        setToken(data.token);
        // A small margin avoids a borderline rejection after clock/network jitter.
        timer = setTimeout(() => setStatus("ready"), MIN_PUBLIC_FORM_MS + 200);
      })
      .catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => { controller.abort(); clearTimeout(timer); };
  }, [kind, version]);
  return {
    ready: status === "ready", failed: status === "error",
    retry() { setStatus("loading"); setToken(""); setVersion((value) => value + 1); },
    payload(form: HTMLFormElement) {
      return { formToken: token, website: new FormData(form).get("website") ?? "" };
    },
  };
}

export default function PublicFormProtection({ protection }: { protection: ReturnType<typeof usePublicFormProtection> }) {
  const id = useId();
  return <>
    <div aria-hidden="true" className="absolute -left-[10000px] top-0 h-px w-px overflow-hidden">
      <label htmlFor={id}>Company website</label>
      <input id={id} name="website" type="text" autoComplete="off" tabIndex={-1} defaultValue="" />
    </div>
    {protection.failed ? <div className="space-y-2">
      <FormError>We couldn’t load the form. Your details are still here.</FormError>
      <Button variant="secondary" onClick={(event) => {
        const form = event.currentTarget.form;
        protection.retry();
        form?.querySelector<HTMLElement>('input:not([name="website"]), select, textarea, h2[tabindex="-1"]')?.focus();
      }}>Retry loading form</Button>
    </div> : !protection.ready ? <p role="status" className="text-sm text-muted">Getting the form ready…</p> : null}
  </>;
}
