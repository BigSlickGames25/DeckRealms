import { FACTION_PALETTES } from "./constants.js";

const FACTION_VISUALS = {
  Hearts: "ornate covenant armor, ceremonial shields, bloodline sigils, austere noble silhouette",
  Spades: "tactical armor plating, disciplined stance, suppression gear, police-military insignia",
  Diamonds: "prism optics, prediction instruments, sleek technocrat attire, probability interfaces",
  Clubs: "scrap metal plates, salvaged tools, patchwork junk armor, undercity grime",
  Jokers: "fractured mask, shard fragments orbiting, unstable posture, reality glitches"
};

const ROW_GEAR = {
  FRONT: "heavy frontline gear, visible armor stress, aggressive combat readiness",
  MIDDLE: "support harnesses, tactical utility modules, balanced combat profile",
  BACK: "sensor arrays, control rigs, generator packs, ranged or arcane focus"
};

export function buildArtPrompt({ card, promptTemplates }) {
  const base = promptTemplates.baseStyle;
  const factionLine = `faction palette ${FACTION_PALETTES[card.faction]}, ${FACTION_VISUALS[card.faction]}`;
  const rowLine = ROW_GEAR[card.rowRole];
  const archetypeLine = `character concept: ${card.archetype}, ${card.name}`;
  const abilityCue = `combat cues: ${card.synergyTags.slice(0, 4).join(", ")}`;
  const extra = promptTemplates.factionExtras?.[card.faction] ?? "";

  return [base, factionLine, rowLine, archetypeLine, abilityCue, extra]
    .filter(Boolean)
    .join(", ");
}

