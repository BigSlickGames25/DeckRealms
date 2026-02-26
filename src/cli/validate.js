import path from "node:path";
import { readFile } from "node:fs/promises";
import { DEFAULT_OUTPUT_FILES } from "../core/constants.js";
import { projectRootFrom, readJson } from "../utils/io.js";
import { validateWithSchemaFallback } from "../utils/validateSchema.js";

function parseArgs(argv) {
  const args = { dir: "data" };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dir" || token === "--outDir") {
      args.dir = argv[i + 1] ?? args.dir;
      i += 1;
    }
  }
  return args;
}

async function validatePromptsFile(promptsPath, cards) {
  const raw = await readFile(promptsPath, "utf8");
  const lines = raw.trim().split(/\r?\n/);
  const errors = [];
  if (lines.length !== cards.length) {
    errors.push(`prompts line count (${lines.length}) does not match cards (${cards.length})`);
  }
  for (let i = 0; i < Math.min(lines.length, cards.length, 10); i += 1) {
    const [id, name, prompt] = lines[i].split("\t");
    if (!id || !name || !prompt) {
      errors.push(`prompt line ${i + 1} must contain tab-separated id, name, prompt`);
      break;
    }
    if (id !== cards[i].id) {
      errors.push(`prompt line ${i + 1} id mismatch (${id} != ${cards[i].id})`);
      break;
    }
  }
  return { valid: errors.length === 0, errors };
}

async function main() {
  const projectRoot = projectRootFrom(import.meta.url);
  const args = parseArgs(process.argv.slice(2));
  const outDir = path.isAbsolute(args.dir) ? args.dir : path.resolve(projectRoot, args.dir);

  const cardsPath = path.join(outDir, DEFAULT_OUTPUT_FILES.cards);
  const deckpacksPath = path.join(outDir, DEFAULT_OUTPUT_FILES.deckpacks);
  const promptsPath = path.join(outDir, DEFAULT_OUTPUT_FILES.prompts);

  const [cards, deckpacks] = await Promise.all([readJson(cardsPath), readJson(deckpacksPath)]);

  const [cardsRes, deckpacksRes, promptsRes] = await Promise.all([
    validateWithSchemaFallback({
      schemaPath: path.join(projectRoot, "src", "schemas", "card.schema.json"),
      data: cards,
      kind: "cards"
    }),
    validateWithSchemaFallback({
      schemaPath: path.join(projectRoot, "src", "schemas", "deckpacks.schema.json"),
      data: deckpacks,
      kind: "deckpacks"
    }),
    validatePromptsFile(promptsPath, cards)
  ]);

  const failures = [];
  if (!cardsRes.valid) failures.push(...cardsRes.errors.map((e) => `cards: ${e}`));
  if (!deckpacksRes.valid) failures.push(...deckpacksRes.errors.map((e) => `deckpacks: ${e}`));
  if (!promptsRes.valid) failures.push(...promptsRes.errors.map((e) => `prompts: ${e}`));

  if (failures.length > 0) {
    console.error("Validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Validation passed for ${cards.length} cards and deckpacks in ${outDir}`);
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});

