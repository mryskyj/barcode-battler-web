import { hashString } from "./hash";

export type CharacterStats = {
  hp: number;
  power: number;
  defense: number;
  speed: number;
};

export type Character = {
  id: string;
  name: string;
  barcode: string;
  stats: CharacterStats;
};

type StatRange = {
  min: number;
  max: number;
};

const STAT_RANGES = {
  hp: { min: 80, max: 200 },
  power: { min: 10, max: 50 },
  defense: { min: 5, max: 40 },
  speed: { min: 5, max: 35 },
} satisfies Record<keyof CharacterStats, StatRange>;

export function createCharacter(barcode: string, name = "バトラー"): Character {
  const normalizedBarcode = normalizeBarcode(barcode);

  return {
    id: hashString(normalizedBarcode).toString(16),
    name,
    barcode: normalizedBarcode,
    stats: {
      hp: statFromHash(normalizedBarcode, "hp", STAT_RANGES.hp),
      power: statFromHash(normalizedBarcode, "power", STAT_RANGES.power),
      defense: statFromHash(normalizedBarcode, "defense", STAT_RANGES.defense),
      speed: statFromHash(normalizedBarcode, "speed", STAT_RANGES.speed),
    },
  };
}

export function normalizeBarcode(barcode: string): string {
  return barcode.trim();
}

function statFromHash(
  barcode: string,
  statName: keyof CharacterStats,
  range: StatRange,
): number {
  const width = range.max - range.min + 1;
  return range.min + (hashString(`${barcode}:${statName}`) % width);
}
