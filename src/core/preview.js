import path from "node:path";
import { readJson } from "../utils/io.js";
import { RNG } from "./rng.js";

const ROWS = ["FRONT", "MIDDLE", "BACK"];
const RARITY_SCORE = { COMMON: 1, RARE: 2, EPIC: 3, LEGENDARY: 4 };

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function cardPower(card) {
  return card.stats.hp + card.stats.atk + (card.stats.shieldCap ?? 0) + (card.stats.chargeCap ?? 0);
}

function rankWeight(card) {
  return card.rank === 0 ? (card.maskRank ?? 8) : card.rank;
}

function createCardIndex(cards) {
  return new Map(cards.map((card) => [card.id, card]));
}

function formatAbilityMini(ability) {
  if (!ability) return "None";
  return `${ability.name} (C${ability.cost})`;
}

export function formatCardPreview(card) {
  const mask = card.faction === "Jokers" ? ` mask:${card.maskRank}` : "";
  return [
    `${card.id} | ${card.name}`,
    `${card.faction} ${card.rankName}${mask} | ${card.rowRole} | ${card.rarity} | ${card.archetype}`,
    `HP ${card.stats.hp} / ATK ${card.stats.atk} / SHD ${card.stats.shieldCap} / CHG ${card.stats.chargeCap} | Budget ${card.costs.powerBudgetSpent}/${card.costs.budgetCap}`,
    `Build: ${formatAbilityMini(card.abilities.buildPhase)}`,
    `Detonate: ${formatAbilityMini(card.abilities.detonation)}`,
    `Tags: ${card.synergyTags.join(", ")}`
  ].join("\n");
}

function pickShowcaseCards(factionCards) {
  const picks = [];
  for (const row of ROWS) {
    const best = [...factionCards]
      .filter((c) => c.rowRole === row)
      .sort((a, b) => RARITY_SCORE[b.rarity] - RARITY_SCORE[a.rarity] || rankWeight(b) - rankWeight(a) || cardPower(b) - cardPower(a))[0];
    if (best) picks.push(best);
  }
  const extra = [...factionCards]
    .sort((a, b) => cardPower(b) - cardPower(a) || RARITY_SCORE[b.rarity] - RARITY_SCORE[a.rarity])[0];
  if (extra && !picks.find((c) => c.id === extra.id)) picks.push(extra);
  return picks.slice(0, 4);
}

function makeUnit(card) {
  return {
    card,
    hp: card.stats.hp,
    shield: 0,
    charge: 0,
    focus: 0,
    counter: 0,
    corrosion: 0,
    suppressed: 0,
    loyalty: 0
  };
}

function aliveUnit(unit) {
  return Boolean(unit && unit.hp > 0);
}

function teamBoardPower(player) {
  let total = 0;
  for (const row of ROWS) {
    const unit = player.board[row];
    if (aliveUnit(unit)) total += unit.hp + unit.shield + unit.charge + unit.card.stats.atk;
  }
  return total;
}

function choosePlayIndex(player) {
  if (player.hand.length === 0) return -1;

  let bestIdx = -1;
  let bestScore = -Infinity;
  for (let i = 0; i < player.hand.length; i += 1) {
    const card = player.hand[i];
    let score = 0;
    const rowOccupied = aliveUnit(player.board[card.rowRole]);
    score += rowOccupied ? -200 : 200;
    score += RARITY_SCORE[card.rarity] * 8;
    score += rankWeight(card) * 2;
    score += cardPower(card) * 0.4;
    if (card.abilities.buildPhase) score += 4;
    if (card.rowRole === "MIDDLE") score += 3;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  if (bestIdx >= 0) return bestIdx;
  return -1;
}

function drawCards(player, count, logs, label = "draws") {
  for (let i = 0; i < count; i += 1) {
    const next = player.drawPile.shift();
    if (!next) return;
    player.hand.push(next);
  }
  if (count > 0) logs.push(`${player.faction} ${label} (${player.hand.length} in hand).`);
}

function deployOne(player, logs) {
  const idx = choosePlayIndex(player);
  if (idx < 0) return;
  const card = player.hand[idx];
  if (aliveUnit(player.board[card.rowRole])) {
    return;
  }
  player.hand.splice(idx, 1);
  const unit = makeUnit(card);
  player.board[card.rowRole] = unit;
  logs.push(`${player.faction} deploys ${card.name} to ${card.rowRole}.`);
}

function applyBuildPhase(player, turnLogs) {
  for (const row of ROWS) {
    const unit = player.board[row];
    if (!aliveUnit(unit)) continue;

    unit.suppressed = 0;
    unit.counter = 0;

    const ability = unit.card.abilities.buildPhase;
    if (!ability) continue;

    const tags = new Set([...(ability.tags ?? []), ...(unit.card.synergyTags ?? [])]);
    let changes = [];

    if (tags.has("shield")) {
      const gain = tags.has("formation") ? 2 : 1;
      unit.shield = clamp(unit.shield + gain, 0, unit.card.stats.shieldCap);
      changes.push(`shield +${gain}`);
    }
    if (tags.has("charge")) {
      const gain = tags.has("probability") || tags.has("ritual") ? 2 : 1;
      unit.charge = clamp(unit.charge + gain, 0, unit.card.stats.chargeCap);
      changes.push(`charge +${gain}`);
    }
    if (tags.has("info") || tags.has("mark") || tags.has("precision")) {
      unit.focus = clamp(unit.focus + 1, 0, 3);
      changes.push("focus +1");
    }
    if (tags.has("loyalty") || tags.has("formation")) {
      unit.loyalty = clamp(unit.loyalty + 1, 0, 3);
      changes.push("loyalty +1");
    }
    if (tags.has("counter") || tags.has("intercept")) {
      unit.counter = 1;
      changes.push("counter ready");
    }
    if (tags.has("chaos") || tags.has("distortion")) {
      const roll = player.rng.int(0, 2);
      if (roll === 0) {
        unit.focus = clamp(unit.focus + 1, 0, 3);
        changes.push("chaos focus +1");
      } else if (roll === 1) {
        unit.charge = clamp(unit.charge + 1, 0, unit.card.stats.chargeCap);
        changes.push("chaos charge +1");
      } else {
        unit.shield = clamp(unit.shield + 1, 0, unit.card.stats.shieldCap);
        changes.push("chaos shield +1");
      }
    }

    if (changes.length > 0) {
      turnLogs.push(`${player.faction} ${unit.card.name} builds: ${changes.join(", ")}.`);
    }
  }
}

function firstAliveEnemyRow(enemy, preferredRow) {
  if (aliveUnit(enemy.board[preferredRow])) return preferredRow;
  for (const row of ROWS) {
    if (aliveUnit(enemy.board[row])) return row;
  }
  return null;
}

function applyDamage({ attacker, defender, targetRow, damage, tags, logs }) {
  const target = defender.board[targetRow];
  if (!aliveUnit(target)) return;

  let actual = Math.max(0, damage);
  if (target.corrosion > 0) {
    actual += target.corrosion;
    target.corrosion = Math.max(0, target.corrosion - 1);
  }

  const beforeShield = target.shield;
  const shieldAbsorb = Math.min(target.shield, actual);
  target.shield -= shieldAbsorb;
  actual -= shieldAbsorb;
  if (actual > 0) {
    target.hp -= actual;
  }

  if (tags.has("suppress")) {
    target.suppressed = 1;
  }
  if (tags.has("corrosion")) {
    target.corrosion = clamp(target.corrosion + 1, 0, 2);
  }
  if (tags.has("steal")) {
    attacker.activeUnit.charge = clamp(
      attacker.activeUnit.charge + 1,
      0,
      attacker.activeUnit.card.stats.chargeCap
    );
  }

  const shieldText = beforeShield > 0 ? ` (shield ${beforeShield}->${target.shield})` : "";
  logs.push(
    `${attacker.faction} ${attacker.activeUnit.card.name} hits ${defender.faction} ${target.card.name} on ${targetRow} for ${damage}${shieldText}${actual > 0 ? `, HP ${Math.max(0, target.hp)} left` : ""}.`
  );

  if (aliveUnit(target) && target.counter > 0) {
    attacker.activeUnit.hp -= 1;
    logs.push(`${defender.faction} ${target.card.name} counters for 1 damage.`);
  }

  if (target.hp <= 0) {
    defender.discard.push(target.card);
    defender.board[targetRow] = null;
    defender.koCount += 1;
    logs.push(`${defender.faction} ${target.card.name} is KO'd.`);
  }

  if (attacker.activeUnit.hp <= 0) {
    const row = attacker.activeRow;
    attacker.discard.push(attacker.activeUnit.card);
    attacker.board[row] = null;
    logs.push(`${attacker.faction} ${attacker.activeUnit.card.name} falls from counterfire.`);
  }
}

function actUnit(player, enemy, row, logs) {
  const unit = player.board[row];
  if (!aliveUnit(unit)) return;

  const targetRow = firstAliveEnemyRow(enemy, row);
  const tags = new Set([...(unit.card.abilities.detonation?.tags ?? []), ...(unit.card.synergyTags ?? [])]);

  let damage = Math.max(0, unit.card.stats.atk - unit.suppressed);
  damage += Math.floor((unit.card.abilities.detonation?.cost ?? 1) / 2);
  damage += Math.floor((RARITY_SCORE[unit.card.rarity] - 1) / 2);

  if (tags.has("charge") && unit.charge > 0) {
    damage += 1;
    unit.charge -= 1;
  }
  if ((tags.has("precision") || tags.has("mark") || tags.has("foresight")) && unit.focus > 0) {
    damage += 1;
    unit.focus -= 1;
  }
  if ((tags.has("loyalty") || tags.has("formation")) && unit.loyalty > 0) {
    damage += 1;
    unit.loyalty = Math.max(0, unit.loyalty - 1);
  }
  if (tags.has("chaos") || tags.has("distortion")) {
    damage += player.rng.int(-1, 2);
  }

  damage = Math.max(0, damage);

  if (!targetRow) {
    enemy.nexus -= damage;
    logs.push(`${player.faction} ${unit.card.name} strikes the nexus for ${damage}. (${enemy.faction} nexus ${Math.max(0, enemy.nexus)})`);
    return;
  }

  // Pass active references so helper can resolve counters and secondary effects.
  player.activeUnit = unit;
  player.activeRow = row;
  applyDamage({
    attacker: player,
    defender: enemy,
    targetRow,
    damage,
    tags,
    logs
  });
  player.activeUnit = null;
  player.activeRow = null;
}

function makePlayer({ faction, cards, rng }) {
  return {
    faction,
    rng,
    drawPile: rng.shuffle(cards),
    hand: [],
    board: { FRONT: null, MIDDLE: null, BACK: null },
    discard: [],
    nexus: 18,
    koCount: 0,
    activeUnit: null,
    activeRow: null
  };
}

function rowSnapshot(player, row) {
  const unit = player.board[row];
  if (!aliveUnit(unit)) return `${row}: [empty]`;
  return `${row}: ${unit.card.name} (HP ${Math.max(0, unit.hp)}, SH ${unit.shield}, CH ${unit.charge}, FC ${unit.focus})`;
}

function boardSnapshot(left, right) {
  const lines = ["Board snapshot:"];
  for (const row of ROWS) {
    lines.push(`- ${left.faction} ${rowSnapshot(left, row)}`);
    lines.push(`- ${right.faction} ${rowSnapshot(right, row)}`);
  }
  lines.push(`- Nexus: ${left.faction} ${left.nexus} | ${right.faction} ${right.nexus}`);
  return lines.join("\n");
}

export function simulateStarterSkirmish({
  cards,
  deckpacks,
  leftFaction = "Hearts",
  rightFaction = "Spades",
  seed = 1337,
  turns = 8
}) {
  if (!deckpacks?.packs?.[leftFaction] || !deckpacks?.packs?.[rightFaction]) {
    throw new Error("Preview skirmish requires core faction packs in deckpacks.generated.json");
  }

  const cardIndex = createCardIndex(cards);
  const leftIds = deckpacks.packs[leftFaction]["Starter-21"].all;
  const rightIds = deckpacks.packs[rightFaction]["Starter-21"].all;
  const leftCards = leftIds.map((id) => cardIndex.get(id)).filter(Boolean);
  const rightCards = rightIds.map((id) => cardIndex.get(id)).filter(Boolean);
  if (leftCards.length !== 21 || rightCards.length !== 21) {
    throw new Error("Starter-21 pack references missing cards");
  }

  const rng = new RNG(seed);
  const left = makePlayer({ faction: leftFaction, cards: leftCards, rng: rng.fork("left") });
  const right = makePlayer({ faction: rightFaction, cards: rightCards, rng: rng.fork("right") });
  const logs = [];

  drawCards(left, 5, logs, "draws opening hand");
  drawCards(right, 5, logs, "draws opening hand");

  for (let turn = 1; turn <= turns; turn += 1) {
    const turnLogs = [];
    turnLogs.push(`Turn ${turn}`);

    drawCards(left, 1, turnLogs);
    drawCards(right, 1, turnLogs);
    deployOne(left, turnLogs);
    deployOne(right, turnLogs);

    applyBuildPhase(left, turnLogs);
    applyBuildPhase(right, turnLogs);

    const leftActsFirst = turn % 2 === 1;
    const order = leftActsFirst ? [[left, right], [right, left]] : [[right, left], [left, right]];

    for (const [actor, defender] of order) {
      for (const row of ROWS) {
        actUnit(actor, defender, row, turnLogs);
        if (left.nexus <= 0 || right.nexus <= 0) break;
      }
      if (left.nexus <= 0 || right.nexus <= 0) break;
    }

    if (turn <= 3 || turn === turns || left.nexus <= 0 || right.nexus <= 0) {
      turnLogs.push(boardSnapshot(left, right));
    }

    logs.push(turnLogs.join("\n"));

    if (left.nexus <= 0 || right.nexus <= 0) break;
  }

  const scoreLeft = left.nexus + teamBoardPower(left) + left.koCount * 2;
  const scoreRight = right.nexus + teamBoardPower(right) + right.koCount * 2;
  let winner = "Draw";
  if (left.nexus <= 0 && right.nexus > 0) winner = right.faction;
  else if (right.nexus <= 0 && left.nexus > 0) winner = left.faction;
  else if (scoreLeft !== scoreRight) winner = scoreLeft > scoreRight ? left.faction : right.faction;

  return {
    leftFaction,
    rightFaction,
    seed,
    turns,
    logs,
    summary: {
      winner,
      nexus: { [left.faction]: left.nexus, [right.faction]: right.nexus },
      ko: { [left.faction]: left.koCount, [right.faction]: right.koCount },
      boardPower: { [left.faction]: teamBoardPower(left), [right.faction]: teamBoardPower(right) },
      score: { [left.faction]: scoreLeft, [right.faction]: scoreRight }
    }
  };
}

function factionCounts(cards, faction) {
  const subset = cards.filter((c) => c.faction === faction);
  const counts = {
    total: subset.length,
    rowRoles: { FRONT: 0, MIDDLE: 0, BACK: 0 },
    rarities: {}
  };
  for (const card of subset) {
    counts.rowRoles[card.rowRole] += 1;
    counts.rarities[card.rarity] = (counts.rarities[card.rarity] ?? 0) + 1;
  }
  return counts;
}

export function buildPreviewText({
  cards,
  deckpacks,
  leftFaction = "Hearts",
  rightFaction = "Spades",
  seed = 1337,
  turns = 8
}) {
  const lines = [];
  lines.push("Deck Realms Card Forge Preview (Prototype)");
  lines.push("This is a terminal showcase + simplified auto-battle using generated packs.");
  lines.push("Battle rules here are a preview shim, not final Telegram gameplay rules.");
  lines.push("");

  for (const faction of [leftFaction, rightFaction]) {
    const counts = factionCounts(cards, faction);
    lines.push(`${faction} pool: ${counts.total} cards | Rows F/M/B ${counts.rowRoles.FRONT}/${counts.rowRoles.MIDDLE}/${counts.rowRoles.BACK}`);
    lines.push(`Rarity: ${Object.entries(counts.rarities).map(([k, v]) => `${k}:${v}`).join(" ")}`);
    const factionCards = cards.filter((c) => c.faction === faction);
    const showcase = pickShowcaseCards(factionCards);
    for (const card of showcase) {
      lines.push("");
      lines.push(formatCardPreview(card));
    }
    lines.push("");
  }

  const skirmish = simulateStarterSkirmish({ cards, deckpacks, leftFaction, rightFaction, seed, turns });
  lines.push(`Skirmish Demo: ${leftFaction} vs ${rightFaction} (seed ${seed}, turns ${turns})`);
  lines.push("");
  lines.push(...skirmish.logs);
  lines.push("");
  lines.push("Result");
  lines.push(`Winner: ${skirmish.summary.winner}`);
  lines.push(
    `Nexus: ${leftFaction} ${skirmish.summary.nexus[leftFaction]} | ${rightFaction} ${skirmish.summary.nexus[rightFaction]}`
  );
  lines.push(`KO: ${leftFaction} ${skirmish.summary.ko[leftFaction]} | ${rightFaction} ${skirmish.summary.ko[rightFaction]}`);
  lines.push(
    `Score: ${leftFaction} ${skirmish.summary.score[leftFaction]} | ${rightFaction} ${skirmish.summary.score[rightFaction]}`
  );
  return lines.join("\n");
}

export async function loadGeneratedPreviewInputs({ dataDir }) {
  const cardsPath = path.join(dataDir, "cards.generated.json");
  const deckpacksPath = path.join(dataDir, "deckpacks.generated.json");
  const [cards, deckpacks] = await Promise.all([readJson(cardsPath), readJson(deckpacksPath)]);
  return { cards, deckpacks };
}
