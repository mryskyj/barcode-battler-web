export function hashString(input: string): number {
  let hash = 2166136261;

  for (const character of input) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
