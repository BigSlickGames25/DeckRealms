import { PLAYABLE_FACTIONS, VERSION } from "./constants.js";

function countBy(items, keyFn) {
  const out = {};
  for (const item of items) {
    const key = keyFn(item);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

function summarizeCards(cards) {
  return {
    count: cards.length,
    rowRoles: countBy(cards, (c) => c.rowRole),
    rarities: countBy(cards, (c) => c.rarity),
    rankNames: countBy(cards, (c) => c.rankName)
  };
}

function stableScore(card, profile) {
  let score = 0;
  score += (profile.rowRoleWeights?.[card.rowRole] ?? 0) * 100;
  score += (profile.rarityWeights?.[card.rarity] ?? 0) * 100;
  score += (profile.rankBias === "low" ? (20 - card.rank) : card.rank) * 2;
  score += (card.stats.hp + card.stats.atk) * 0.1;
  return score;
}

function pickBalanced({ pool, count, rng, profile, lockedIds = new Set() }) {
  const selected = [];
  const rowTargets = { ...profile.rowTargets };
  const rarityTargets = { ...profile.rarityTargets };

  const available = pool.filter((c) => !lockedIds.has(c.id));
  const shuffled = rng.shuffle(available);

  while (selected.length < count) {
    let best = null;
    let bestIndex = -1;
    let bestPriority = -Infinity;

    for (let i = 0; i < shuffled.length; i += 1) {
      const card = shuffled[i];
      if (!card) continue;

      let priority = stableScore(card, profile);
      if ((rowTargets[card.rowRole] ?? 0) > 0) priority += 500;
      if ((rarityTargets[card.rarity] ?? 0) > 0) priority += 300;
      if (profile.requireBuildPhase && card.abilities.buildPhase) priority += 40;
      if (profile.preferBuildPhase && card.abilities.buildPhase) priority += 10;
      if (profile.avoidLegendary && card.rarity === "LEGENDARY") priority -= 400;
      if (profile.preferCommons && card.rarity === "COMMON") priority += 20;

      if (priority > bestPriority) {
        bestPriority = priority;
        best = card;
        bestIndex = i;
      }
    }

    if (!best) break;

    selected.push(best);
    lockedIds.add(best.id);
    shuffled.splice(bestIndex, 1);
    if ((rowTargets[best.rowRole] ?? 0) > 0) rowTargets[best.rowRole] -= 1;
    if ((rarityTargets[best.rarity] ?? 0) > 0) rarityTargets[best.rarity] -= 1;
  }

  return selected;
}

function ids(cards) {
  return cards.map((c) => c.id);
}

export function buildDeckpacks({ cards, rng, seed }) {
  const byFaction = new Map();
  for (const card of cards) {
    if (!byFaction.has(card.faction)) byFaction.set(card.faction, []);
    byFaction.get(card.faction).push(card);
  }

  const packs = {};
  const notes = [
    "Starter and expansion packs are generated for the four core factions only.",
    "Jokers are emitted as a separate legendary shard pool because the default Joker count (16) cannot support a 41-card starter+expansion ladder."
  ];

  for (const faction of PLAYABLE_FACTIONS) {
    const factionCards = [...(byFaction.get(faction) ?? [])];
    if (factionCards.length < 41) {
      throw new Error(
        `Cannot build Starter-21 + Expansion-41 for ${faction}: need at least 41 cards, got ${factionCards.length}`
      );
    }
    const sorted = factionCards.sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
    const locked = new Set();
    const factionRng = rng.fork(`pack:${faction}`);

    const starting = pickBalanced({
      pool: sorted.filter((c) => c.rarity !== "LEGENDARY"),
      count: 6,
      rng: factionRng.fork("starter6"),
      lockedIds: locked,
      profile: {
        rowTargets: { FRONT: 2, MIDDLE: 2, BACK: 2 },
        rarityTargets: { COMMON: 4, RARE: 2, EPIC: 0, LEGENDARY: 0 },
        rowRoleWeights: { FRONT: 1.0, MIDDLE: 1.0, BACK: 1.0 },
        rarityWeights: { COMMON: 1.0, RARE: 0.8, EPIC: 0.2, LEGENDARY: -2.0 },
        rankBias: "low",
        avoidLegendary: true,
        preferCommons: true
      }
    });

    const recruitables = pickBalanced({
      pool: sorted,
      count: 15,
      rng: factionRng.fork("recruit15"),
      lockedIds: locked,
      profile: {
        rowTargets: { FRONT: 5, MIDDLE: 7, BACK: 3 },
        rarityTargets: { COMMON: 8, RARE: 5, EPIC: 2, LEGENDARY: 0 },
        rowRoleWeights: { FRONT: 0.8, MIDDLE: 1.2, BACK: 0.7 },
        rarityWeights: { COMMON: 1.0, RARE: 0.9, EPIC: 0.6, LEGENDARY: 0.1 },
        rankBias: "low",
        avoidLegendary: true,
        preferBuildPhase: true
      }
    });

    const starterAll = [...starting, ...recruitables];

    const expansionAdditional = pickBalanced({
      pool: sorted,
      count: 20,
      rng: factionRng.fork("exp20"),
      lockedIds: locked,
      profile: {
        rowTargets: { FRONT: 7, MIDDLE: 9, BACK: 4 },
        rarityTargets: { COMMON: 6, RARE: 8, EPIC: 5, LEGENDARY: 1 },
        rowRoleWeights: { FRONT: 0.9, MIDDLE: 1.1, BACK: 1.0 },
        rarityWeights: { COMMON: 0.5, RARE: 1.0, EPIC: 1.4, LEGENDARY: 1.2 },
        rankBias: "high",
        requireBuildPhase: false
      }
    });

    const totalWithStarter = [...starterAll, ...expansionAdditional];

    packs[faction] = {
      "Starter-21": {
        starting: ids(starting),
        recruitables: ids(recruitables),
        all: ids(starterAll),
        summary: summarizeCards(starterAll)
      },
      "Expansion-41": {
        additional: ids(expansionAdditional),
        totalWithStarter: ids(totalWithStarter),
        summary: summarizeCards(totalWithStarter)
      }
    };
  }

  const jokerPool = (byFaction.get("Jokers") ?? []).map((c) => c.id);

  return {
    version: VERSION,
    seed,
    notes,
    packs,
    jokerPool: {
      count: jokerPool.length,
      cardIds: jokerPool
    }
  };
}
