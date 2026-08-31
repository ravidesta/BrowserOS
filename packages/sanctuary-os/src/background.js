/* ============================================================================
   SANCTUARY OS — Service worker
   ----------------------------------------------------------------------------
   Deliberately thin. Storage is the single source of truth and every content
   script subscribes to it directly, so this file only does the two things a
   content script cannot: seed defaults on install, and receive keyboard
   commands. It holds no state of its own, which is the only sane posture for
   an MV3 worker that can be torn down between any two events.
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

chrome.runtime.onInstalled.addListener(() => {
  /* Read-then-write against the defaults so an upgrade adds new keys without
     resetting anything the user already chose. */
  chrome.storage.sync.get(DEFAULTS, (stored) => {
    chrome.storage.sync.set({ ...DEFAULTS, ...stored });
  });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-sanctuary") {
    const { enabled } = await chrome.storage.sync.get({ enabled: true });
    await chrome.storage.sync.set({ enabled: !enabled });
    return;
  }

  if (command === "celebrate") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    /* A tab with no content script — chrome:// pages, the web store, a PDF
       viewer — rejects the message. That is expected, not an error worth
       surfacing anywhere. */
    chrome.tabs.sendMessage(tab.id, { type: "sanctuary:celebrate" }).catch(() => {});
  }
});
