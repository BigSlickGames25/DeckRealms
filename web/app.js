import {
  APP_VERSION,
  DIALOGUE,
  FACTIONS,
  INTRO_PANELS,
  PRODUCTION_PROMPTS,
  SCENES,
  TIMELINE_ENTRIES,
  TUTORIAL_MISSION
} from "./data/openingContent.js";

const STORAGE_KEY = "deck_realms_opening_save_v1";
const LOCKER_IMAGE_BASE = "/src/images/scene1";
const DIALOGUE_CLOSEUP_IMAGES = {
  handlerIntro: {
    filename: "handler.jpg",
    eyebrow: "Scene 1 - Handler Close-Up",
    alt: "Handler close-up in the district courtyard"
  },
  noticeBoard: {
    filename: "notice-board.jpg",
    eyebrow: "Scene 1 - Notice Board Close-Up",
    alt: "Mission notice board close-up in the district courtyard"
  }
};
const LOCKER_CLOSEUP_IMAGES = {
  both: "2-items.jpg",
  noBadge: "no-badge.jpg",
  noWarning: "no-warning.jpg",
  empty: "no-items.jpg"
};
const LOCKER_PICKUPS = {
  "transit-sigil": {
    id: "transit-sigil",
    name: "Transit Sigil",
    description: "A district gate badge used to access Faultline Alley.",
    hotspotLabel: "Take Transit Sigil",
    hotspot: { x: 49, y: 23, w: 12, h: 24 }
  },
  "charge-spool": {
    id: "charge-spool",
    name: "Training Charge Spool",
    description: "Low-grade training capacitor. Flavor item for the tutorial.",
    hotspotLabel: "Take Warning Spool",
    hotspot: { x: 46, y: 59, w: 17, h: 22 }
  }
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatFactionName(factionId) {
  return FACTIONS[factionId]?.id ?? "Faction";
}

function speakerLabel(dialogueId, factionId) {
  const kind = DIALOGUE[dialogueId]?.speakerType;
  if (kind === "mentor") return `${FACTIONS[factionId]?.tutorialMentor ?? "Handler"}`;
  if (kind === "runner") return "Courier Runner";
  if (kind === "system") return "System";
  return "Narrator";
}

class OpeningSequenceGame {
  constructor(root) {
    this.root = root;
    this.cardsDb = null;
    this.cardsLoadError = null;
    this.state = this.createInitialState();
    this._boundClick = (event) => this.handleClick(event);
    this._boundChange = (event) => this.handleChange(event);
  }

  createInitialState() {
    return {
      screen: "title", // title | intro | faction | mission
      introIndex: 0,
      faction: null,
      codexOpen: false,
      sceneId: "courtyard",
      objectives: Object.fromEntries(TUTORIAL_MISSION.objectives.map((o) => [o.id, false])),
      flags: {
        runnerReady: false,
        runnerRecruited: false,
        lockerOpened: false,
        gateUnlocked: false,
        missionCompleteDialogueShown: false
      },
      inventory: [],
      selectedItemId: null,
      lockerOverlayOpen: false,
      log: [
        "Opening sequence loaded.",
        "Select New Game to begin the Fractured Millennium tutorial."
      ],
      activeDialogue: null, // { id, stepIndex, pendingChoice, choiceResultText }
      recruitReward: null,
      roster: [],
      cardsDbReady: false
    };
  }

  async init() {
    try {
      window.Telegram?.WebApp?.ready?.();
      window.Telegram?.WebApp?.expand?.();
    } catch {
      // Telegram WebApp is optional in local browser.
    }

    this.root.addEventListener("click", this._boundClick);
    this.root.addEventListener("change", this._boundChange);

    const loaded = this.loadSave();
    if (!loaded) {
      this.persist();
    }
    this.loadGeneratedCards();
    this.render();
  }

  async loadGeneratedCards() {
    try {
      const response = await fetch("/data/cards.generated.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const cards = await response.json();
      if (!Array.isArray(cards)) throw new Error("cards.generated.json is not an array");
      this.cardsDb = cards;
      this.state.cardsDbReady = true;
      this.log(`Loaded generated card pool (${cards.length}) for tutorial recruit rewards.`);
      this.persist();
      this.render();
    } catch (error) {
      this.cardsLoadError = error?.message ?? String(error);
      this.state.cardsDbReady = false;
      this.log(`Card pool unavailable in browser preview (${this.cardsLoadError}). Using fallback recruit card.`);
      this.persist();
      this.render();
    }
  }

  loadSave() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return false;
      this.state = {
        ...this.createInitialState(),
        ...parsed,
        objectives: {
          ...Object.fromEntries(TUTORIAL_MISSION.objectives.map((o) => [o.id, false])),
          ...(parsed.objectives ?? {})
        },
        flags: {
          ...this.createInitialState().flags,
          ...(parsed.flags ?? {})
        }
      };
      this.log("Save loaded.");
      return true;
    } catch {
      return false;
    }
  }

  persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Non-fatal in strict browser environments.
    }
  }

  log(message) {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    this.state.log = [`${timestamp} • ${message}`, ...this.state.log].slice(0, 14);
  }

  setFactionTheme() {
    const faction = this.state.faction && FACTIONS[this.state.faction];
    const palette = faction?.palette ?? {
      primary: "#222831",
      secondary: "#f3f0e5",
      accent: "#f0a020",
      glow: "rgba(240,160,32,0.22)"
    };
    const style = this.root.style;
    style.setProperty("--faction-primary", palette.primary);
    style.setProperty("--faction-secondary", palette.secondary);
    style.setProperty("--faction-accent", palette.accent);
    style.setProperty("--faction-glow", palette.glow);
  }

  objectiveDone(id) {
    return Boolean(this.state.objectives[id]);
  }

  completeObjective(id, logText) {
    if (!this.state.objectives[id]) {
      this.state.objectives[id] = true;
      if (logText) this.log(logText);
    }
  }

  hasItem(itemId) {
    return this.state.inventory.some((item) => item.id === itemId);
  }

  addItem(item) {
    if (this.hasItem(item.id)) return;
    this.state.inventory.push(item);
    this.log(`Item acquired: ${item.name}`);
  }

  lockerCloseupImageSrc() {
    const hasBadge = this.hasItem("transit-sigil");
    const hasWarning = this.hasItem("charge-spool");
    let filename = LOCKER_CLOSEUP_IMAGES.both;
    if (hasBadge && hasWarning) filename = LOCKER_CLOSEUP_IMAGES.empty;
    else if (hasBadge) filename = LOCKER_CLOSEUP_IMAGES.noBadge;
    else if (hasWarning) filename = LOCKER_CLOSEUP_IMAGES.noWarning;
    return `${LOCKER_IMAGE_BASE}/${filename}`;
  }

  lockerAvailablePickups() {
    return Object.values(LOCKER_PICKUPS).filter((item) => !this.hasItem(item.id));
  }

  dialogueCloseupAsset(dialogueId) {
    const asset = DIALOGUE_CLOSEUP_IMAGES[dialogueId];
    if (!asset) return null;
    return {
      ...asset,
      src: `${LOCKER_IMAGE_BASE}/${asset.filename}`
    };
  }

  openLockerOverlay() {
    this.state.flags.lockerOpened = true;
    this.state.lockerOverlayOpen = true;
    this.log("Opened supply locker for close inspection.");
    this.persist();
    this.render();
  }

  closeLockerOverlay() {
    if (!this.state.lockerOverlayOpen) return;
    this.state.lockerOverlayOpen = false;
    this.persist();
    this.render();
  }

  takeLockerItem(itemId) {
    if (!this.state.lockerOverlayOpen) return;
    const pickup = LOCKER_PICKUPS[itemId];
    if (!pickup || this.hasItem(itemId)) return;

    const noItemsBefore =
      !this.hasItem("transit-sigil") &&
      !this.hasItem("charge-spool");

    this.addItem({
      id: pickup.id,
      name: pickup.name,
      description: pickup.description
    });

    if (itemId === "transit-sigil") {
      this.completeObjective("collect-sigil", "Transit sigil collected from supply locker.");
    }

    if (noItemsBefore) {
      this.log(`Locker pickup order started with ${pickup.name}.`);
    }

    if (this.hasItem("transit-sigil") && this.hasItem("charge-spool")) {
      this.log("Supply locker is now empty.");
    }

    this.persist();
    this.render();
  }

  setScene(sceneId) {
    if (!SCENES[sceneId]) return;
    this.state.sceneId = sceneId;
    this.log(`Moved to ${SCENES[sceneId].title}.`);
  }

  startNewGame() {
    this.state = this.createInitialState();
    this.persist();
    this.render();
  }

  continueGame() {
    if (this.state.screen === "title") {
      this.state.screen = this.state.faction ? "mission" : "intro";
    }
    this.persist();
    this.render();
  }

  beginIntro() {
    this.state.screen = "intro";
    this.state.introIndex = 0;
    this.log("Intro sequence started.");
    this.persist();
    this.render();
  }

  nextIntro() {
    if (this.state.introIndex < INTRO_PANELS.length - 1) {
      this.state.introIndex += 1;
    } else {
      this.state.screen = "faction";
    }
    this.persist();
    this.render();
  }

  chooseFaction(factionId) {
    if (!FACTIONS[factionId]) return;
    this.state.faction = factionId;
    this.state.screen = "mission";
    this.state.sceneId = "courtyard";
    this.log(`Faction selected: ${factionId} (${FACTIONS[factionId].title}).`);
    this.openDialogue("handlerIntro");
    this.persist();
    this.render();
  }

  openDialogue(dialogueId) {
    const def = DIALOGUE[dialogueId];
    if (!def) return;
    this.state.activeDialogue = {
      id: dialogueId,
      stepIndex: 0,
      choiceResultText: null,
      choiceSelected: null
    };
    this.persist();
    this.render();
  }

  advanceDialogue() {
    const active = this.state.activeDialogue;
    if (!active) return;
    const def = DIALOGUE[active.id];
    if (!def) return;

    if (active.choiceResultText) {
      const choiceId = active.choiceSelected;
      const responseText = active.choiceResultText;
      const dialogueId = active.id;
      this.state.activeDialogue = null;
      this.handleDialoguePostChoice(dialogueId, choiceId, responseText);
      return;
    }

    const lastStep = def.steps.length - 1;
    if (active.stepIndex < lastStep) {
      active.stepIndex += 1;
      this.persist();
      this.render();
      return;
    }

    if (def.choices && def.choices.length > 0) {
      return;
    }

    const dialogueId = active.id;
    this.state.activeDialogue = null;
    this.handleDialogueCloseEffects(dialogueId);
    this.persist();
    this.render();
  }

  chooseDialogueOption(choiceId) {
    const active = this.state.activeDialogue;
    if (!active) return;
    const def = DIALOGUE[active.id];
    const choice = def?.choices?.find((c) => c.id === choiceId);
    if (!choice) return;

    active.choiceSelected = choice.id;
    active.choiceResultText = choice.response;

    if (choice.effect?.flag === "runner-ready") {
      this.state.flags.runnerReady = true;
    }

    if (choice.effect?.flag) {
      this.log(`Dialogue outcome: ${choice.effect.flag}`);
    }

    this.persist();
    this.render();
  }

  handleDialoguePostChoice(dialogueId, choiceId) {
    if (dialogueId === "runnerOpening") {
      if (choiceId === "respect") {
        this.openDialogue("runnerRecruitSuccess");
        return;
      }
      this.log("The runner stays cautious. Try a different approach.");
      this.persist();
      this.render();
      return;
    }
    this.persist();
    this.render();
  }

  handleDialogueCloseEffects(dialogueId) {
    switch (dialogueId) {
      case "handlerIntro":
        this.completeObjective("meet-handler", "Handler briefing complete.");
        break;
      case "noticeBoard":
        this.completeObjective("read-orders", "Mission orders reviewed.");
        break;
      case "lockerOpen":
        this.state.flags.lockerOpened = true;
        this.addItem({
          id: "transit-sigil",
          name: "Transit Sigil",
          description: "A district gate badge used to access Faultline Alley."
        });
        this.addItem({
          id: "charge-spool",
          name: "Training Charge Spool",
          description: "Low-grade training capacitor. Flavor item for the tutorial."
        });
        this.completeObjective("collect-sigil", "Transit sigil collected from supply locker.");
        break;
      case "gateOpened":
        this.state.flags.gateUnlocked = true;
        this.completeObjective("unlock-gate", "Transit gate unlocked.");
        this.setScene("alley");
        break;
      case "runnerRecruitSuccess":
        this.state.flags.runnerRecruited = true;
        this.completeObjective("recruit-runner", "Courier runner recruited.");
        this.recruitTutorialCard();
        if (!this.state.flags.missionCompleteDialogueShown) {
          this.state.flags.missionCompleteDialogueShown = true;
          this.setScene("courtyard");
          this.openDialogue("missionComplete");
          return;
        }
        break;
      default:
        break;
    }
  }

  recruitTutorialCard() {
    if (this.state.recruitReward) return;
    const card = this.pickTutorialRewardCard();
    this.state.recruitReward = card;
    this.state.roster.push(card);
    this.log(`Recruit joined your roster: ${card.name} (${card.rankName} ${card.faction})`);
  }

  pickTutorialRewardCard() {
    const faction = this.state.faction || "Hearts";
    if (Array.isArray(this.cardsDb)) {
      const candidates = this.cardsDb
        .filter((card) => card.faction === faction)
        .filter((card) => ["COMMON", "RARE"].includes(card.rarity))
        .filter((card) => card.rank >= 2 && card.rank <= 9)
        .sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));

      if (candidates.length > 0) {
        const picked = candidates.find((card) => card.rowRole === "MIDDLE") ?? candidates[0];
        return deepClone(picked);
      }
    }

    return {
      id: "TUT-FALLBACK-001",
      name: "Faultline Courier",
      faction,
      rank: 4,
      rankName: "4",
      rowRole: "MIDDLE",
      archetype: "Courier Runner",
      rarity: "COMMON",
      stats: { hp: 3, atk: 2, shieldCap: 1, chargeCap: 1 },
      abilities: {
        buildPhase: { name: "Quick Prep", cost: 1, timing: "buildPhase" },
        detonation: { name: "Route Dash", cost: 2, timing: "detonation" }
      },
      synergyTags: ["courier", "charge", "evasion"],
      lore: "A local runner who survives by reading alley rhythms faster than official patrol routes."
    };
  }

  useInventoryItemOn(targetId) {
    const selected = this.state.inventory.find((item) => item.id === this.state.selectedItemId);
    if (!selected) return false;
    if (targetId === "gate" && selected.id === "transit-sigil") {
      this.log(`Used ${selected.name} on Transit Gate.`);
      this.openDialogue("gateOpened");
      return true;
    }
    this.log(`${selected.name} has no effect on ${targetId}.`);
    this.persist();
    this.render();
    return false;
  }

  interactHotspot(hotspotId) {
    if (!this.state.faction) return;

    if (this.state.selectedItemId) {
      const consumed = this.useInventoryItemOn(hotspotId);
      if (consumed) return;
    }

    const sceneId = this.state.sceneId;
    if (sceneId === "courtyard") {
      switch (hotspotId) {
        case "mentor":
          this.openDialogue("handlerIntro");
          return;
        case "notice":
          this.openDialogue("noticeBoard");
          return;
        case "locker":
          if (!this.objectiveDone("read-orders")) {
            this.openDialogue("lockerLocked");
            return;
          }
          this.openLockerOverlay();
          return;
        case "gate":
          this.openDialogue(this.objectiveDone("collect-sigil") ? "gateLocked" : "gateLocked");
          return;
        default:
          return;
      }
    }

    if (sceneId === "alley") {
      switch (hotspotId) {
        case "runner":
          if (this.state.flags.runnerRecruited) {
            this.log("The courier runner is already in your roster.");
            this.persist();
            this.render();
            return;
          }
          this.openDialogue("runnerOpening");
          return;
        case "glyph":
          this.openDialogue("glyphInspect");
          return;
        case "crate":
          this.openDialogue("crateInspect");
          return;
        case "return-gate":
          this.setScene("courtyard");
          this.persist();
          this.render();
          return;
        default:
          return;
      }
    }
  }

  toggleCodex() {
    this.state.codexOpen = !this.state.codexOpen;
    this.persist();
    this.render();
  }

  handleClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    if (!action) return;
    event.preventDefault();

    switch (action) {
      case "new-game":
        this.beginIntro();
        return;
      case "reset-game":
        this.startNewGame();
        return;
      case "continue":
        this.continueGame();
        return;
      case "skip-to-faction":
        this.state.screen = "faction";
        this.persist();
        this.render();
        return;
      case "next-intro":
        this.nextIntro();
        return;
      case "choose-faction":
        this.chooseFaction(target.dataset.faction);
        return;
      case "toggle-codex":
        this.toggleCodex();
        return;
      case "dialogue-next":
        this.advanceDialogue();
        return;
      case "dialogue-choice":
        this.chooseDialogueOption(target.dataset.choice);
        return;
      case "locker-close":
        this.closeLockerOverlay();
        return;
      case "locker-pick":
        this.takeLockerItem(target.dataset.item);
        return;
      case "hotspot":
        this.interactHotspot(target.dataset.hotspot);
        return;
      case "select-item":
        this.state.selectedItemId = this.state.selectedItemId === target.dataset.item ? null : target.dataset.item;
        this.persist();
        this.render();
        return;
      case "clear-item":
        this.state.selectedItemId = null;
        this.persist();
        this.render();
        return;
      default:
        return;
    }
  }

  handleChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.name === "scene-test" && SCENES[target.value]) {
      this.state.sceneId = target.value;
      this.persist();
      this.render();
    }
  }

  render() {
    this.setFactionTheme();
    this.root.innerHTML = this.renderApp();
  }

  renderApp() {
    return `
      <div class="frame ${this.state.screen === "mission" ? "frame--mission" : ""}">
        ${this.renderHeader()}
        ${this.renderBody()}
        ${this.renderLockerOverlay()}
        ${this.renderDialogueOverlay()}
        ${this.renderCodexDrawer()}
      </div>
    `;
  }

  renderHeader() {
    const factionLabel = this.state.faction ? `${formatFactionName(this.state.faction)} • ${FACTIONS[this.state.faction].title}` : "No faction selected";
    return `
      <header class="topbar">
        <div class="brand">
          <div class="brand__kicker">Deck Realms</div>
          <div class="brand__title">Shadows of the Four • Opening Sequence</div>
        </div>
        <div class="topbar__meta">
          <div class="pill">${factionLabel}</div>
          <div class="pill">Build ${APP_VERSION}</div>
          <button class="btn btn--ghost" data-action="toggle-codex">${this.state.codexOpen ? "Close Codex" : "Open Codex"}</button>
          <button class="btn btn--ghost" data-action="reset-game">Reset Save</button>
        </div>
      </header>
    `;
  }

  renderBody() {
    switch (this.state.screen) {
      case "title":
        return this.renderTitleScreen();
      case "intro":
        return this.renderIntroScreen();
      case "faction":
        return this.renderFactionSelect();
      case "mission":
        return this.renderMissionScreen();
      default:
        return `<main class="screen-panel"><p>Unknown screen state.</p></main>`;
    }
  }

  renderTitleScreen() {
    return `
      <main class="screen-panel title-screen">
        <section class="hero-card">
          <div class="hero-card__eyebrow">Telegram HTML5 Saga Prototype</div>
          <h1>Deck Realms: Fractured Millennium</h1>
          <p class="hero-card__copy">
            Opening sequence vertical slice with intro panels, faction selection, backstory codex,
            and a point-and-click tutorial mission that recruits your first operative.
          </p>
          <div class="hero-card__actions">
            <button class="btn btn--primary" data-action="new-game">New Game</button>
            <button class="btn btn--ghost" data-action="continue">Continue</button>
            <button class="btn btn--ghost" data-action="skip-to-faction">Skip Intro</button>
          </div>
          <ul class="hero-card__notes">
            <li>Hidden-placement war-poker combat is referenced in tutorial dialogue only (combat not implemented yet).</li>
            <li>Tutorial recruit reward pulls from generated cards in <code>data/cards.generated.json</code> when available.</li>
            <li>Designed to be Telegram WebApp-ready later, but runs locally in a browser today.</li>
          </ul>
        </section>
        <section class="panel-stack">
          <article class="info-panel">
            <h2>Backstory Snapshot</h2>
            <p>Diamonds sell foresight. Spades enforce it. Clubs survive inside its wreckage. Hearts reject the system. Jokers distort what Diamonds see.</p>
          </article>
          <article class="info-panel">
            <h2>Current Goal</h2>
            <p>Get a new player into the world fast: establish tone, faction identity, and the recruit-to-build-your-army loop before combat complexity lands.</p>
          </article>
        </section>
      </main>
    `;
  }

  renderIntroScreen() {
    const panel = INTRO_PANELS[this.state.introIndex];
    return `
      <main class="screen-panel intro-screen">
        <section class="comic-panel">
          <div class="comic-panel__index">Panel ${this.state.introIndex + 1} / ${INTRO_PANELS.length}</div>
          <h2>${panel.caption}</h2>
          <p>${panel.subtext}</p>
          <div class="comic-panel__actions">
            <button class="btn btn--primary" data-action="next-intro">${this.state.introIndex + 1 < INTRO_PANELS.length ? "Next Panel" : "Choose Faction"}</button>
            <button class="btn btn--ghost" data-action="skip-to-faction">Skip Intro</button>
          </div>
        </section>
      </main>
    `;
  }

  renderFactionSelect() {
    const cards = Object.values(FACTIONS)
      .map(
        (f) => `
          <button class="faction-card" data-action="choose-faction" data-faction="${f.id}">
            <div class="faction-card__title">${f.id}</div>
            <div class="faction-card__subtitle">${f.title}</div>
            <p>${f.summary}</p>
            <div class="faction-card__district">Start District: ${f.district}</div>
          </button>
        `
      )
      .join("");

    return `
      <main class="screen-panel faction-screen">
        <section class="intro-block">
          <h2>Choose Your Opening Faction</h2>
          <p>
            This selection themes the intro mentor, district visuals, and tutorial recruit. The mission flow is shared for now.
          </p>
        </section>
        <section class="faction-grid">${cards}</section>
      </main>
    `;
  }

  renderMissionScreen() {
    const faction = FACTIONS[this.state.faction] ?? Object.values(FACTIONS)[0];
    const scene = SCENES[this.state.sceneId];
    const hotspots = scene.hotspots
      .map(
        (h) => `
          <button
            class="hotspot"
            data-action="hotspot"
            data-hotspot="${h.id}"
            style="left:${h.x}%;top:${h.y}%;width:${h.w}%;height:${h.h}%"
            aria-label="${h.label}"
            title="${h.label}"
          >
            <span>${h.label}</span>
          </button>
        `
      )
      .join("");

    const sceneClass = `scene-stage scene-stage--${this.state.sceneId} scene-stage--${this.state.faction?.toLowerCase() ?? "neutral"}`;

    return `
      <main class="mission-layout">
        <section class="stage-column">
          <div class="mission-banner">
            <div>
              <div class="mission-banner__eyebrow">${TUTORIAL_MISSION.subtitle}</div>
              <h2>${TUTORIAL_MISSION.title}</h2>
              <p>${TUTORIAL_MISSION.briefing}</p>
            </div>
            <div class="mission-banner__scene-meta">
              <div class="pill">${scene.title}</div>
              <div class="pill">${faction.district}</div>
            </div>
          </div>

          <div class="${sceneClass}">
            <div class="scene-stage__grid"></div>
            <div class="scene-stage__label">${scene.title}</div>
            <div class="scene-stage__mood">${scene.mood}</div>
            <div class="scene-stage__text">${scene.backdropText}</div>
            <div class="hotspot-layer">
              ${hotspots}
            </div>
          </div>

          <div class="tutorial-strip">
            <h3>Tutorial Notes</h3>
            <ul>
              ${TUTORIAL_MISSION.tutorialTips.map((tip) => `<li>${tip}</li>`).join("")}
            </ul>
          </div>
        </section>

        <aside class="hud-column">
          ${this.renderObjectives()}
          ${this.renderInventory()}
          ${this.renderRecruitReward()}
          ${this.renderLog()}
        </aside>
      </main>
    `;
  }

  renderObjectives() {
    const items = TUTORIAL_MISSION.objectives
      .map((obj) => {
        const done = this.objectiveDone(obj.id);
        return `
          <li class="objective ${done ? "is-done" : ""}">
            <span class="objective__icon">${done ? "✓" : "○"}</span>
            <span>${obj.label}</span>
          </li>
        `;
      })
      .join("");
    return `
      <section class="hud-panel">
        <h3>Mission Objectives</h3>
        <ol class="objective-list">${items}</ol>
      </section>
    `;
  }

  renderInventory() {
    const items = this.state.inventory
      .map((item) => {
        const selected = this.state.selectedItemId === item.id;
        return `
          <button class="inventory-item ${selected ? "is-selected" : ""}" data-action="select-item" data-item="${item.id}" title="${item.description}">
            <span class="inventory-item__name">${item.name}</span>
            <span class="inventory-item__desc">${item.description}</span>
          </button>
        `;
      })
      .join("");
    return `
      <section class="hud-panel">
        <div class="hud-panel__header">
          <h3>Inventory</h3>
          <button class="btn btn--ghost btn--tiny" data-action="clear-item">Clear Selection</button>
        </div>
        <p class="small-note">Selected items can be used on scene hotspots.</p>
        <div class="inventory-list">
          ${items || `<div class="empty-state">No items yet.</div>`}
        </div>
      </section>
    `;
  }

  renderRecruitReward() {
    const card = this.state.recruitReward;
    if (!card) {
      return `
        <section class="hud-panel">
          <h3>Recruit Reward</h3>
          <div class="empty-state">Complete the alley negotiation to recruit your first operative.</div>
          <div class="small-note">${this.state.cardsDbReady ? "Generated card pool connected." : "Waiting for generated card pool or using fallback when needed."}</div>
        </section>
      `;
    }

    return `
      <section class="hud-panel recruit-panel">
        <h3>New Recruit</h3>
        <div class="recruit-card">
          <div class="recruit-card__id">${card.id ?? "TUTORIAL"}</div>
          <div class="recruit-card__name">${card.name}</div>
          <div class="recruit-card__meta">${card.faction} • ${card.rankName} • ${card.rowRole} • ${card.rarity ?? "COMMON"}</div>
          <div class="recruit-card__stats">
            HP ${card.stats.hp} / ATK ${card.stats.atk} / SHD ${card.stats.shieldCap} / CHG ${card.stats.chargeCap}
          </div>
          <div class="recruit-card__lore">${card.lore ?? "A district operative with useful instincts and dangerous timing."}</div>
        </div>
      </section>
    `;
  }

  renderLog() {
    return `
      <section class="hud-panel">
        <h3>Mission Log</h3>
        <div class="log-list">
          ${this.state.log.map((entry) => `<div class="log-list__item">${entry}</div>`).join("")}
        </div>
      </section>
    `;
  }

  renderLockerOverlay() {
    if (!this.state.lockerOverlayOpen) return "";

    const availablePickups = this.lockerAvailablePickups();
    const pickupButtons = availablePickups
      .map(
        (pickup) => `
          <button
            class="locker-hotspot locker-hotspot--${pickup.id}"
            data-action="locker-pick"
            data-item="${pickup.id}"
            style="left:${pickup.hotspot.x}%;top:${pickup.hotspot.y}%;width:${pickup.hotspot.w}%;height:${pickup.hotspot.h}%"
            aria-label="${pickup.hotspotLabel}"
            title="${pickup.hotspotLabel}"
          >
            <span>${pickup.hotspotLabel}</span>
          </button>
        `
      )
      .join("");

    const sigilCollected = this.hasItem("transit-sigil");
    const spoolCollected = this.hasItem("charge-spool");

    return `
      <div class="locker-overlay" role="dialog" aria-modal="true" aria-label="Supply locker contents">
        <div class="locker-panel">
          <div class="locker-panel__header">
            <div>
              <div class="locker-panel__eyebrow">Scene 1 • Locker Close-Up</div>
              <h3>Supply Locker</h3>
              <p>Click the badge or warning-wrapped spool to collect items.</p>
            </div>
            <button class="btn btn--ghost" data-action="locker-close">Close</button>
          </div>

          <div class="locker-panel__stage">
            <img
              class="locker-panel__image"
              src="${this.lockerCloseupImageSrc()}"
              alt="Open supply locker with remaining items visible"
            />
            <div class="locker-panel__hotspots">
              ${pickupButtons}
            </div>
          </div>

          <div class="locker-panel__status">
            <div class="locker-status ${sigilCollected ? "is-collected" : ""}">
              <strong>Transit Sigil</strong>
              <span>${sigilCollected ? "Collected" : "Available"}</span>
            </div>
            <div class="locker-status ${spoolCollected ? "is-collected" : ""}">
              <strong>Warning Spool</strong>
              <span>${spoolCollected ? "Collected" : "Available"}</span>
            </div>
          </div>

          ${
            availablePickups.length === 0
              ? `<div class="small-note">Locker is empty. You can close this view and continue to the gate.</div>`
              : `<div class="small-note">The Transit Sigil is required for the gate. The warning spool is optional tutorial flavor loot.</div>`
          }
        </div>
      </div>
    `;
  }

  renderDialogueOverlay() {
    const active = this.state.activeDialogue;
    if (!active) return "";
    const def = DIALOGUE[active.id];
    if (!def) return "";
    const closeupAsset = this.dialogueCloseupAsset(active.id);

    const baseText = def.steps[active.stepIndex]?.text ?? "";
    const displayText = active.choiceResultText ?? baseText;
    const speaker = speakerLabel(active.id, this.state.faction);
    const showChoices =
      !active.choiceResultText &&
      active.stepIndex === def.steps.length - 1 &&
      Array.isArray(def.choices) &&
      def.choices.length > 0;

    return `
      <div class="dialogue-overlay" role="dialog" aria-modal="true" aria-label="Dialogue">
        <div class="dialogue-panel">
          ${
            closeupAsset
              ? `
                <div class="dialogue-panel__media">
                  <img class="dialogue-panel__media-image" src="${closeupAsset.src}" alt="${closeupAsset.alt}" />
                  <div class="dialogue-panel__media-eyebrow">${closeupAsset.eyebrow}</div>
                </div>
              `
              : ""
          }
          <div class="dialogue-panel__speaker">${speaker}</div>
          <div class="dialogue-panel__text">${displayText}</div>
          ${
            showChoices
              ? `<div class="dialogue-panel__choices">
                  ${def.choices
                    .map(
                      (choice) => `
                    <button class="btn btn--choice" data-action="dialogue-choice" data-choice="${choice.id}">
                      ${choice.label}
                    </button>`
                    )
                    .join("")}
                </div>`
              : `<div class="dialogue-panel__actions">
                  <button class="btn btn--primary" data-action="dialogue-next">${active.choiceResultText ? "Continue" : "Next"}</button>
                </div>`
          }
        </div>
      </div>
    `;
  }

  renderCodexDrawer() {
    return `
      <aside class="codex-drawer ${this.state.codexOpen ? "is-open" : ""}" aria-hidden="${this.state.codexOpen ? "false" : "true"}">
        <div class="codex-drawer__header">
          <h2>Codex • Fractured Millennium</h2>
          <button class="btn btn--ghost" data-action="toggle-codex">${this.state.codexOpen ? "Close" : "Open"}</button>
        </div>
        <section class="codex-section">
          <h3>Timeline</h3>
          <ul class="codex-list">
            ${TIMELINE_ENTRIES.map((entry) => `<li><strong>${entry.era}</strong> <em>${entry.when}</em><span>${entry.text}</span></li>`).join("")}
          </ul>
        </section>
        <section class="codex-section">
          <h3>Faction Notes</h3>
          <ul class="codex-list">
            ${Object.values(FACTIONS)
              .map((f) => `<li><strong>${f.id}</strong> <em>${f.title}</em><span>${f.summary}</span></li>`)
              .join("")}
          </ul>
        </section>
        <section class="codex-section">
          <h3>Production Art Prompts</h3>
          <ul class="codex-list">
            ${PRODUCTION_PROMPTS.map((p) => `<li><strong>${p.title}</strong><span>${p.prompt}</span></li>`).join("")}
          </ul>
        </section>
      </aside>
    `;
  }
}

function boot() {
  const root = document.querySelector("#app");
  if (!root) throw new Error("App root not found");
  const game = new OpeningSequenceGame(root);
  game.init();
}

boot();
