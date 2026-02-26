import path from "node:path";
import { mkdir } from "node:fs/promises";
import { generateCardForge } from "../core/generator.js";
import { DEFAULT_OUTPUT_FILES } from "../core/constants.js";
import { projectRootFrom, readJson, writeJson, writeText } from "../utils/io.js";

function parseArgs(argv) {
  const args = { seed: 1337, outDir: "data", countsFile: null };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--seed") {
      args.seed = argv[i + 1] ?? args.seed;
      i += 1;
    } else if (token === "--outDir") {
      args.outDir = argv[i + 1] ?? args.outDir;
      i += 1;
    } else if (token === "--countsFile") {
      args.countsFile = argv[i + 1] ?? null;
      i += 1;
    }
  }
  return args;
}

async function main() {
  const projectRoot = projectRootFrom(import.meta.url);
  const args = parseArgs(process.argv.slice(2));
  const seed = Number.isFinite(Number(args.seed)) ? Number(args.seed) : String(args.seed);

  let countsConfig = null;
  if (args.countsFile) {
    const countsPath = path.isAbsolute(args.countsFile)
      ? args.countsFile
      : path.resolve(process.cwd(), args.countsFile);
    countsConfig = await readJson(countsPath);
  }

  const outDir = path.isAbsolute(args.outDir)
    ? args.outDir
    : path.resolve(projectRoot, args.outDir);
  await mkdir(outDir, { recursive: true });

  const result = await generateCardForge({ seed, countsConfig, projectRoot });

  await Promise.all([
    writeJson(path.join(outDir, DEFAULT_OUTPUT_FILES.cards), result.cards),
    writeText(path.join(outDir, DEFAULT_OUTPUT_FILES.prompts), result.promptsText),
    writeText(path.join(outDir, DEFAULT_OUTPUT_FILES.report), result.reportMarkdown),
    writeJson(path.join(outDir, DEFAULT_OUTPUT_FILES.deckpacks), result.deckpacks)
  ]);

  console.log(`Generated ${result.cards.length} cards with seed ${seed}`);
  console.log(`Outputs written to ${outDir}`);
  if (result.warnings.length > 0) {
    console.log(`Warnings: ${result.warnings.length}`);
    for (const warning of result.warnings.slice(0, 10)) {
      console.log(`- ${warning}`);
    }
    if (result.warnings.length > 10) {
      console.log(`- ...and ${result.warnings.length - 10} more`);
    }
  }
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});

