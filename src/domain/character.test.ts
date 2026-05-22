import { describe, expect, it } from "vitest";
import { createCharacter, normalizeBarcode } from "./character";

describe("createCharacter", () => {
  it("creates the same stats from the same barcode", () => {
    const first = createCharacter("4901234567894");
    const second = createCharacter("4901234567894");

    expect(first.stats).toEqual(second.stats);
  });

  it("keeps stats in the required ranges", () => {
    const character = createCharacter("4901234567894");

    expect(character.stats.hp).toBeGreaterThanOrEqual(80);
    expect(character.stats.hp).toBeLessThanOrEqual(200);
    expect(character.stats.power).toBeGreaterThanOrEqual(10);
    expect(character.stats.power).toBeLessThanOrEqual(50);
    expect(character.stats.defense).toBeGreaterThanOrEqual(5);
    expect(character.stats.defense).toBeLessThanOrEqual(40);
    expect(character.stats.speed).toBeGreaterThanOrEqual(5);
    expect(character.stats.speed).toBeLessThanOrEqual(35);
  });

  it("preserves the display name", () => {
    expect(createCharacter("12345", "プレイヤー").name).toBe("プレイヤー");
  });
});

describe("normalizeBarcode", () => {
  it("trims whitespace", () => {
    expect(normalizeBarcode("  12345  ")).toBe("12345");
  });
});
