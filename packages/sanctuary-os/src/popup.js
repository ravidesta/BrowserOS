/* ============================================================================
   SANCTUARY OS — Control panel behavior
   ----------------------------------------------------------------------------
   Writes to chrome.storage.sync and stops. Content scripts are all subscribed
   to storage, so every open tab re-renders itself without this file knowing
   any of them exist — one direction, one source of truth, no reloads and no
   message-passing fan-out to keep in sync.
   ========================================================================== */

const DEFAULTS = {
  enabled: true,
  surfaces: true,
  voice: "two",
  confetti: true,
  welcomeBurst: true,
  clickBloom: false,
  calm: true,
  lexicon: false,
  intensity: "full",
  phaseMode: "auto",
  disabledSites: [],
};

const SWITCHES = [
  "enabled",
  "surfaces",
  "calm",
  "lexicon",
  "confetti",
  "welcomeBurst",
  "clickBloom",
];

const SEGMENTS = ["phaseMode", "voice", "intensity"];

const PHASE_LABEL = {
  ascend: "Ascend &middot; Morning",
  zenith: "Zenith &middot; Midday",
  descent: "Descent &middot; Golden Hour",
  rest: "Rest &middot; Midnight",
};

const VOICE_HINT = {
  two: "Cormorant for meaning, Manrope for wayfinding.",
  narrative: "Cormorant everywhere. The whole web as a manuscript.",
  off: "The site keeps its own typography.",
};

const INTENSITY_HINT = {
  soft: "Grade only. Nothing structural is touched.",
  full: "The ground comes through. Containers lift, controls are rebuilt.",
  dream: "Warmed imagery, deeper blooms, drop caps, heavier glass.",
};

const PHASES = [
  { name: "ascend", from: 5, to: 11 },
  { name: "zenith", from: 11, to: 16 },
  { name: "descent", from: 16, to: 21 },
];

let settings = { ...DEFAULTS };
let hostname = null;

function phaseNow(mode) {
  if (mode && mode !== "auto") return mode;
  const hour = new Date().getHours();
  const found = PHASES.find((p) => hour >= p.from && hour < p.to);
  return found ? found.name : "rest";
}

function save(patch) {
  settings = { ...settings, ...patch };
  chrome.storage.sync.set(patch);
  render();
}

function render() {
  const phase = phaseNow(settings.phaseMode);
  document.documentElement.setAttribute("data-sanctuary-phase", phase);
  document.getElementById("phase-label").innerHTML = PHASE_LABEL[phase] || phase;

  for (const key of SWITCHES) {
    const el = document.getElementById(key);
    if (el) el.setAttribute("aria-checked", String(Boolean(settings[key])));
  }

  for (const key of SEGMENTS) {
    const group = document.getElementById(key);
    if (!group) continue;
    for (const button of group.querySelectorAll("button")) {
      button.setAttribute(
        "aria-checked",
        String(button.dataset.value === settings[key])
      );
    }
  }

  const siteOn = hostname ? !settings.disabledSites.includes(hostname) : true;
  const siteSwitch = document.getElementById("site");
  siteSwitch.setAttribute("aria-checked", String(siteOn));
  siteSwitch.toggleAttribute("disabled", !hostname);

  document.getElementById("host-name").textContent =
    hostname || "No page to dress here";
  document.getElementById("site-note").textContent = settings.enabled
    ? "Everywhere"
    : "Resting";

  document.getElementById("voice-hint").textContent = VOICE_HINT[settings.voice];
  document.getElementById("intensity-hint").textContent =
    INTENSITY_HINT[settings.intensity];

  document.body.toggleAttribute("data-off", !settings.enabled);
}

function wire() {
  for (const key of SWITCHES) {
    const el = document.getElementById(key);
    if (el) el.addEventListener("click", () => save({ [key]: !settings[key] }));
  }

  for (const key of SEGMENTS) {
    const group = document.getElementById(key);
    if (!group) continue;
    group.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-value]");
      if (button) save({ [key]: button.dataset.value });
    });
  }

  document.getElementById("site").addEventListener("click", () => {
    if (!hostname) return;
    const list = settings.disabledSites.filter((h) => h !== hostname);
    if (list.length === settings.disabledSites.length) list.push(hostname);
    save({ disabledSites: list });
  });

  document.getElementById("celebrate").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    /* Pages without a content script — chrome://, the web store, a PDF — reject
       the message. Nothing to report; the button simply has nowhere to throw. */
    chrome.tabs
      .sendMessage(tab.id, { type: "sanctuary:celebrate" })
      .then(() => window.close())
      .catch(() => {});
  });
}

async function boot() {
  settings = await chrome.storage.sync.get(DEFAULTS);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url && /^https?:/.test(tab.url)) {
    try {
      hostname = new URL(tab.url).hostname;
    } catch {
      hostname = null;
    }
  }

  wire();
  render();
}

boot();
