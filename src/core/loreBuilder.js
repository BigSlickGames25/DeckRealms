function safePick(rng, list, fallback = "") {
  if (!Array.isArray(list) || list.length === 0) return fallback;
  return rng.pick(list);
}

export function buildLore({ rng, card, loreTemplates }) {
  const factionSet = loreTemplates.factions?.[card.faction] ?? {};
  const motive = safePick(rng, factionSet.motives, "seeks leverage in the next conflict");
  const visual = safePick(rng, factionSet.visualCues, "marked by practical battlefield wear");
  const ideology = safePick(rng, factionSet.ideology, "their creed shapes every choice");
  const quirk = safePick(rng, factionSet.quirks, "They keep a private ritual before each detonation.");

  const abilityTag = card.synergyTags[0] ?? "discipline";
  const buildLine = card.abilities.buildPhase
    ? `In the build phase, ${card.name.split(",")[0]} leans on ${abilityTag} to prepare the line before the strike lands.`
    : `${card.name.split(",")[0]} favors immediate pressure over elaborate setup, turning ${abilityTag} into a blunt threat.`;

  const sentence1 = `${card.name} ${motive}.`;
  const sentence2 = `They are known for ${visual}, and ${ideology}.`;
  const sentence3 = card.rarity === "COMMON" && !card.abilities.buildPhase ? quirk : buildLine;

  return `${sentence1} ${sentence2} ${sentence3}`.replace(/\s+/g, " ").trim();
}

