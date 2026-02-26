export const RANK_POWER_BUDGET = Object.freeze({
  2: 6,
  3: 7,
  4: 8,
  5: 9,
  6: 10,
  7: 11,
  8: 12,
  9: 13,
  10: 14,
  11: 16,
  12: 18,
  13: 20,
  14: 22
});

export function getPowerBudget(rank, maskRank) {
  const effectiveRank = rank === 0 ? maskRank : rank;
  const budget = RANK_POWER_BUDGET[effectiveRank];
  if (!budget) {
    throw new Error(`No power budget for rank ${rank} (maskRank=${maskRank ?? "n/a"})`);
  }
  return budget;
}

export function calcStatCost(stats) {
  return (stats.hp ?? 0) + (stats.atk ?? 0) + (stats.shieldCap ?? 0) + (stats.chargeCap ?? 0);
}

export function calcAbilityCost(abilities) {
  const build = abilities?.buildPhase?.cost ?? 0;
  const det = abilities?.detonation?.cost ?? 0;
  return build + det;
}

export function calcPowerBudgetSpent(stats, abilities) {
  return calcStatCost(stats) + calcAbilityCost(abilities);
}

export function calcCostsSummary({ rank, maskRank, stats, abilities }) {
  const budgetCap = getPowerBudget(rank, maskRank);
  const baseStatCost = calcStatCost(stats);
  const abilityCostTotal = calcAbilityCost(abilities);
  const powerBudgetSpent = baseStatCost + abilityCostTotal;
  const underspend = budgetCap - powerBudgetSpent;
  return {
    budgetCap,
    baseStatCost,
    abilityCostTotal,
    powerBudgetSpent,
    underspend
  };
}

export function fitsBudget({ rank, maskRank, stats, abilities }) {
  const costs = calcCostsSummary({ rank, maskRank, stats, abilities });
  return {
    ok: costs.powerBudgetSpent <= costs.budgetCap && costs.underspend >= 0 && costs.underspend <= 1,
    ...costs
  };
}

