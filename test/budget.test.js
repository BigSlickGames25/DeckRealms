import test from "node:test";
import assert from "node:assert/strict";
import {
  calcAbilityCost,
  calcCostsSummary,
  calcPowerBudgetSpent,
  calcStatCost,
  fitsBudget,
  getPowerBudget
} from "../src/core/budget.js";

test("rank budgets match canon values", () => {
  assert.equal(getPowerBudget(2), 6);
  assert.equal(getPowerBudget(10), 14);
  assert.equal(getPowerBudget(11), 16);
  assert.equal(getPowerBudget(14), 22);
  assert.equal(getPowerBudget(0, 13), 20);
});

test("cost calculators add stats and abilities correctly", () => {
  const stats = { hp: 4, atk: 3, shieldCap: 2, chargeCap: 1 };
  const abilities = {
    buildPhase: { cost: 2 },
    detonation: { cost: 3 }
  };

  assert.equal(calcStatCost(stats), 10);
  assert.equal(calcAbilityCost(abilities), 5);
  assert.equal(calcPowerBudgetSpent(stats, abilities), 15);

  const summary = calcCostsSummary({ rank: 10, stats, abilities });
  assert.deepEqual(summary, {
    budgetCap: 14,
    baseStatCost: 10,
    abilityCostTotal: 5,
    powerBudgetSpent: 15,
    underspend: -1
  });
});

test("fitsBudget enforces no overspend and max 1 underspend", () => {
  const valid = fitsBudget({
    rank: 8,
    stats: { hp: 4, atk: 3, shieldCap: 2, chargeCap: 0 },
    abilities: { buildPhase: null, detonation: { cost: 2 } }
  });
  assert.equal(valid.budgetCap, 12);
  assert.equal(valid.powerBudgetSpent, 11);
  assert.equal(valid.underspend, 1);
  assert.equal(valid.ok, true);

  const overspend = fitsBudget({
    rank: 8,
    stats: { hp: 5, atk: 4, shieldCap: 2, chargeCap: 1 },
    abilities: { buildPhase: null, detonation: { cost: 2 } }
  });
  assert.equal(overspend.ok, false);

  const tooMuchUnderspend = fitsBudget({
    rank: 6,
    stats: { hp: 2, atk: 2, shieldCap: 1, chargeCap: 0 },
    abilities: { buildPhase: null, detonation: { cost: 1 } }
  });
  assert.equal(tooMuchUnderspend.budgetCap, 10);
  assert.equal(tooMuchUnderspend.powerBudgetSpent, 6);
  assert.equal(tooMuchUnderspend.underspend, 4);
  assert.equal(tooMuchUnderspend.ok, false);
});

