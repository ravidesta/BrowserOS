/* ============================================================================
   SANCTUARY OS — The Lexicon
   ----------------------------------------------------------------------------
   "Words Dictate the Energy. We replace aggressive corporate tech jargon with
    nurturing, organic language."

   Live text substitution across the DOM. The four canonical pairs come
   straight from the brief; the rest extend it in the same spirit.

   WHAT IS DELIBERATELY NOT IN HERE, AND WHY
   -----------------------------------------
   Delete, Error, Failed, Warning, Cancel, Submit, Deploy, Discard.

   Every one of those was tempting and every one is excluded on purpose.
   Renaming a destructive or error-state control changes what a person
   believes a button is about to do. "Release" reads as gentle right up until
   it turns out to have been "Delete Account" on someone's production console.

   The brief asks for a nervous system at rest, not a nervous system that has
   been misinformed. Softening the word for a thing that cannot be undone is
   not calm — it is a trap with a nice voice. So the Lexicon renames the
   framing of work and leaves the consequences of work legible.

   Off by default. Rewriting the words on someone's screen is a real thing to
   do to them and it should be a choice they made.
   ========================================================================== */

const SanctuaryLexicon = (() => {
  /* Longest phrases first — "Priority 1" has to be claimed before the bare
     "Priority" rule gets to it, or the digit is left stranded. */
  const ENTRIES = [
    [/\bRewrite with AI\b/gi, "Luminize"],
    [/\bEdit with AI\b/gi, "Luminize"],
    [/\bAI Rewrite\b/gi, "Luminize"],
    [/\bAdd a Task\b/gi, "Plant a Seed"],
    [/\bCreate Task\b/gi, "Plant a Seed"],
    [/\bAdd Task\b/gi, "Plant a Seed"],
    [/\bNew Task\b/gi, "Plant a Seed"],
    [/\bTo-?\s?Do\b/gi, "Plant a Seed"],
    [/\bPriority\s*[123]\b/gi, "Energy Required"],
    [/\bPriority\b/gi, "Energy Required"],
    [/\bSanctuary Arrivals\b/gi, "Sanctuary Arrivals"],
    [/\bInbox\b/gi, "Sanctuary Arrivals"],
    [/\bUnread\b/gi, "Sanctuary Arrivals"],
    [/\bNotifications?\b/gi, "Arrivals"],
    [/\bDashboard\b/gi, "The Clearing"],
    [/\bSettings\b/gi, "Attunement"],
    [/\bPreferences\b/gi, "Attunement"],
    [/\bDeadline\b/gi, "Horizon"],
    [/\bDue Date\b/gi, "Horizon"],
    [/\bUrgent\b/gi, "Tender"],
    [/\bReminder\b/gi, "A Gentle Nudge"],
    [/\bLoading\b/gi, "Gathering"],
  ];

  /* Anything whose text is machine-read, user-authored, or executable is off
     limits. Rewriting the contents of a <textarea> would edit someone's draft;
     rewriting <code> would break a snippet they are about to copy. */
  const FORBIDDEN = new Set([
    "SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "OPTION",
    "CODE", "PRE", "SAMP", "KBD", "VAR", "TITLE", "SVG", "CANVAS", "MATH",
  ]);

  const MAX_NODES = 4000;
  const touched = [];
  let active = false;
  let observer = null;
  let queued = false;

  /* Match the casing of what was there. ENERGY REQUIRED where the site
     shouted, Energy Required where it was titled, energy required where it
     murmured — otherwise the replacement announces itself as a substitution. */
  function matchCase(source, replacement) {
    if (source === source.toUpperCase() && /[A-Z]{2}/.test(source)) {
      return replacement.toUpperCase();
    }
    if (source === source.toLowerCase()) {
      return replacement.toLowerCase();
    }
    return replacement;
  }

  function transform(text) {
    let out = text;
    for (const [pattern, replacement] of ENTRIES) {
      out = out.replace(pattern, (match) => matchCase(match, replacement));
    }
    return out;
  }

  function isEligible(node) {
    const parent = node.parentElement;
    if (!parent) return false;
    if (FORBIDDEN.has(parent.tagName)) return false;
    if (parent.isContentEditable) return false;
    if (parent.closest("[data-sanctuary-atmosphere], [contenteditable='true']")) return false;
    return node.nodeValue.trim().length > 1;
  }

  function sweep() {
    if (!active || !document.body) return;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let budget = MAX_NODES;
    let node;

    while ((node = walker.nextNode()) && budget > 0) {
      if (!isEligible(node)) continue;
      budget--;

      const original = node.nodeValue;
      const next = transform(original);
      if (next === original) continue;

      touched.push({ node, original });
      node.nodeValue = next;
    }
  }

  function schedule() {
    if (queued || !active) return;
    queued = true;

    const run = () => {
      queued = false;
      sweep();
    };

    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(run, { timeout: 1500 });
    } else {
      setTimeout(run, 500);
    }
  }

  function enable() {
    if (active) return;
    active = true;
    sweep();

    /* Sites render asynchronously and re-render on every route change, so a
       single pass catches only whatever happened to exist at that instant. */
    observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  /* Every rewrite keeps its original, so switching the Lexicon off puts the
     page's own words back without a reload. */
  function disable() {
    if (!active) return;
    active = false;

    if (observer) {
      observer.disconnect();
      observer = null;
    }

    for (const { node, original } of touched) {
      if (node.isConnected) node.nodeValue = original;
    }
    touched.length = 0;
  }

  return { enable, disable, schedule, transform };
})();
