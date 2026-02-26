import path from "node:path";
import { calcCostsSummary, fitsBudget } from "./budget.js";
import { buildDeckpacks } from "./deckpacks.js";
import { buildLore } from "./loreBuilder.js";
import { createNameBuilder } from "./nameBuilder.js";
import { buildArtPrompt } from "./promptBuilder.js";
import { RNG } from "./rng.js";
import { buildReportMarkdown } from "./report.js";
import {
  buildRarityPlan,
  buildRankPlanForFaction,
  buildRowRolePlan,
  expandPlanWithShuffle,
  filterAbilities
} from "./selector.js";
import {
  DEFAULT_OUTPUT_FILES,
  DEFAULT_RARITY_WEIGHTS,
  DEFAULT_ROW_ROLE_WEIGHTS,
  DEFAULT_TARGET_COUNTS,
  FACTION_ARCHETYPES,
  FACTION_SYNERGY_HINTS,
  PLAYABLE_FACTIONS,
  RANKS_ASC,
  RANK_NAME_MAP,
  ROW_BIAS_WEIGHTS,
  ROW_BUILD_PHASE_CHANCE,
  ROW_MIN_STATS,
  VERSION
} from "./constants.js";
import { createCardId } from "../utils/ids.js";
import { projectRootFrom, readJson } from "../utils/io.js";
import { validateCardsData, validateDeckpacksData } from "../utils/validateSchema.js";

function deepMergeCounts(userCounts) {
  const counts = { ...DEFAULT_TARGET_COUNTS };
  if (!userCounts || typeof userCounts !== "object") return counts;
  for (const key of Object.keys(counts)) {
    if (key in userCounts) {
      const value = Number(userCounts[key]);
      if (Number.isInteger(value) && value > 0) counts[key] = value;
    }
  }
  return counts;
}

function normalizeLibrary(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.abilities)) return raw.abilities;
  throw new Error("abilityLibrary.json must contain an abilities array");
}

function cloneAbilityForCard(ability) {
  return {
    id: ability.id,
    name: ability.name,
    timing: ability.timing,
    cost: ability.cost,
    text: ability.text,
    tags: [...ability.tags]
  };
}

function preferredTags({ faction, rowRole }) {
  const tags = new Set(FACTION_SYNERGY_HINTS[faction] ?? []);
  if (rowRole === "FRONT") {
    tags.add("breach");
    tags.add("pressure");
  }
  if (rowRole === "MIDDLE") {
    tags.add("formation");
    tags.add("counter");
  }
  if (rowRole === "BACK") {
    tags.add("charge");
    tags.add("info");
    tags.add("ranged");
  }
  return tags;
}

function abilityOverlapWeight(ability, prefTags, faction) {
  let weight = 1;
  if (ability.factions.includes(faction)) weight += 2;
  if (ability.rowRoles.includes("ANY")) weight += 0.1;
  let overlap = 0;
  for (const tag of ability.tags) {
    if (prefTags.has(tag)) overlap += 1;
  }
  weight += overlap * 0.75;
  weight += Math.max(0, 3 - ability.complexity) * 0.1;
  return weight;
}

function weightedPickAbility(rng, abilities, prefTags, faction) {
  if (abilities.length === 0) return null;
  const entries = abilities.map((ability) => [ability, abilityOverlapWeight(ability, prefTags, faction)]);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng.float() * total;
  for (const [ability, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return ability;
  }
  return entries[entries.length - 1][0];
}

function maxComplexityFor({ rowRole, rarity }) {
  if (rowRole === "FRONT") {
    if (rarity === "COMMON") return 1;
    if (rarity === "RARE") return 2;
    return 2;
  }
  if (rowRole === "MIDDLE") {
    return rarity === "COMMON" ? 2 : 3;
  }
  return 3;
}

function minStatsCost(rowRole) {
  const min = ROW_MIN_STATS[rowRole];
  return min.hp + min.atk + min.shieldCap + min.chargeCap;
}

function pickAbilitiesForCard({ rng, library, faction, rowRole, rarity, budgetCap }) {
  const prefTags = preferredTags({ faction, rowRole });
  const maxComplexity = maxComplexityFor({ rowRole, rarity });
  const minStat = minStatsCost(rowRole);

  const detCandidatesBase = filterAbilities(library, { faction, rowRole, timing: "detonation", rarity, maxComplexity });
  const detCandidatesFallback = detCandidatesBase.length
    ? detCandidatesBase
    : filterAbilities(library, { faction, rowRole, timing: "detonation", rarity });

  if (detCandidatesFallback.length === 0) {
    throw new Error(`No detonation abilities available for ${faction} ${rowRole} ${rarity}`);
  }

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const detPool = detCandidatesFallback.filter((a) => a.cost <= budgetCap - minStat) || detCandidatesFallback;
    const detonation = weightedPickAbility(rng, detPool.length ? detPool : detCandidatesFallback, prefTags, faction);
    if (!detonation) continue;

    const buildChanceBase = ROW_BUILD_PHASE_CHANCE[rowRole] ?? 0.5;
    const rarityBoost = rarity === "COMMON" ? -0.05 : rarity === "RARE" ? 0.05 : rarity === "EPIC" ? 0.15 : 0.2;
    const jokerBoost = faction === "Jokers" ? 0.2 : 0;
    const wantsBuild = rng.chance(Math.max(0, Math.min(0.95, buildChanceBase + rarityBoost + jokerBoost)));

    let buildPhase = null;
    if (wantsBuild) {
      const remainingAfterDetMin = budgetCap - detonation.cost - minStat;
      const buildCandidatesBase = filterAbilities(library, { faction, rowRole, timing: "buildPhase", rarity, maxComplexity });
      const buildCandidatesFallback = buildCandidatesBase.length
        ? buildCandidatesBase
        : filterAbilities(library, { faction, rowRole, timing: "buildPhase", rarity });
      const affordableBuilds = buildCandidatesFallback.filter((a) => a.cost <= remainingAfterDetMin);
      if (affordableBuilds.length > 0) {
        buildPhase = weightedPickAbility(rng, affordableBuilds, prefTags, faction);
      }
    }

    const abilities = {
      buildPhase: buildPhase ? cloneAbilityForCard(buildPhase) : null,
      detonation: cloneAbilityForCard(detonation)
    };
    const abilityCost = (abilities.buildPhase?.cost ?? 0) + abilities.detonation.cost;
    if (abilityCost <= budgetCap - minStat) return abilities;
  }

  throw new Error(`Failed to assign abilities for ${faction} ${rowRole} ${rarity} within budget ${budgetCap}`);
}

function getStatWeights({ faction, rowRole, rng }) {
  const base = { ...ROW_BIAS_WEIGHTS[rowRole] };
  if (faction === "Hearts") {
    base.hp += 0.6;
    base.shieldCap += 0.8;
    base.chargeCap -= 0.2;
  } else if (faction === "Spades") {
    base.atk += 0.4;
    base.shieldCap += 0.7;
    base.chargeCap -= 0.1;
  } else if (faction === "Diamonds") {
    base.chargeCap += 1.0;
    base.atk += 0.4;
    base.hp -= 0.2;
  } else if (faction === "Clubs") {
    base.atk += 0.5;
    base.chargeCap += 0.5;
    base.shieldCap -= 0.1;
  } else if (faction === "Jokers") {
    base.hp += rng.float() * 1.5 - 0.5;
    base.atk += rng.float() * 1.5 - 0.5;
    base.shieldCap += rng.float() * 1.5 - 0.5;
    base.chargeCap += rng.float() * 1.5 - 0.5;
  }
  for (const k of Object.keys(base)) {
    if (base[k] < 0.2) base[k] = 0.2;
  }
  return base;
}

function rollStatsExact({ rng, faction, rowRole, rank, budgetForStats }) {
  const min = { ...ROW_MIN_STATS[rowRole] };
  const minTotal = min.hp + min.atk + min.shieldCap + min.chargeCap;
  if (budgetForStats < minTotal) return null;

  const stats = { ...min };
  let remaining = budgetForStats - minTotal;
  const weights = getStatWeights({ faction, rowRole, rng });
  const highRankBoost = rank >= 11 ? 1 : 0;
  if (highRankBoost) {
    if (rowRole !== "BACK") weights.atk += 0.3;
    weights.hp += 0.2;
  }

  const hardCaps = {
    hp: rowRole === "FRONT" ? 14 : rowRole === "MIDDLE" ? 11 : 9,
    atk: rowRole === "FRONT" ? 12 : rowRole === "MIDDLE" ? 10 : 8,
    shieldCap: 10,
    chargeCap: 10
  };

  while (remaining > 0) {
    const candidates = Object.keys(stats).filter((key) => stats[key] < hardCaps[key]);
    const pickKey = rng.weightedPick(
      (candidates.length > 0 ? candidates : Object.keys(stats)).map((k) => [k, weights[k]])
    );
    stats[pickKey] += 1;
    remaining -= 1;
  }

  return stats;
}

function buildMaskRankPlan(count, rng) {
  const plan = [];
  while (plan.length < count) {
    plan.push(...rng.shuffle(RANKS_ASC));
  }
  return plan.slice(0, count);
}

function buildSynergyTags({ card, faction }) {
  const tags = new Set();
  for (const tag of card.abilities.detonation.tags) tags.add(tag);
  for (const tag of card.abilities.buildPhase?.tags ?? []) tags.add(tag);
  for (const tag of FACTION_SYNERGY_HINTS[faction] ?? []) {
    if (tags.size >= 6) break;
    tags.add(tag);
  }
  tags.add(card.rowRole.toLowerCase());
  if (card.abilities.buildPhase) tags.add("engine");
  if (card.rarity === "LEGENDARY") tags.add("legendary");
  return Array.from(tags).slice(0, 8);
}

function chooseArchetype(rng, faction, rowRole) {
  const pool = FACTION_ARCHETYPES[faction]?.[rowRole];
  return pool?.[rng.int(0, pool.length - 1)] ?? `${faction} ${rowRole} Operative`;
}

function rankToName(rank) {
  return RANK_NAME_MAP[rank] ?? String(rank);
}

async function loadSeedInputs(projectRoot) {
  const [abilityLibraryRaw, nameTemplates, loreTemplates, promptTemplates] = await Promise.all([
    readJson(path.join(projectRoot, "src", "data", "abilityLibrary.json")),
    readJson(path.join(projectRoot, "src", "data", "nameTemplates.json")),
    readJson(path.join(projectRoot, "src", "data", "loreTemplates.json")),
    readJson(path.join(projectRoot, "src", "data", "promptTemplates.json"))
  ]);
  return {
    abilityLibrary: normalizeLibrary(abilityLibraryRaw),
    nameTemplates,
    loreTemplates,
    promptTemplates
  };
}

function createCardFactory({ seedInputs, rng, warnings }) {
  const buildName = createNameBuilder(seedInputs.nameTemplates);

  return function makeCard({
    faction,
    rank,
    maskRank,
    rowRole,
    rarity,
    serial
  }) {
    const effectiveRank = rank === 0 ? maskRank : rank;
    const rankName = rank === 0 ? "JOKER" : rankToName(rank);
    const budgetCap = calcCostsSummary({
      rank,
      maskRank,
      stats: { hp: 0, atk: 0, shieldCap: 0, chargeCap: 0 },
      abilities: { buildPhase: null, detonation: { cost: 0 } }
    }).budgetCap;
    const archetype = chooseArchetype(rng, faction, rowRole);

    for (let attempt = 0; attempt < 140; attempt += 1) {
      const abilities = pickAbilitiesForCard({
        rng,
        library: seedInputs.abilityLibrary,
        faction,
        rowRole,
        rarity,
        budgetCap
      });

      const abilityCost = (abilities.buildPhase?.cost ?? 0) + abilities.detonation.cost;
      const minStat = minStatsCost(rowRole);
      if (abilityCost > budgetCap - minStat) continue;

      const underCandidates = rng.chance(0.5) ? [0, 1] : [1, 0];
      for (const targetUnderspend of underCandidates) {
        const statBudget = budgetCap - abilityCost - targetUnderspend;
        const stats = rollStatsExact({ rng, faction, rowRole, rank: effectiveRank, budgetForStats: statBudget });
        if (!stats) continue;

        const costs = calcCostsSummary({ rank, maskRank, stats, abilities });
        const fit = fitsBudget({ rank, maskRank, stats, abilities });
        if (!fit.ok) continue;

        const name = buildName({ rng, faction, rankName });
        const baseCard = {
          id: createCardId({ faction, rank, rowRole, serial }),
          name,
          faction,
          rank,
          rankName,
          rowRole,
          archetype,
          rarity,
          stats,
          abilities,
          synergyTags: [],
          lore: "",
          artPrompt: "",
          costs,
          version: VERSION
        };
        if (rank === 0) baseCard.maskRank = maskRank;

        baseCard.synergyTags = buildSynergyTags({ card: baseCard, faction });
        baseCard.lore = buildLore({ rng, card: baseCard, loreTemplates: seedInputs.loreTemplates });
        baseCard.artPrompt = buildArtPrompt({ card: baseCard, promptTemplates: seedInputs.promptTemplates });

        return baseCard;
      }
    }

    const fallbackAbilities = {
      buildPhase: null,
      detonation: {
        id: "FALLBACK-DET",
        name: "Fallback Strike",
        timing: "detonation",
        cost: 1,
        text: "Emergency fallback detonation.",
        tags: ["pressure"]
      }
    };
    const budget = calcCostsSummary({
      rank,
      maskRank,
      stats: { hp: 0, atk: 0, shieldCap: 0, chargeCap: 0 },
      abilities: { buildPhase: null, detonation: { cost: 0 } }
    }).budgetCap;
    const stats = rollStatsExact({
      rng,
      faction,
      rowRole,
      rank: effectiveRank,
      budgetForStats: budget - 1
    }) ?? { ...ROW_MIN_STATS[rowRole] };
    const costs = calcCostsSummary({ rank, maskRank, stats, abilities: fallbackAbilities });
    warnings.push(`Fallback card assembly used for ${faction} ${rowRole} ${rarity} rank ${rankName}`);

    const fallbackCard = {
      id: createCardId({ faction, rank, rowRole, serial }),
      name: buildName({ rng, faction, rankName }),
      faction,
      rank,
      rankName,
      rowRole,
      archetype,
      rarity,
      stats,
      abilities: fallbackAbilities,
      synergyTags: [rowRole.toLowerCase(), "pressure"],
      lore: "",
      artPrompt: "",
      costs,
      version: VERSION
    };
    if (rank === 0) fallbackCard.maskRank = maskRank;
    fallbackCard.lore = buildLore({ rng, card: fallbackCard, loreTemplates: seedInputs.loreTemplates });
    fallbackCard.artPrompt = buildArtPrompt({ card: fallbackCard, promptTemplates: seedInputs.promptTemplates });
    return fallbackCard;
  };
}

function buildPlansForFaction({ faction, count, rng }) {
  const rankPlanBase = buildRankPlanForFaction(faction, count);
  const rowPlanBase = buildRowRolePlan(count, DEFAULT_ROW_ROLE_WEIGHTS);
  const rarityPlanBase = buildRarityPlan(count, DEFAULT_RARITY_WEIGHTS, { forceLegendary: faction === "Jokers" });

  return {
    rankPlan: expandPlanWithShuffle(rng.fork(`ranks:${faction}`), rankPlanBase.plan),
    rowPlan: expandPlanWithShuffle(rng.fork(`rows:${faction}`), rowPlanBase.plan),
    rarityPlan: expandPlanWithShuffle(rng.fork(`rarity:${faction}`), rarityPlanBase.plan)
  };
}

export async function generateCardForge({
  seed = 1337,
  countsConfig = null,
  projectRoot = projectRootFrom(import.meta.url)
} = {}) {
  const counts = deepMergeCounts(countsConfig);
  const rng = new RNG(seed);
  const warnings = [];
  const seedInputs = await loadSeedInputs(projectRoot);
  const makeCard = createCardFactory({ seedInputs, rng: rng.fork("cards"), warnings });
  const cards = [];

  for (const faction of ["Hearts", "Spades", "Diamonds", "Clubs", "Jokers"]) {
    const count = counts[faction];
    const factionRng = rng.fork(`faction:${faction}`);
    const plans = buildPlansForFaction({ faction, count, rng: factionRng });
    const maskPlan = faction === "Jokers" ? buildMaskRankPlan(count, factionRng.fork("mask")) : [];

    for (let i = 0; i < count; i += 1) {
      const rank = plans.rankPlan[i];
      const rowRole = plans.rowPlan[i];
      const rarity = plans.rarityPlan[i];
      const maskRank = faction === "Jokers" ? maskPlan[i] : undefined;

      const card = makeCard({
        faction,
        rank,
        maskRank,
        rowRole,
        rarity,
        serial: i + 1
      });
      cards.push(card);
    }
  }

  // Final deterministic ordering by faction/rank/row/id for stable output and easier diffing.
  const factionOrder = new Map([["Hearts", 0], ["Spades", 1], ["Diamonds", 2], ["Clubs", 3], ["Jokers", 4]]);
  const rowOrder = new Map([["FRONT", 0], ["MIDDLE", 1], ["BACK", 2]]);
  cards.sort((a, b) => {
    const fa = factionOrder.get(a.faction) ?? 99;
    const fb = factionOrder.get(b.faction) ?? 99;
    if (fa !== fb) return fa - fb;
    if (a.rank !== b.rank) return a.rank - b.rank;
    const ra = rowOrder.get(a.rowRole) ?? 99;
    const rb = rowOrder.get(b.rowRole) ?? 99;
    if (ra !== rb) return ra - rb;
    return a.id.localeCompare(b.id);
  });

  // Regenerate IDs after sort? No. IDs use per-faction serial generation order; keep them stable to seeded plans.
  // Validate cards.
  const cardsValidation = validateCardsData(cards);
  if (!cardsValidation.valid) {
    throw new Error(`Generated cards failed validation:\n${cardsValidation.errors.slice(0, 20).join("\n")}`);
  }

  // Soft checks and warnings.
  for (const card of cards) {
    if (card.costs.powerBudgetSpent > card.costs.budgetCap) {
      warnings.push(`Over-budget card detected unexpectedly: ${card.id}`);
    }
    if (card.costs.underspend > 1) {
      warnings.push(`High underspend (>1) detected unexpectedly: ${card.id}`);
    }
    if (!card.abilities.detonation) {
      warnings.push(`Missing detonation ability on ${card.id}`);
    }
  }

  const deckpacks = buildDeckpacks({ cards, rng: rng.fork("deckpacks"), seed });
  const deckpacksValidation = validateDeckpacksData(deckpacks);
  if (!deckpacksValidation.valid) {
    throw new Error(`Generated deckpacks failed validation:\n${deckpacksValidation.errors.slice(0, 20).join("\n")}`);
  }

  const promptsText = cards
    .map((card) => `${card.id}\t${card.name}\t${card.artPrompt}`)
    .join("\n")
    .concat("\n");

  const reportMarkdown = buildReportMarkdown({
    cards,
    warnings,
    seed,
    countsConfig: counts
  });

  return {
    seed,
    version: VERSION,
    countsConfig: counts,
    cards,
    promptsText,
    reportMarkdown,
    deckpacks,
    warnings,
    outputFiles: { ...DEFAULT_OUTPUT_FILES }
  };
}

