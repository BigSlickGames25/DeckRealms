import { readJson } from "./io.js";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(obj, allowedKeys) {
  return Object.keys(obj).every((key) => allowedKeys.includes(key));
}

function validateAbilityRef(value, path, errors) {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return;
  }
  const required = ["id", "name", "timing", "cost", "text", "tags"];
  for (const key of required) {
    if (!(key in value)) errors.push(`${path}.${key} is required`);
  }
  if (typeof value.id !== "string") errors.push(`${path}.id must be string`);
  if (typeof value.name !== "string") errors.push(`${path}.name must be string`);
  if (!["buildPhase", "detonation"].includes(value.timing)) {
    errors.push(`${path}.timing must be buildPhase or detonation`);
  }
  if (!Number.isInteger(value.cost) || value.cost < 1 || value.cost > 8) {
    errors.push(`${path}.cost must be integer 1..8`);
  }
  if (typeof value.text !== "string") errors.push(`${path}.text must be string`);
  if (!Array.isArray(value.tags) || !value.tags.every((t) => typeof t === "string")) {
    errors.push(`${path}.tags must be string[]`);
  }
}

export function validateCardsData(cards) {
  const errors = [];
  if (!Array.isArray(cards)) {
    return { valid: false, errors: ["cards dataset must be an array"] };
  }

  const seenIds = new Set();
  for (let i = 0; i < cards.length; i += 1) {
    const card = cards[i];
    const p = `cards[${i}]`;
    if (!isObject(card)) {
      errors.push(`${p} must be an object`);
      continue;
    }

    const required = [
      "id",
      "name",
      "faction",
      "rank",
      "rankName",
      "rowRole",
      "archetype",
      "rarity",
      "stats",
      "abilities",
      "synergyTags",
      "lore",
      "artPrompt",
      "costs",
      "version"
    ];
    for (const key of required) {
      if (!(key in card)) errors.push(`${p}.${key} is required`);
    }

    if (typeof card.id !== "string") errors.push(`${p}.id must be string`);
    if (seenIds.has(card.id)) errors.push(`${p}.id must be unique`);
    seenIds.add(card.id);
    if (typeof card.name !== "string") errors.push(`${p}.name must be string`);
    if (!["Hearts", "Spades", "Diamonds", "Clubs", "Jokers"].includes(card.faction)) {
      errors.push(`${p}.faction invalid`);
    }
    if (!Number.isInteger(card.rank) || card.rank < 0 || card.rank > 14) {
      errors.push(`${p}.rank must be integer 0..14`);
    }
    if (typeof card.rankName !== "string") errors.push(`${p}.rankName must be string`);
    if (!["FRONT", "MIDDLE", "BACK"].includes(card.rowRole)) errors.push(`${p}.rowRole invalid`);
    if (typeof card.archetype !== "string") errors.push(`${p}.archetype must be string`);
    if (!["COMMON", "RARE", "EPIC", "LEGENDARY"].includes(card.rarity)) errors.push(`${p}.rarity invalid`);

    if (!isObject(card.stats)) {
      errors.push(`${p}.stats must be an object`);
    } else {
      for (const key of ["hp", "atk", "shieldCap", "chargeCap"]) {
        if (!Number.isInteger(card.stats[key]) || card.stats[key] < 0) {
          errors.push(`${p}.stats.${key} must be integer >= 0`);
        }
      }
    }

    if (!isObject(card.abilities)) {
      errors.push(`${p}.abilities must be an object`);
    } else {
      if (!("detonation" in card.abilities)) errors.push(`${p}.abilities.detonation is required`);
      if (card.abilities.buildPhase !== null && card.abilities.buildPhase !== undefined) {
        validateAbilityRef(card.abilities.buildPhase, `${p}.abilities.buildPhase`, errors);
      }
      validateAbilityRef(card.abilities.detonation, `${p}.abilities.detonation`, errors);
      if (card.abilities.buildPhase && card.abilities.buildPhase.timing !== "buildPhase") {
        errors.push(`${p}.abilities.buildPhase.timing must be buildPhase`);
      }
      if (card.abilities.detonation?.timing !== "detonation") {
        errors.push(`${p}.abilities.detonation.timing must be detonation`);
      }
    }

    if (!Array.isArray(card.synergyTags) || !card.synergyTags.every((t) => typeof t === "string")) {
      errors.push(`${p}.synergyTags must be string[]`);
    }
    if (typeof card.lore !== "string") errors.push(`${p}.lore must be string`);
    if (typeof card.artPrompt !== "string") errors.push(`${p}.artPrompt must be string`);

    if (!isObject(card.costs)) {
      errors.push(`${p}.costs must be an object`);
    } else {
      for (const key of ["powerBudgetSpent", "abilityCostTotal", "budgetCap", "baseStatCost", "underspend"]) {
        if (!Number.isInteger(card.costs[key])) errors.push(`${p}.costs.${key} must be integer`);
      }
      if (Number.isInteger(card.costs.underspend) && (card.costs.underspend < 0 || card.costs.underspend > 1)) {
        errors.push(`${p}.costs.underspend must be 0 or 1`);
      }
    }

    if (card.faction === "Jokers") {
      if (card.rank !== 0) errors.push(`${p}.rank must be 0 for Jokers`);
      if (card.rankName !== "JOKER") errors.push(`${p}.rankName must be JOKER for Jokers`);
      if (card.rarity !== "LEGENDARY") errors.push(`${p}.rarity must be LEGENDARY for Jokers`);
      if (!Number.isInteger(card.maskRank) || card.maskRank < 2 || card.maskRank > 14) {
        errors.push(`${p}.maskRank must be integer 2..14 for Jokers`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateDeckpacksData(deckpacks) {
  const errors = [];
  if (!isObject(deckpacks)) {
    return { valid: false, errors: ["deckpacks dataset must be an object"] };
  }
  for (const key of ["version", "seed", "packs"]) {
    if (!(key in deckpacks)) errors.push(`deckpacks.${key} is required`);
  }
  if (typeof deckpacks.version !== "string") errors.push("deckpacks.version must be string");
  if (!(typeof deckpacks.seed === "string" || typeof deckpacks.seed === "number")) {
    errors.push("deckpacks.seed must be string or number");
  }
  if (!isObject(deckpacks.packs)) {
    errors.push("deckpacks.packs must be an object");
    return { valid: errors.length === 0, errors };
  }

  for (const faction of ["Hearts", "Spades", "Diamonds", "Clubs"]) {
    const bundle = deckpacks.packs[faction];
    if (!isObject(bundle)) {
      errors.push(`deckpacks.packs.${faction} must be an object`);
      continue;
    }
    const starter = bundle["Starter-21"];
    const expansion = bundle["Expansion-41"];
    if (!isObject(starter)) errors.push(`deckpacks.packs.${faction}.Starter-21 must be object`);
    if (!isObject(expansion)) errors.push(`deckpacks.packs.${faction}.Expansion-41 must be object`);
    if (isObject(starter)) {
      for (const arrKey of ["starting", "recruitables", "all"]) {
        if (!Array.isArray(starter[arrKey]) || !starter[arrKey].every((id) => typeof id === "string")) {
          errors.push(`deckpacks.packs.${faction}.Starter-21.${arrKey} must be string[]`);
        }
      }
      if (Array.isArray(starter.all) && starter.all.length !== 21) {
        errors.push(`deckpacks.packs.${faction}.Starter-21.all must have 21 ids`);
      }
    }
    if (isObject(expansion)) {
      for (const arrKey of ["additional", "totalWithStarter"]) {
        if (!Array.isArray(expansion[arrKey]) || !expansion[arrKey].every((id) => typeof id === "string")) {
          errors.push(`deckpacks.packs.${faction}.Expansion-41.${arrKey} must be string[]`);
        }
      }
      if (Array.isArray(expansion.additional) && expansion.additional.length !== 20) {
        errors.push(`deckpacks.packs.${faction}.Expansion-41.additional must have 20 ids`);
      }
      if (Array.isArray(expansion.totalWithStarter) && expansion.totalWithStarter.length !== 41) {
        errors.push(`deckpacks.packs.${faction}.Expansion-41.totalWithStarter must have 41 ids`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export async function validateJsonFileAgainstKnownSchema({ dataPath }) {
  const data = await readJson(dataPath);
  if (dataPath.endsWith("cards.generated.json")) return validateCardsData(data);
  if (dataPath.endsWith("deckpacks.generated.json")) return validateDeckpacksData(data);
  return { valid: true, errors: [] };
}

export async function tryValidateWithAjv({ schemaPath, data }) {
  try {
    const ajvModule = await import("ajv/dist/2020.js");
    const Ajv2020 = ajvModule.default;
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const schema = await readJson(schemaPath);
    const validate = ajv.compile(schema);
    const ok = validate(data);
    return {
      valid: Boolean(ok),
      errors: (validate.errors ?? []).map((err) => `${err.instancePath || "/"} ${err.message}`)
    };
  } catch {
    return null;
  }
}

export async function validateWithSchemaFallback({ schemaPath, data, kind }) {
  const ajvResult = await tryValidateWithAjv({ schemaPath, data });
  if (ajvResult) return ajvResult;

  if (kind === "cards") return validateCardsData(data);
  if (kind === "deckpacks") return validateDeckpacksData(data);
  return { valid: true, errors: [] };
}

