import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generateCardForge } from "../src/core/generator.js";
import { validateCardsData, validateDeckpacksData } from "../src/utils/validateSchema.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function hashObject(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function byFaction(cards, faction) {
  return cards.filter((c) => c.faction === faction);
}

function countBy(items, keyFn) {
  const out = {};
  for (const item of items) {
    const key = keyFn(item);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

let fixture;

test.before(async () => {
  fixture = await generateCardForge({ seed: 1337, projectRoot });
});

test("deterministic output is stable for same seed and different for another seed", async () => {
  const a = await generateCardForge({ seed: 1337, projectRoot });
  const b = await generateCardForge({ seed: 1337, projectRoot });
  const c = await generateCardForge({ seed: 1338, projectRoot });

  const hashA = hashObject({
    cards: a.cards.map((card) => [card.id, card.name, card.stats, card.abilities, card.costs]),
    deckpacks: a.deckpacks
  });
  const hashB = hashObject({
    cards: b.cards.map((card) => [card.id, card.name, card.stats, card.abilities, card.costs]),
    deckpacks: b.deckpacks
  });
  const hashC = hashObject({
    cards: c.cards.map((card) => [card.id, card.name, card.stats, card.abilities, card.costs]),
    deckpacks: c.deckpacks
  });

  assert.equal(hashA, hashB);
  assert.notEqual(hashA, hashC);
});

test("generated cards and deckpacks pass local schema validation", () => {
  const cardsRes = validateCardsData(fixture.cards);
  const deckpacksRes = validateDeckpacksData(fixture.deckpacks);

  assert.equal(cardsRes.valid, true, cardsRes.errors.join("\n"));
  assert.equal(deckpacksRes.valid, true, deckpacksRes.errors.join("\n"));
  assert.equal(fixture.cards.length, 256);
});

test("distribution matches default faction/rank/rarity/row-role targets (or exact rounded plans)", () => {
  const expectedRanks = {
    2: 4, 3: 4, 4: 4, 5: 4, 6: 4, 7: 4, 8: 4, 9: 4, 10: 4, 11: 6, 12: 6, 13: 6, 14: 6
  };
  const expectedRows60 = { FRONT: 21, MIDDLE: 27, BACK: 12 };
  const expectedRarity60 = { COMMON: 33, RARE: 18, EPIC: 7, LEGENDARY: 2 };
  const expectedRows16 = { FRONT: 6, MIDDLE: 7, BACK: 3 };

  for (const faction of ["Hearts", "Spades", "Diamonds", "Clubs"]) {
    const factionCards = byFaction(fixture.cards, faction);
    assert.equal(factionCards.length, 60);

    const rankCounts = countBy(factionCards, (c) => c.rank);
    for (const [rank, expected] of Object.entries(expectedRanks)) {
      assert.equal(rankCounts[rank] ?? 0, expected, `${faction} rank ${rank}`);
    }

    const rowCounts = countBy(factionCards, (c) => c.rowRole);
    assert.deepEqual(
      { FRONT: rowCounts.FRONT ?? 0, MIDDLE: rowCounts.MIDDLE ?? 0, BACK: rowCounts.BACK ?? 0 },
      expectedRows60,
      `${faction} row role distribution`
    );

    const rarityCounts = countBy(factionCards, (c) => c.rarity);
    assert.deepEqual(
      {
        COMMON: rarityCounts.COMMON ?? 0,
        RARE: rarityCounts.RARE ?? 0,
        EPIC: rarityCounts.EPIC ?? 0,
        LEGENDARY: rarityCounts.LEGENDARY ?? 0
      },
      expectedRarity60,
      `${faction} rarity distribution`
    );
  }

  const jokers = byFaction(fixture.cards, "Jokers");
  assert.equal(jokers.length, 16);
  assert.ok(jokers.every((c) => c.rank === 0 && c.rankName === "JOKER" && c.rarity === "LEGENDARY"));
  assert.ok(jokers.every((c) => Number.isInteger(c.maskRank) && c.maskRank >= 2 && c.maskRank <= 14));

  const jokerRows = countBy(jokers, (c) => c.rowRole);
  assert.deepEqual(
    { FRONT: jokerRows.FRONT ?? 0, MIDDLE: jokerRows.MIDDLE ?? 0, BACK: jokerRows.BACK ?? 0 },
    expectedRows16
  );
});

test("no generated card exceeds budget and all underspends are <= 1", () => {
  for (const card of fixture.cards) {
    assert.ok(card.costs.powerBudgetSpent <= card.costs.budgetCap, `${card.id} overspent`);
    assert.ok(card.costs.underspend >= 0 && card.costs.underspend <= 1, `${card.id} underspend invalid`);
    assert.equal(card.abilities.detonation.timing, "detonation");
    if (card.abilities.buildPhase) {
      assert.equal(card.abilities.buildPhase.timing, "buildPhase");
    }
  }
});

