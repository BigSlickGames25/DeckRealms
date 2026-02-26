import path from "node:path";
import { buildPreviewText, loadGeneratedPreviewInputs } from "../core/preview.js";
import { projectRootFrom } from "../utils/io.js";

function parseArgs(argv) {
  const args = {
    dataDir: "data",
    seed: 1337,
    left: "Hearts",
    right: "Spades",
    turns: 8
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dataDir" || token === "--dir") {
      args.dataDir = argv[i + 1] ?? args.dataDir;
      i += 1;
    } else if (token === "--seed") {
      args.seed = argv[i + 1] ?? args.seed;
      i += 1;
    } else if (token === "--left") {
      args.left = argv[i + 1] ?? args.left;
      i += 1;
    } else if (token === "--right") {
      args.right = argv[i + 1] ?? args.right;
      i += 1;
    } else if (token === "--turns") {
      args.turns = argv[i + 1] ?? args.turns;
      i += 1;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = projectRootFrom(import.meta.url);
  const dataDir = path.isAbsolute(args.dataDir)
    ? args.dataDir
    : path.resolve(projectRoot, args.dataDir);

  const { cards, deckpacks } = await loadGeneratedPreviewInputs({ dataDir });
  const text = buildPreviewText({
    cards,
    deckpacks,
    leftFaction: String(args.left),
    rightFaction: String(args.right),
    seed: Number.isFinite(Number(args.seed)) ? Number(args.seed) : String(args.seed),
    turns: Math.max(1, Number.parseInt(args.turns, 10) || 8)
  });

  console.log(text);
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});

