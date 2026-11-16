import type { Terms } from "./types";

/** 키 순서를 고정한 JSON. 같은 조건이면 언제나 같은 문자열이 나온다. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** 조건 스냅샷의 SHA-256 (Web Crypto). 16진수 64글자. */
export async function hashTerms(terms: Terms): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(terms));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
