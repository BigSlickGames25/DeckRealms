# deck-realms-card-forge

Procedural backend generator for Deck Realms (War Poker) character cards (Node.js ESM, no UI).

## What It Generates

Running the generator writes:

- `data/cards.generated.json` (full card pool)
- `data/prompts.generated.txt` (tab-separated art prompts, one per card)
- `data/report.generated.md` (counts, budget stats, top stat cards, warnings)
- `data/deckpacks.generated.json` (starter/expansion packs for the four core factions + Joker shard pool)

## Quick Start

Requirements:

- Node.js 18+ (tested with modern Node that supports `node --test`)

Commands:

```bash
npm run generate
npm run game:start
npm run preview
npm run validate
npm test
```

Generate with a specific seed:

```bash
node src/cli/generate.js --seed 1337
```

Custom output directory:

```bash
node src/cli/generate.js --seed 1337 --outDir data
```

Preview generated cards + a simple terminal auto-battle demo:

```bash
npm run preview
node src/cli/preview.js --left Hearts --right Spades --seed 1337 --turns 8
```

Note: `preview` uses simplified prototype rules to visualize the generated content. It is not the final Telegram game logic.

## Opening Sequence Web Prototype (HTML5)

A browser-playable opening sequence prototype is included in `web/`:

- title screen + intro panels
- faction selection
- codex / backstory drawer
- point-and-click tutorial mission (hotspots, dialogue, inventory, recruit)
- tutorial recruit reward pulled from `data/cards.generated.json` when available

Run a local server:

```bash
npm run game:start
```

Then open:

- `http://127.0.0.1:8787/`

Notes:

- This is the story/tutorial vertical slice (combat intentionally deferred).
- The UI is built as plain HTML/CSS/JS so it can later be wrapped by Telegram WebApp integration.

## Determinism

- The generator uses a seeded RNG (`mulberry32`).
- Same seed + same inputs => same generated outputs.
- Different seed => different names, abilities, stats, lore, and pack composition.

## Changing Counts and Distributions

### 1) Counts per faction (`--countsFile`)

Create a JSON file such as `counts.custom.json`:

```json
{
  "Hearts": 60,
  "Spades": 60,
  "Diamonds": 60,
  "Clubs": 60,
  "Jokers": 16
}
```

Run:

```bash
node src/cli/generate.js --seed 1337 --countsFile counts.custom.json
```

Notes:

- Default core faction count `60` produces the exact canon rank distribution (2-10 x4, J/Q/K/A x6).
- If you use non-60 counts, rank distribution is scaled from the default profile.
- Joker starter/expansion packs are intentionally not built under default rules (16 cards is not enough for a 41-card ladder). Jokers are output as a legendary shard pool in `deckpacks.generated.json`.

### 2) Row role / rarity distributions

Edit `src/core/constants.js`:

- `DEFAULT_ROW_ROLE_WEIGHTS`
- `DEFAULT_RARITY_WEIGHTS`

The planner rounds weights into exact per-faction counts.

## Adding Abilities and Templates Safely

### Ability library

File: `src/data/abilityLibrary.json`

Rules:

- Keep edits inside the `abilities` array (`SAFE_EDIT_NOTE` is at the top).
- Each ability must have a unique `id`.
- `timing` must be exactly `buildPhase` or `detonation`.
- `cost` must be an integer `1..8`.
- Use `factions` (`["Hearts"]`, etc., or `["Any"]`) and `rowRoles` (`["FRONT"]`, `["MIDDLE"]`, `["BACK"]`, `["ANY"]`) to control eligibility.
- Use `rarityGate` to restrict access (`COMMON_PLUS`, `RARE_PLUS`, `EPIC_PLUS`, `LEGENDARY_ONLY`, etc.).

### Name / lore / prompt templates

Files:

- `src/data/nameTemplates.json`
- `src/data/loreTemplates.json`
- `src/data/promptTemplates.json`

Guidelines:

- Extend arrays with short, setting-consistent entries.
- Keep lore fragments as phrase fragments (no trailing punctuation).
- Keep the prompt base style stable if you want a coherent visual set.

## Validation and Schemas

- Schemas live in:
  - `src/schemas/card.schema.json`
  - `src/schemas/deckpacks.schema.json`
- `npm run validate` validates generated files using Ajv if installed, otherwise falls back to built-in structural validators.

## Project Structure (High-Level)

- `src/core/generator.js` main orchestration
- `src/core/budget.js` power budget rules
- `src/core/selector.js` distribution planners and ability filtering
- `src/core/nameBuilder.js`, `loreBuilder.js`, `promptBuilder.js`
- `src/core/deckpacks.js` starter/expansion pack assembly
- `src/core/report.js` markdown report generator
- `src/cli/generate.js`, `src/cli/validate.js`

## Curating Into Canon Sets Later

Suggested workflow:

1. Generate a large seeded pool (default 256).
2. Review `data/report.generated.md` for balance outliers and warnings.
3. Curate by faction/rank into a canonical set list (manual picks or scripted filters).
4. Freeze selected card IDs in a curated manifest (recommended future file: `data/cards.curated.json`).
5. Only then lock lore/art polish and gameplay tuning.

This keeps procedural generation as a content prototyping tool while preserving canon quality control.
