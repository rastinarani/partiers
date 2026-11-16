export const PUBLIC_FORM_KINDS = ["booking", "review", "login", "signup"] as const;
export type PublicFormKind = typeof PUBLIC_FORM_KINDS[number];
export const MIN_PUBLIC_FORM_MS = 2000;
export const MAX_PUBLIC_FORM_MS = 24 * 60 * 60 * 1000;
