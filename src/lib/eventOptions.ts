// Choices for the booking form. Keys are what's stored in MongoDB; labels
// are what people see. Safe to import from client components.

export const EVENT_TYPES = {
  birthday: "Birthday party",
  playdate: "Playdate",
  family: "Family gathering",
  other: "Other",
} as const;
export type EventType = keyof typeof EVENT_TYPES;

export const ACTIVITIES = {
  games: "Games",
  crafts: "Crafts",
  facePainting: "Face painting",
  balloonAnimals: "Balloon animals",
  scavengerHunt: "Scavenger hunt",
} as const;
export type Activity = keyof typeof ACTIVITIES;

export function isEventType(value: unknown): value is EventType {
  return typeof value === "string" && Object.hasOwn(EVENT_TYPES, value);
}

export function isActivity(value: unknown): value is Activity {
  return typeof value === "string" && Object.hasOwn(ACTIVITIES, value);
}
