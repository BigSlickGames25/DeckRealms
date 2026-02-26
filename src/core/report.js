import { PLAYABLE_FACTIONS, RARITIES, ROW_ROLES, RANKS_ASC } from "./constants.js";

function countBy(items, keyFn) {
  const out = {};
  for (const item of items) {
    const key = keyFn(item);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

function avg(nums) {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function table(headers, rows) {
  const head = `| ${headers.join(" | ")} |`;
  const divider = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
  return [head, divider, body].filter(Boolean).join("\n");
}

function rankLabel(rank) {
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  if (rank === 14) return "A";
  if (rank === 0) return "JOKER";
  return String(rank);
}

export function buildReportMarkdown({ cards, warnings, seed, countsConfig }) {
  const lines = [];
  const spends = cards.map((c) => c.costs.powerBudgetSpent);
  const byFaction = countBy(cards, (c) => c.faction);
  const byRarity = countBy(cards, (c) => c.rarity);
  const byRow = countBy(cards, (c) => c.rowRole);
  const topAtkHp = [...cards]
    .sort((a, b) => (b.stats.atk + b.stats.hp) - (a.stats.atk + a.stats.hp) || b.stats.atk - a.stats.atk || a.id.localeCompare(b.id))
    .slice(0, 10);

  lines.push("# Deck Realms Card Forge Report");
  lines.push("");
  lines.push(`- Seed: \`${seed}\``);
  lines.push(`- Total cards: **${cards.length}**`);
  lines.push(`- Configured target counts: \`${JSON.stringify(countsConfig)}\``);
  lines.push("");

  lines.push("## Counts by Faction");
  lines.push("");
  lines.push(
    table(
      ["Faction", "Count", "Target"],
      ["Hearts", "Spades", "Diamonds", "Clubs", "Jokers"].map((f) => [f, String(byFaction[f] ?? 0), String(countsConfig[f] ?? "-")])
    )
  );
  lines.push("");

  lines.push("## Counts by Rarity");
  lines.push("");
  lines.push(table(["Rarity", "Count"], RARITIES.map((r) => [r, String(byRarity[r] ?? 0)])));
  lines.push("");

  lines.push("## Counts by Row Role");
  lines.push("");
  lines.push(table(["Row Role", "Count"], ROW_ROLES.map((r) => [r, String(byRow[r] ?? 0)])));
  lines.push("");

  lines.push("## Faction Rank Breakdown");
  lines.push("");
  for (const faction of [...PLAYABLE_FACTIONS, "Jokers"]) {
    const factionCards = cards.filter((c) => c.faction === faction);
    const ranks = countBy(factionCards, (c) => c.rank);
    const rankRows = faction === "Jokers"
      ? [["JOKER", String(ranks[0] ?? 0)]]
      : RANKS_ASC.map((rank) => [rankLabel(rank), String(ranks[rank] ?? 0)]);
    lines.push(`### ${faction}`);
    lines.push("");
    lines.push(table(["Rank", "Count"], rankRows));
    lines.push("");
  }

  lines.push("## Budget Spend");
  lines.push("");
  lines.push(table(
    ["Metric", "Value"],
    [
      ["Min", String(Math.min(...spends))],
      ["Max", String(Math.max(...spends))],
      ["Avg", avg(spends).toFixed(2)]
    ]
  ));
  lines.push("");

  lines.push("## Top 10 Highest ATK+HP");
  lines.push("");
  lines.push(
    table(
      ["Card ID", "Name", "Faction", "Rank", "ATK", "HP", "Row", "Rarity", "Budget"],
      topAtkHp.map((c) => [
        c.id,
        c.name,
        c.faction,
        c.rankName,
        String(c.stats.atk),
        String(c.stats.hp),
        c.rowRole,
        c.rarity,
        `${c.costs.powerBudgetSpent}/${c.costs.budgetCap}`
      ])
    )
  );
  lines.push("");

  lines.push("## Validation Warnings");
  lines.push("");
  if (!warnings || warnings.length === 0) {
    lines.push("- None");
  } else {
    for (const warning of warnings) lines.push(`- ${warning}`);
  }
  lines.push("");

  return lines.join("\n");
}

