export const VERSION = "1.0.0";

export const FACTIONS = ["Hearts", "Spades", "Diamonds", "Clubs", "Jokers"];
export const PLAYABLE_FACTIONS = ["Hearts", "Spades", "Diamonds", "Clubs"];

export const ROW_ROLES = ["FRONT", "MIDDLE", "BACK"];
export const RARITIES = ["COMMON", "RARE", "EPIC", "LEGENDARY"];

export const DEFAULT_TARGET_COUNTS = {
  Hearts: 60,
  Spades: 60,
  Diamonds: 60,
  Clubs: 60,
  Jokers: 16
};

export const DEFAULT_ROW_ROLE_WEIGHTS = {
  FRONT: 0.35,
  MIDDLE: 0.45,
  BACK: 0.2
};

export const DEFAULT_RARITY_WEIGHTS = {
  COMMON: 0.55,
  RARE: 0.3,
  EPIC: 0.12,
  LEGENDARY: 0.03
};

export const RANK_NAME_MAP = {
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
  0: "JOKER"
};

export const NON_JOKER_BASE_RANK_COUNTS = {
  2: 4,
  3: 4,
  4: 4,
  5: 4,
  6: 4,
  7: 4,
  8: 4,
  9: 4,
  10: 4,
  11: 6,
  12: 6,
  13: 6,
  14: 6
};

export const RANKS_ASC = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export const RARITY_ORDER = {
  COMMON: 0,
  RARE: 1,
  EPIC: 2,
  LEGENDARY: 3
};

export const RARITY_GATES = {
  COMMON_PLUS: 0,
  RARE_PLUS: 1,
  EPIC_PLUS: 2,
  LEGENDARY_ONLY: 3,
  RARE_ONLY: 1,
  EPIC_ONLY: 2
};

export const FACTION_CODES = {
  Hearts: "HRT",
  Spades: "SPD",
  Diamonds: "DIA",
  Clubs: "CLB",
  Jokers: "JKR"
};

export const FACTION_PALETTES = {
  Hearts: "ivory, crimson, muted gold",
  Spades: "gunmetal, deep navy, steel white",
  Diamonds: "teal, silver, prism cyan",
  Clubs: "rust, grime green, soot black",
  Jokers: "iridescent shard violet, sickly neon, fractured white"
};

export const FACTION_ARCHETYPES = {
  Hearts: {
    FRONT: ["Vanguard Knight", "Blood Oath Sentinel", "Covenant Duelist"],
    MIDDLE: ["Ritual Marshal", "Banner Warden", "Choir Shieldbearer"],
    BACK: ["Bloodline Scribe", "Relic Cantor", "Aegis Liturgist"]
  },
  Spades: {
    FRONT: ["Breach Constable", "Suppression Trooper", "Shieldline Enforcer"],
    MIDDLE: ["Intercept Officer", "Countermeasure Sergeant", "Formation Tactician"],
    BACK: ["Signals Arbiter", "Overwatch Magistrate", "Doctrine Analyst"]
  },
  Diamonds: {
    FRONT: ["Precision Harrier", "Probability Fencer", "Shardline Duelist"],
    MIDDLE: ["Forecast Operator", "Vector Savant", "Outcome Broker"],
    BACK: ["Augury Director", "Fragment Auditor", "Continuum Cartographer"]
  },
  Clubs: {
    FRONT: ["Scrap Bruiser", "Rivet Butcher", "Tunnel Reaver"],
    MIDDLE: ["Cutpurse Engineer", "Corrosion Runner", "Salvage Raider"],
    BACK: ["Jury-Rig Alchemist", "Underhollow Tinkerer", "Black Market Spotter"]
  },
  Jokers: {
    FRONT: ["Shard Berserker", "Maskbreaker", "Laughing Rupture"],
    MIDDLE: ["Rift Juggler", "False Herald", "Chaos Broker"],
    BACK: ["Whisper Splitter", "Fracture Oracle", "Persona Parasite"]
  }
};

export const ROW_BIAS_WEIGHTS = {
  FRONT: { hp: 4.6, atk: 3.5, shieldCap: 1.5, chargeCap: 0.7 },
  MIDDLE: { hp: 2.8, atk: 2.6, shieldCap: 2.0, chargeCap: 2.2 },
  BACK: { hp: 1.8, atk: 1.5, shieldCap: 2.6, chargeCap: 3.1 }
};

export const ROW_MIN_STATS = {
  FRONT: { hp: 2, atk: 1, shieldCap: 0, chargeCap: 0 },
  MIDDLE: { hp: 1, atk: 1, shieldCap: 0, chargeCap: 0 },
  BACK: { hp: 1, atk: 0, shieldCap: 0, chargeCap: 1 }
};

export const ROW_BUILD_PHASE_CHANCE = {
  FRONT: 0.25,
  MIDDLE: 0.55,
  BACK: 0.72
};

export const FACTION_SYNERGY_HINTS = {
  Hearts: ["ritual", "shield", "loyalty", "formation", "bloodline"],
  Spades: ["discipline", "suppress", "intercept", "counter", "armor"],
  Diamonds: ["foresight", "precision", "probability", "mark", "charge"],
  Clubs: ["scrap", "steal", "corrosion", "sacrifice", "salvage"],
  Jokers: ["chaos", "distortion", "betrayal", "shard", "madness"]
};

export const DEFAULT_OUTPUT_FILES = {
  cards: "cards.generated.json",
  prompts: "prompts.generated.txt",
  report: "report.generated.md",
  deckpacks: "deckpacks.generated.json"
};

