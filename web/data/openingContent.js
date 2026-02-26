export const APP_VERSION = "opening-sequence-v0.1.0";

export const FACTIONS = {
  Hearts: {
    id: "Hearts",
    title: "Pureblood Covenant",
    palette: {
      primary: "#8a1526",
      secondary: "#e6d4b0",
      accent: "#f4b24a",
      glow: "rgba(244,178,74,0.35)"
    },
    summary: "Royal true-blood houses who reject modern cybernetics and defend ritual, bloodline, and inherited rule.",
    tutorialMentor: "Canon-Marshal Serise Veyr",
    district: "Red Basilica Court"
  },
  Spades: {
    id: "Spades",
    title: "Iron Wardens",
    palette: {
      primary: "#1e2632",
      secondary: "#d7dde8",
      accent: "#ff7a2f",
      glow: "rgba(255,122,47,0.28)"
    },
    summary: "Enforcers and protectors of the realm, loyal to Diamonds who supply their armor, surveillance, and combat tech.",
    tutorialMentor: "Inspector-Sergeant Kest Vale",
    district: "Wardens Transit Yard"
  },
  Diamonds: {
    id: "Diamonds",
    title: "Seer Consortium",
    palette: {
      primary: "#0e3740",
      secondary: "#dff7ff",
      accent: "#52d0ff",
      glow: "rgba(82,208,255,0.30)"
    },
    summary: "Seers and technocrats who see everything through the Diamond and supply the realm with foresight and advanced tech.",
    tutorialMentor: "Forecast Adjunct Ilyra-9",
    district: "Lattice Exchange Concourse"
  },
  Clubs: {
    id: "Clubs",
    title: "Underhollow Scavengers",
    palette: {
      primary: "#372816",
      secondary: "#d7d0bf",
      accent: "#9ce63d",
      glow: "rgba(156,230,61,0.28)"
    },
    summary: "The scrap of the realm: spare-parts scavengers and survival clans committed to enduring the ruins left by others.",
    tutorialMentor: "Scrap-Mother Tallow Sump",
    district: "Pipe Alley Commons"
  }
};

export const INTRO_PANELS = [
  {
    id: "intro-1",
    caption:
      "One thousand years after the Factions War, the realm still runs on suits, blood, and broken promises.",
    subtext:
      "Cities rose from the old battlegrounds. Every district became a deck. Every life became a wager."
  },
  {
    id: "intro-2",
    caption:
      "Diamonds built the Master Spire and learned to read branching futures. The gift came with a toll.",
    subtext:
      "Seers age too quickly, lose memory in fragments, and mistake certainty for morality."
  },
  {
    id: "intro-3",
    caption:
      "Spades enforce order with Diamond predictions. Clubs survive inside the wreckage those predictions create.",
    subtext:
      "Hearts stand apart, loyal only to bloodline and ritual, refusing augmentation and outside rule."
  },
  {
    id: "intro-4",
    caption:
      "The Jokers were mocked for centuries. Then they found a shard cut from the Time Diamond fracture.",
    subtext:
      "They do not want order. They do not want peace. They want systems to break while they watch."
  },
  {
    id: "intro-5",
    caption:
      "You are not a hero. Not yet. You are a recruit in a city that treats loyalty as currency.",
    subtext:
      "Before war poker, before faction battles, you must earn your first allies and survive your first mission."
  }
];

export const TIMELINE_ENTRIES = [
  {
    era: "Origins",
    when: "1000+ years ago",
    text: "The first faction structure emerges from the Old Deck War. Kings and Queens define suit law."
  },
  {
    era: "Factions at War",
    when: "1000 years ago",
    text: "The Time Diamond fractures. Battlefield probability becomes unstable. A shard disappears."
  },
  {
    era: "Factions Lost",
    when: "Centuries later",
    text: "Cities collapse, bloodlines vanish, and scavenger cultures spread through the underhollows."
  },
  {
    era: "Fractured Millennium",
    when: "Present day",
    text: "Diamonds sell foresight, Spades enforce it, Hearts reject it, Clubs survive inside it, Jokers distort it."
  }
];

export const TUTORIAL_MISSION = {
  id: "mission-tutorial-001",
  title: "First Draw: Faultline Courier",
  subtitle: "Opening Tutorial Mission",
  briefing:
    "Spades tutorial assignment: prove you can protect the district, use Diamond-issued tech, and recruit a local courier before a Joker bang-glyph turns rumor into chaos.",
  objectives: [
    { id: "meet-handler", label: "Meet your handler in the courtyard." },
    { id: "read-orders", label: "Read the mission notice board." },
    { id: "collect-sigil", label: "Collect your transit sigil from the locker." },
    { id: "unlock-gate", label: "Use the transit sigil on the alley gate." },
    { id: "recruit-runner", label: "Convince the courier runner to join your roster." }
  ],
  tutorialTips: [
    "Build phases happen before detonation. Some characters charge or shield while hidden.",
    "Row placement matters even before combat exists in the prototype. Front, Middle, and Back each support different roles.",
    "Joker bang symbols are a warning. Unknown identity, pure chaos. If something feels too convenient, assume it is a trap."
  ]
};

export const SCENES = {
  courtyard: {
    id: "courtyard",
    title: "District Courtyard",
    mood: "Pre-dawn tension, neon haze, ceremonial banners and cracked surveillance glass.",
    backdropText:
      "Faction trainees move through the courtyard in silence while a distant siren repeats the same warning every twenty seconds.",
    hotspots: [
      { id: "mentor", label: "Handler", x: 2, y: 37, w: 14, h: 34 },
      { id: "notice", label: "Notice Board", x: 16, y: 38, w: 17, h: 33 },
      { id: "locker", label: "Supply Locker", x: 82, y: 33, w: 16, h: 43 },
      { id: "gate", label: "Transit Gate", x: 50, y: 29, w: 24, h: 40 }
    ]
  },
  alley: {
    id: "alley",
    title: "Faultline Alley",
    mood: "Wet stone, exposed cable, rooftop shadows, and a glowing Joker sigil scratched into steel.",
    backdropText:
      "The alley narrows into a service channel. Someone has been here recently. Someone wants to be seen.",
    hotspots: [
      { id: "runner", label: "Courier Runner", x: 56, y: 45, w: 16, h: 32 },
      { id: "glyph", label: "Joker Glyph", x: 26, y: 33, w: 14, h: 22 },
      { id: "crate", label: "Supply Crate", x: 76, y: 58, w: 16, h: 18 },
      { id: "return-gate", label: "Return Gate", x: 4, y: 15, w: 10, h: 62 }
    ]
  }
};

export const DIALOGUE = {
  handlerIntro: {
    speakerType: "mentor",
    steps: [
      {
        text:
          "You made it. Good. You wear the Spade now: enforcer of the realm, protector when civilians panic. Diamonds supply our tech, but discipline is what keeps a Warden alive."
      },
      {
        text:
          "Read the notice board. Then collect your transit sigil. The alley runner will test whether you can recruit without turning a routine stop into a street war."
      },
      {
        text:
          "Remember the suits. Diamonds watch through the Diamond. Clubs survive as the realm's spare-parts scavengers. Hearts cling to true blood and reject cybernetics. Jokers leave bang marks and chaos."
      }
    ]
  },
  noticeBoard: {
    speakerType: "system",
    steps: [
      {
        text:
          "Mission orders: Faultline Courier Test. Spades field training detail. Objective: secure local runner as field recruit. Protect bystanders. Minimal noise. No lethal force unless detonation protocol is declared."
      },
      {
        text:
          "Faction brief: Spades enforce and protect. Diamonds see everything through the Diamond and supply the realm's tech. Clubs are the scrap of the realm, forced into spare-parts scavenging. Hearts are royal true blood and reject modern cybernetics. Jokers remain of unknown identity; where the bang appears, chaos follows."
      },
      {
        text:
          "Tutorial note: During Deal / Flop / Turn / River, selected characters can charge and shield while hidden. True conflict begins at reveal."
      }
    ]
  },
  lockerLocked: {
    speakerType: "system",
    steps: [{ text: "Locker seal rejected. Spades procedure requires mission notice acknowledgment first." }]
  },
  lockerOpen: {
    speakerType: "system",
    steps: [
      { text: "Locker seal unlocks. Inside: a Transit Sigil badge and a Diamond-issued training charge spool wrapped in warning tape." },
      { text: "You pocket the sigil. The spool is cheap doctrine hardware, but Spades learn to protect people with whatever the realm provides." }
    ]
  },
  gateLocked: {
    speakerType: "system",
    steps: [
      { text: "Transit gate reads your presence, then denies access. A Warden sigil slot flashes amber." },
      { text: "Tip: Select an item in your inventory, then use it on the gate." }
    ]
  },
  gateOpened: {
    speakerType: "system",
    steps: [
      { text: "The sigil clicks into the reader. The Diamond-built lock recognizes Spades clearance and opens with a hard mechanical groan." },
      { text: "Beyond the gate, Faultline Alley smells like coolant, rust, and the kind of salvage routes Clubs use to stay alive." }
    ]
  },
  glyphInspect: {
    speakerType: "system",
    steps: [
      { text: "A Joker bang-glyph is etched under the surface paint. Fresh. Deliberate. Not street art." },
      { text: "Jokers are still an unknown identity in the official records, but the pattern is consistent: the bang means chaos and someone wants the district to feel it." }
    ]
  },
  crateInspect: {
    speakerType: "system",
    steps: [
      { text: "The crate is empty except for heat scoring and a snapped restraint band." },
      { text: "Whatever was moved through here left in a hurry. Clubs will strip what remains by sunrise if patrols do not lock it down." }
    ]
  },
  runnerOpening: {
    speakerType: "runner",
    steps: [
      { text: "Stop there, Warden. If you are here to arrest me, recruit me, or lecture me, pick one and be honest." },
      { text: "I run packages through this alley because Clubs live off scrap routes, Hearts do not come this low, and Joker bang marks make everyone else too scared to move." }
    ],
    choices: [
      {
        id: "threaten",
        label: "Threaten enforcement",
        response:
          "Wrong tone. I know the difference between a protector and a bully. Spades armor and Diamond optics do not scare me by themselves.",
        effect: { flag: "runner-threat-fail" }
      },
      {
        id: "pay",
        label: "Offer credits",
        response:
          "Everyone offers credits. Usually Diamond scrip, always late. Then they ask me to die for them. I need a reason, not a payment.",
        effect: { flag: "runner-pay-fail" }
      },
      {
        id: "respect",
        label: "Offer a real job and respect their route knowledge",
        response:
          "Finally. Someone who understands routes and logistics keeps people alive. If you are really Spades, prove you protect before you punish and I will listen.",
        effect: { flag: "runner-ready" }
      }
    ]
  },
  runnerRecruitSuccess: {
    speakerType: "runner",
    steps: [
      {
        text:
          "You came through the gate alone, no squad, no ambush. That buys a little trust. Maybe you Spades still remember what protector is supposed to mean."
      },
      {
        text:
          "No promises after detonation. If Diamonds misread, Hearts posture, Clubs scatter, and Jokers light the chaos, I choose survival first. You should learn to do the same."
      }
    ]
  },
  missionComplete: {
    speakerType: "mentor",
    steps: [
      {
        text:
          "Good. You recruited without escalating the alley. That is Spades work at its best: enforce when needed, protect whenever possible."
      },
      {
        text:
          "Tutorial complete. Diamonds will supply the tools, Clubs will test your judgment, Hearts will test your loyalty, and Jokers will test the whole system. Build your deck and be ready."
      }
    ]
  }
};

export const PRODUCTION_PROMPTS = [
  {
    id: "bg-courtyard",
    title: "Tutorial Courtyard Background",
    prompt:
      "stylized graphic novel environment concept art, neo-dystopian faction courtyard at pre-dawn, cracked stone, neon rim light, faction banners, surveillance glass, thick outlines, high contrast, moody fog, playable point-and-click scene background, layered depth, no characters, no text"
  },
  {
    id: "bg-alley",
    title: "Faultline Alley Background",
    prompt:
      "comic-book noir sci-fi alley environment, wet pavement reflections, exposed conduits, rusted transit gate, hidden Joker glyph scratched into metal, strong perspective, dramatic shadows, high contrast, point-and-click mission scene background, no characters, no text"
  },
  {
    id: "npc-handler",
    title: "Faction Handler Portrait Template",
    prompt:
      "stylized graphic novel character portrait, faction mentor operative, waist-up, stern expression, dramatic rim light, clean silhouette, faction color palette, high contrast shadows, dialogue portrait for HTML5 game, no text, no watermark"
  },
  {
    id: "npc-runner",
    title: "Courier Runner Recruit",
    prompt:
      "graphic novel trading card style character concept, agile courier runner from fractured city district, patched armor, alert posture, practical gear, suspicious but capable expression, high contrast, strong outlines, minimal background, 4k, no text"
  },
  {
    id: "ui-opening",
    title: "Opening Sequence UI Key Art",
    prompt:
      "stylized comic UI mockup for mobile-first Telegram web game, dramatic faction colors, thick panels, readable dialogue box, mission objectives sidebar, inventory tray, point-and-click hotspot indicators, polished indie game interface presentation, no watermark"
  }
];
