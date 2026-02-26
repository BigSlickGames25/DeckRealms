function pickUnique(rng, list, used, fallbackPrefix) {
  const tries = Math.max(6, list.length * 2);
  for (let i = 0; i < tries; i += 1) {
    const choice = rng.pick(list);
    if (!used.has(choice)) {
      used.add(choice);
      return choice;
    }
  }
  const generated = `${fallbackPrefix} ${String(used.size + 1).padStart(2, "0")}`;
  used.add(generated);
  return generated;
}

export function createNameBuilder(nameTemplates) {
  const usedNames = new Set();
  const serials = {
    Spades: 100,
    Diamonds: 300
  };

  return function buildName({ rng, faction, rankName }) {
    const t = nameTemplates.factions?.[faction];
    if (!t) return `${faction} Operative ${rankName}`;

    if (faction === "Hearts") {
      const title = rng.pick(t.titles);
      const given = rng.pick(t.given);
      const house = rng.pick(t.houses);
      const epithet = rng.chance(0.35) ? `, ${rng.pick(t.epithets)}` : "";
      const name = `${title} ${given} of House ${house}${epithet}`;
      if (usedNames.has(name)) return `${name} II`;
      usedNames.add(name);
      return name;
    }

    if (faction === "Spades") {
      const role = rng.pick(t.titles);
      const surname = rng.pick(t.surnames);
      serials.Spades += rng.int(1, 7);
      const callsign = rng.pick(t.callsigns);
      const name = `${role} ${surname}, ${callsign}-${serials.Spades}`;
      if (usedNames.has(name)) return `${name}A`;
      usedNames.add(name);
      return name;
    }

    if (faction === "Diamonds") {
      const prefix = rng.pick(t.designators);
      const surname = rng.pick(t.surnames);
      serials.Diamonds += rng.int(2, 11);
      const node = `Node-${serials.Diamonds}`;
      const suffix = rng.chance(0.45) ? ` // ${rng.pick(t.epithets)}` : "";
      const name = `${prefix} ${surname} ${node}${suffix}`;
      if (usedNames.has(name)) return `${name}-B`;
      usedNames.add(name);
      return name;
    }

    if (faction === "Clubs") {
      const given = rng.pick(t.given);
      const epithet = rng.pick(t.epithets);
      const gang = rng.pick(t.crews);
      const name = `${given} "${epithet}" ${gang}`;
      if (usedNames.has(name)) return `${name} Jr.`;
      usedNames.add(name);
      return name;
    }

    if (faction === "Jokers") {
      const persona = pickUnique(rng, t.personas, usedNames, "Fragment");
      const shardTitle = rng.pick(t.shardTitles);
      return `${persona}, ${shardTitle}`;
    }

    const generic = `${faction} ${rankName} ${rng.int(1, 999)}`;
    if (usedNames.has(generic)) return `${generic}-${rng.int(1, 9)}`;
    usedNames.add(generic);
    return generic;
  };
}
