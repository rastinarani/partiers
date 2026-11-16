import { DEFAULT_DURATION, isDuration } from "./schedule";
import { isActivity, isEventType } from "./eventOptions";
import { validateBookingStep } from "./validation";
import type { BookingDraft } from "./types";

export interface BookingDraftState {
  values: BookingDraft;
  step: number;
}

export function emptyBookingDraft(
  parentName = "",
  contact = "",
): BookingDraftState {
  return {
    step: 0,
    values: {
      date: "",
      time: "",
      durationMinutes: DEFAULT_DURATION,
      eventType: "",
      location: "",
      activities: [],
      notes: "",
      parentName,
      contact,
      childName: "",
      childAge: "",
      numberOfChildren: "1",
    },
  };
}

export function encodeBookingDraft(
  state: BookingDraftState,
  now = Date.now(),
): string {
  return JSON.stringify({ version: 1, savedAt: now, ...state });
}

export function decodeBookingDraft(
  raw: string | null,
  today: string,
  now = Date.now(),
): BookingDraftState | null {
  if (!raw || raw.length > 20000) return null;
  try {
    const saved = JSON.parse(raw);
    if (
      saved?.version !== 1 ||
      typeof saved.savedAt !== "number" ||
      saved.savedAt > now ||
      now - saved.savedAt > 24 * 60 * 60 * 1000
    )
      return null;
    if (
      !Number.isInteger(saved.step) ||
      saved.step < 0 ||
      saved.step > 4 ||
      !saved.values ||
      typeof saved.values !== "object"
    )
      return null;
    const defaults = emptyBookingDraft().values;
    const values = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof BookingDraft)[]) {
      if (key === "durationMinutes") {
        if (!isDuration(saved.values[key])) return null;
        values[key] = saved.values[key];
      } else if (key === "activities") {
        if (
          !Array.isArray(saved.values[key]) ||
          !saved.values[key].every(isActivity)
        )
          return null;
        values[key] = [
          ...new Set(saved.values[key]),
        ] as BookingDraft["activities"];
      } else if (key === "eventType") {
        if (saved.values[key] !== "" && !isEventType(saved.values[key]))
          return null;
        values[key] = saved.values[key];
      } else {
        if (
          typeof saved.values[key] !== "string" ||
          saved.values[key].length > (key === "notes" ? 1000 : 200)
        )
          return null;
        values[key] = saved.values[key];
      }
    }
    let step = saved.step;
    for (let earlier = 0; earlier < step; earlier++) {
      if (validateBookingStep(earlier, values, today)) {
        step = earlier;
        break;
      }
    }
    if (values.date && validateBookingStep(0, values, today)) {
      values.date = "";
      values.time = "";
      step = 0;
    }
    return { values, step };
  } catch {
    return null;
  }
}
