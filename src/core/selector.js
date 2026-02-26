import {
  DEFAULT_RARITY_WEIGHTS,
  DEFAULT_ROW_ROLE_WEIGHTS,
  NON_JOKER_BASE_RANK_COUNTS,
  PLAYABLE_FACTIONS,
  RARITY_GATES,
  RARITY_ORDER,
  RARITIES,
  ROW_ROLES,
  RANKS_ASC
} from "./constants.js";

function buildRoundedPlan(count, weights, order) {
  const items = order.map((key) => {
    const raw = (weights[key] ?? 0) * count;
    return { key, raw, floor: Math.floor(raw), frac: raw - Math.floor(raw) };
  });
  let allocated = items.reduce((sum, item) => sum + item.floor, 0);
  let remainder = count - allocated;
  items.sort((a, b) => b.frac - a.frac || order.indexOf(a.key) - order.indexOf(b.key));
  for (let i = 0; i < items.length && remainder > 0; i += 1) {
    items[i].floor += 1;
    remainder -= 1;
  }
  const counts = Object.fromEntries(items.map((i) => [i.key, i.floor]));
  const plan = [];
  for (const key of order) {
    for (let n = 0; n < (counts[key] ?? 0); n += 1) plan.push(key);
  }
  return { counts, plan };
}

export function buildRowRolePlan(count, rowWeights = DEFAULT_ROW_ROLE_WEIGHTS) {
  return buildRoundedPlan(count, rowWeights, ROW_ROLES);
}

export function buildRarityPlan(count, rarityWeights = DEFAULT_RARITY_WEIGHTS, { forceLegendary = false } = {}) {
  if (forceLegendary) {
    return {
      counts: { COMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: count },
      plan: Array.from({ length: count }, () => "LEGENDARY")
    };
  }
  return buildRoundedPlan(count, rarityWeights, RARITIES);
}

export function buildRankPlanForFaction(faction, count) {
  if (faction === "Jokers") {
    return {
      counts: { JOKER: count },
      plan: Array.from({ length: count }, () => 0)
    };
  }

  if (!PLAYABLE_FACTIONS.includes(faction)) {
    throw new Error(`Unsupported faction for rank plan: ${faction}`);
  }

  const baseTotal = Object.values(NON_JOKER_BASE_RANK_COUNTS).reduce((a, b) => a + b, 0);
  if (count === baseTotal) {
    const plan = [];
    for (const rank of RANKS_ASC) {
      for (let i = 0; i < NON_JOKER_BASE_RANK_COUNTS[rank]; i += 1) plan.push(rank);
    }
    return { counts: { ...NON_JOKER_BASE_RANK_COUNTS }, plan };
  }

  const scaled = RANKS_ASC.map((rank) => {
    const raw = (NON_JOKER_BASE_RANK_COUNTS[rank] / baseTotal) * count;
    return { rank, raw, count: Math.floor(raw), frac: raw - Math.floor(raw) };
  });
  let used = scaled.reduce((sum, item) => sum + item.count, 0);
  let remainder = count - used;
  scaled.sort((a, b) => b.frac - a.frac || b.rank - a.rank);
  for (let i = 0; i < scaled.length && remainder > 0; i += 1) {
    scaled[i].count += 1;
    remainder -= 1;
  }
  scaled.sort((a, b) => a.rank - b.rank);
  const counts = {};
  const plan = [];
  for (const item of scaled) {
    counts[item.rank] = item.count;
    for (let i = 0; i < item.count; i += 1) plan.push(item.rank);
  }
  return { counts, plan };
}

export function expandPlanWithShuffle(rng, plan) {
  return rng.shuffle(plan);
}

export function rarityGateAllows(cardRarity, rarityGate) {
  if (!rarityGate) return true;
  if (rarityGate === "RARE_ONLY") return cardRarity === "RARE";
  if (rarityGate === "EPIC_ONLY") return cardRarity === "EPIC";
  return RARITY_ORDER[cardRarity] >= (RARITY_GATES[rarityGate] ?? 0);
}

export function filterAbilities(library, { faction, rowRole, timing, rarity, maxComplexity }) {
  return library.filter((ability) => {
    if (ability.timing !== timing) return false;
    if (!(ability.factions.includes("Any") || ability.factions.includes(faction))) return false;
    if (!(ability.rowRoles.includes("ANY") || ability.rowRoles.includes(rowRole))) return false;
    if (!rarityGateAllows(rarity, ability.rarityGate)) return false;
    if (typeof maxComplexity === "number" && ability.complexity > maxComplexity) return false;
    return true;
  });
}

export function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

