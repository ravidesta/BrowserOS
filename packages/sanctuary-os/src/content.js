/* ============================================================================
   SANCTUARY OS — Content orchestrator
   ----------------------------------------------------------------------------
   Runs at document_start. Reads settings, works out what time of day it is,
   stamps the state onto <html> as data attributes, and mounts the atmosphere.

   WHY DATA ATTRIBUTES INSTEAD OF INJECTING CSS FROM JS
   ----------------------------------------------------
   All four stylesheets are declared in the manifest, so Chrome has them parsed
   before the page's own first byte renders. Every rule inside them is scoped
   under `html[data-sanctuary-*]`, which means:

     - Nothing applies until JS says so, so a site you disabled never flashes
       cream before settling down.
     - Toggling is one attribute write. No stylesheet churn, no reflow storm,
       no reload — flip a switch in the popup and the page changes under your
       cursor.
     - The phase of the day is one attribute too, so the sun moving across
       tokens.css costs a single `setAttribute` and CSS transitions handle the
       rest over two and a half seconds.

   The cost is a few milliseconds of unstyled page while storage resolves. That
   trade is correct: a beat of the site's own design is invisible, whereas a
   flash of cream on a page you deliberately opted out of is a bug you'd feel.
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

const ATMOSPHERE = [
  { kind: "grade", blend: "multiply", z: 2147483640 },
  { kind: "lume", blend: "soft-light", z: 2147483641 },
  { kind: "confetti", blend: "normal", z: 2147483645 },
];

/* The arc of the sun, in local hours. Boundaries sit where the quality of
   light actually turns, not on tidy six-hour quarters: morning runs long,
   golden hour is short and specific, and rest owns the whole night. */
const PHASES = [
  { name: "ascend", from: 5, to: 11 },
  { name: "zenith", from: 11, to: 16 },
  { name: "descent", from: 16, to: 21 },
];

const PHASE_POLL_MS = 60_000;

let settings = { ...DEFAULTS };
let mounted = false;
let hosts = [];
let confettiLayer = null;
let welcomed = false;
let activePhase = null;

/* --- Boot ---------------------------------------------------------------- */
chrome.storage.sync.get(DEFAULTS, (stored) => {
  if (chrome.runtime.lastError) return;
  settings = { ...DEFAULTS, ...stored };
  apply();
});

function phaseForHour(hour) {
  const found = PHASES.find((p) => hour >= p.from && hour < p.to);
  return found ? found.name : "rest";
}

function currentPhase() {
  if (settings.phaseMode && settings.phaseMode !== "auto") return settings.phaseMode;
  return phaseForHour(new Date().getHours());
}

function isActiveHere() {
  return settings.enabled && !settings.disabledSites.includes(location.hostname);
}

function apply() {
  const root = document.documentElement;
  if (!root) return;

  const live = isActiveHere();
  const surfaces = live && settings.surfaces;
  const phase = currentPhase();
  activePhase = phase;

  root.setAttribute("data-sanctuary", live ? "on" : "off");
  root.setAttribute("data-sanctuary-phase", phase);
  root.setAttribute("data-sanctuary-surfaces", surfaces ? "on" : "off");
  root.setAttribute("data-sanctuary-voice", live ? settings.voice : "off");
  root.setAttribute("data-sanctuary-intensity", settings.intensity);
  root.setAttribute("data-sanctuary-calm", live && settings.calm ? "on" : "off");

  if (surfaces) {
    whenBody(mountAtmosphere);
  } else {
    unmountAtmosphere();
  }

  if (live && settings.voice !== "off") {
    whenBody(scheduleIconGuard);
  }

  if (live && settings.lexicon) {
    whenBody(() => SanctuaryLexicon.enable());
  } else {
    SanctuaryLexicon.disable();
  }

  if (live && settings.confetti && settings.welcomeBurst && !welcomed) {
    welcomed = true;
    whenBody(() => setTimeout(() => SanctuaryConfetti.welcome(), 520));
  }
}

function whenBody(callback) {
  if (document.body) {
    callback();
  } else {
    document.addEventListener("DOMContentLoaded", callback, { once: true });
  }
}

/* A tab left open overnight should wake up in the forest. Polling once a
   minute is cheaper than any alarm plumbing and precise enough for an event
   that happens four times a day; the visibility check catches the laptop that
   was asleep through the entire transition. */
function watchTheSun() {
  const check = () => {
    const phase = currentPhase();
    if (phase === activePhase) return;
    activePhase = phase;
    document.documentElement.setAttribute("data-sanctuary-phase", phase);
    SanctuaryConfetti.refreshPalette();
  };

  setInterval(check, PHASE_POLL_MS);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) check();
  });
}

watchTheSun();

/* ==========================================================================
   ATMOSPHERE
   Three shadow hosts rather than one, because each needs its own blend mode
   and a blend mode only reaches the page from the host itself. See the note
   at the top of overlay.css for why nesting them would silently do nothing.
   ========================================================================== */
function mountAtmosphere() {
  if (mounted || !document.body) return;
  mounted = true;

  for (const spec of ATMOSPHERE) {
    const host = document.createElement("div");
    host.setAttribute("data-sanctuary-atmosphere", spec.kind);
    host.style.cssText = [
      "position:fixed",
      "inset:0",
      "pointer-events:none",
      "border:0",
      "margin:0",
      "padding:0",
      `z-index:${spec.z}`,
      `mix-blend-mode:${spec.blend}`,
      "contain:layout paint style",
    ].join(";");

    const shadow = host.attachShadow({ mode: "open" });

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("src/overlay.css");
    shadow.appendChild(link);

    const field = document.createElement("div");

    if (spec.kind === "grade") {
      field.className = "field grade";
      field.innerHTML =
        '<div class="grade-wash"></div><div class="grain"></div><div class="vignette"></div>';
    } else if (spec.kind === "lume") {
      field.className = "field lume";
      field.innerHTML =
        '<div class="blooms">' +
        '<span class="bloom b1"></span><span class="bloom b2"></span>' +
        '<span class="bloom b3"></span><span class="bloom b4"></span>' +
        '<span class="bloom b5"></span></div>';
    } else {
      field.className = "confetti";
      confettiLayer = field;
    }

    shadow.appendChild(field);
    document.body.appendChild(host);
    hosts.push(host);
  }

  SanctuaryConfetti.setLayer(confettiLayer);
  watchForEviction();
}

function unmountAtmosphere() {
  for (const host of hosts) host.remove();
  hosts = [];
  confettiLayer = null;
  mounted = false;
  SanctuaryConfetti.setLayer(null);
  SanctuaryConfetti.clear();
}

/* Single-page apps rewrite <body> wholesale on route changes and take our
   hosts with them. Watching only direct children of body keeps this cheap —
   no subtree, no attributes, no character data. */
function watchForEviction() {
  const observer = new MutationObserver(() => {
    if (!mounted) return;
    if (hosts.length && hosts.every((h) => h.isConnected)) return;

    for (const host of hosts) host.remove();
    hosts = [];
    mounted = false;
    confettiLayer = null;
    mountAtmosphere();
  });

  observer.observe(document.body, { childList: true });
}

/* ==========================================================================
   THE ICON GUARD, RUNTIME HALF
   ----------------------------------------------------------------------------
   typography.css already declines to touch anything whose class name admits to
   being an icon. This catches the ones that don't.

   Plenty of icon systems ship class names that give nothing away — `.g-sym`,
   `.nb-i`, whatever the build step minified them into. The only reliable tell
   is the glyph itself: icon fonts map into the Unicode Private Use Area, so a
   nearly-empty element whose `::before` resolves to a PUA codepoint is an
   icon, whatever it calls itself. Mark it and the CSS guard stops matching.

   getComputedStyle on a pseudo-element forces style resolution, so this runs
   inside requestIdleCallback, caps its candidate set, and never re-tests an
   element it has already judged.
   ========================================================================== */

/* The Private Use Area, by the numbers. Building this from codepoints rather
   than a regex literal keeps the source pure ASCII — a character class full of
   invisible glyphs is unreadable in review and silently corruptible by any
   tool in the chain that guesses wrong about encoding. Iterating with for..of
   walks by codepoint, so astral icons survive their surrogate pairs. */
const PUA_RANGES = [
  [0xe000, 0xf8ff], // BMP Private Use Area — where essentially every icon font lives
  [0xf0000, 0xffffd], // Supplementary Private Use Area-A
];

const ICON_CANDIDATES = "i, span, em, b, s, u, a, button, div, li";
const SCAN_BUDGET = 1600;
const judged = new WeakSet();
let guardQueued = false;

function isPrivateUseGlyph(text) {
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    for (const [lo, hi] of PUA_RANGES) {
      if (cp >= lo && cp <= hi) return true;
    }
  }
  return false;
}

function scheduleIconGuard() {
  if (guardQueued) return;
  guardQueued = true;

  const run = () => {
    guardQueued = false;
    runIconGuard();
  };

  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(run, { timeout: 1200 });
  } else {
    setTimeout(run, 400);
  }
}

function runIconGuard() {
  let budget = SCAN_BUDGET;

  for (const el of document.querySelectorAll(ICON_CANDIDATES)) {
    if (budget <= 0) break;
    if (judged.has(el)) continue;
    if (el.childElementCount > 0) continue;

    const text = el.textContent.trim();
    if (text.length > 2) continue;

    judged.add(el);
    budget--;

    if (isPrivateUseGlyph(text)) {
      el.setAttribute("data-sanc-keepfont", "");
      continue;
    }

    const before = getComputedStyle(el, "::before").content;
    if (before && before !== "none" && isPrivateUseGlyph(before)) {
      el.setAttribute("data-sanc-keepfont", "");
    }
  }
}

whenBody(() => {
  new MutationObserver(scheduleIconGuard).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  setTimeout(scheduleIconGuard, 1400);
});

/* ==========================================================================
   INTERACTION
   ========================================================================== */
document.addEventListener(
  "pointerdown",
  (event) => {
    if (!settings.clickBloom || !settings.confetti || !isActiveHere()) return;
    if (!confettiLayer) return;
    SanctuaryConfetti.bloom(event.clientX, event.clientY, 14);
  },
  { passive: true, capture: true }
);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return;

  if (message.type === "sanctuary:celebrate") {
    if (confettiLayer) SanctuaryConfetti.celebrate();
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "sanctuary:state") {
    sendResponse({
      ok: true,
      active: isActiveHere(),
      host: location.hostname,
      phase: activePhase || currentPhase(),
    });
    return true;
  }
});

/* Live settings. Every surface that can change one — the popup, a keyboard
   command, another tab — writes to storage, and every tab reacts here. One
   direction, one source of truth, no reloads. */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;

  let touched = false;
  for (const [key, { newValue }] of Object.entries(changes)) {
    if (key in DEFAULTS) {
      settings[key] = newValue;
      touched = true;
    }
  }

  if (touched) apply();
});
