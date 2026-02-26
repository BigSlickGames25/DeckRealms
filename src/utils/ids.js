import { FACTION_CODES, RANK_NAME_MAP } from "../core/constants.js";

export function rankToName(rank) {
  return RANK_NAME_MAP[rank] ?? String(rank);
}

export function factionToCode(faction) {
  const code = FACTION_CODES[faction];
  if (!code) throw new Error(`Unknown faction: ${faction}`);
  return code;
}

export function formatRankForId(rank) {
  if (rank === 0) return "00";
  return String(rank).padStart(2, "0");
}

export function createCardId({ faction, rank, rowRole, serial }) {
  const code = factionToCode(faction);
  const row = String(rowRole).toUpperCase();
  const serialPart = String(serial).padStart(3, "0");
  return `${code}-${formatRankForId(rank)}-${row}-${serialPart}`;
}

