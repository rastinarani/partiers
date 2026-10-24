import { randomInt } from "crypto";

// No 0/O, 1/I/L: codes get read out over the phone.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const LENGTH = 4;

export const REFERENCE_CODE_RE = new RegExp(`^PT-[${ALPHABET}]{${LENGTH}}$`);

/** A short code like "PT-4F2K". Uniqueness is enforced by a database index. */
export function generateReferenceCode(): string {
  let code = "";
  for (let i = 0; i < LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return `PT-${code}`;
}
