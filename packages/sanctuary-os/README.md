# Sanctuary OS

A Chrome extension that dresses the entire web in the Sanctuary OS design
language: creamy living surfaces that breathe on a twenty-second cycle,
Cormorant Garamond and Manrope in their proper roles, and hand-drawn SVG
confetti in the colors of whatever hour it happens to be.

> *Designed for the exhale.*

No build step. No dependencies. No network calls. Load the folder and it works.

---

## Install

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. **Load unpacked** → select this folder (`packages/sanctuary-os`)

That's it. Every page you open from then on is in Sanctuary.

| Shortcut | Action |
| --- | --- |
| `Alt` + `Shift` + `S` | Toggle Sanctuary on/off everywhere |
| `Alt` + `Shift` + `C` | Celebrate |

Click the toolbar icon for the full control panel — which is itself built in
the system, because a design language that can't hold its own settings screen
isn't a design language yet.

---

## 01 · Chromatics — color is the arc of the sun

Not light mode and dark mode. Four phases of one day, picked from the local
clock and transitioned over 2.6 seconds so you notice it having happened rather
than catching it happen.

| Phase | Hours | Character | Palette |
| --- | --- | --- | --- |
| **Ascend** | 05–11 | Morning, crisp and fresh | Cool Cream, Pale Sage |
| **Zenith** | 11–16 | Midday, bright and open | Base Cream, True Gold |
| **Descent** | 16–21 | Golden hour, sun-kissed | Warm Cream, Orange-Gold, Earthy Brown, Sage rooting deep |
| **Rest** | 21–05 | Midnight, deep and safe | Deep Forest, Shadow |

**Rest is not "dark mode."** A forest at night is not a bright room with the
lights switched off — it's warm, green-black, and safe. Every semantic token is
named by *role* rather than by lightness (`--sanc-ink`, `--sanc-ground`), so at
midnight `--sanc-ink` simply becomes pale sage on forest and not one downstream
rule has to know what time it is.

You can pin a phase from the popup if you'd rather stay somewhere.

## 02 · Typographic Harmony — two voices

**Cormorant Garamond — the Narrative Voice.** Prose, headings, quotation. The
things you read to understand something.

**Manrope — the Structural Voice.** Navigation, metadata, badges, controls,
counters. The things you read to locate yourself. Tracked out in uppercase for
small labels, which is the single move that makes metadata read as editorial
instead of as a form field.

Give both jobs to one typeface and you have no hierarchy, only a mood. If you
want the literal reading anyway — the whole web as a manuscript — the popup has
a **Narrative** mode that puts Cormorant on everything.

### Optical sizing

Cormorant has a famously small x-height, which is exactly why it is ravishing at
48px and illegible at 13px. One `font-family` declaration cannot serve both, so
the same four font files are registered twice:

- **Text** — `size-adjust: 120%`, scaling the em box so UI-scale prose reads at
  the optical size of the sans it replaced.
- **Display** — `size-adjust: 100%`, true proportion, keeping the long extenders
  and open counters that make Cormorant Cormorant.

The test suite asserts the resulting glyph-width ratio is 1.200.

## 03 · The Lexicon — words dictate the energy

Off by default. Rewriting the words on someone's screen is a real thing to do to
them, and it should be a choice they made.

| The web says | Sanctuary says |
| --- | --- |
| Add Task / To-Do / New Task | Plant a Seed |
| Priority 1 / 2 / 3 | Energy Required |
| Inbox / Unread | Sanctuary Arrivals |
| AI Rewrite / Edit with AI | Luminize |
| Dashboard | The Clearing |
| Settings / Preferences | Attunement |
| Notifications | Arrivals |
| Deadline / Due Date | Horizon |
| Urgent | Tender |
| Loading | Gathering |

Casing is preserved, so a shouting `INBOX` becomes `SANCTUARY ARRIVALS` and a
murmured one stays murmured. Every rewrite keeps its original, so switching the
Lexicon off restores the page's own words without a reload. Text inside
`<code>`, `<textarea>`, inputs, and anything `contenteditable` is never touched.

**Deliberately excluded: Delete, Error, Failed, Warning, Cancel, Submit.**
Renaming a destructive or error-state control changes what a person believes a
button is about to do. "Release" reads as gentle right up until it turns out to
have been *Delete Account* on a production console. A nervous system at rest is
the goal; a nervous system that has been misinformed is not. The Lexicon renames
the framing of work and leaves the consequences of work legible.

## 04 · The Digital Breath

**Porous materiality.** SVG `feTurbulence` fractal noise across the viewport,
shuffled in eight discrete steps — stepped rather than smooth, because real film
grain resamples per frame instead of sliding. Transform-only, so it composites on
the GPU and never repaints.

**Biological entrainment.** The background blooms run on a **20-second**
ease-in-out cycle — roughly three breaths per minute, the pace of a deep
mammalian exhale. The nervous system entrains to ambient rhythm whether or not
anyone is paying attention. That constant is the most load-bearing number in the
codebase, and the easing is symmetric because a calm breath in and out take the
same time.

Underneath it, individual blooms drift on 71, 97, and 127-second cycles. Those
periods never divide into each other, so the composition never returns to a pose
you've already seen. **Breath you feel; drift you never catch repeating.**

## 05 · Materiality

**Digital glass** — modals, popovers, drawers, and menus get 24–40px backdrop
blur so the weather of the room permeates the workspace instead of being sealed
off by an opaque panel.

**Cinematic shadows** — three-layer text shadows (near halo, mid spread, wide
soft) let headings float directly on the atmosphere without needing a solid
container behind them.

**Radical calmness** — blinking badges stop blinking, urgent reds desaturate to
the phase's own calm signal, and a notification becomes a fact on the page rather
than an interruption demanding a cortisol response. Hovering restores true color,
so nothing is ever hidden — only quieted until you choose to look at it.

Scoped strictly to elements that name themselves as alarms. Deliberately *not* a
global `animation-iteration-count: 1`, which would freeze every loading spinner
and carousel on the web and turn calm into broken.

---

## Intensity

One setting cannot be right for both a longform essay and a trading dashboard.

- **Soft** — grade only. Nothing structural is touched. Safe on brand-critical
  UI and on the thing you're about to demo.
- **Full** *(default)* — the ground comes through, containers lift onto surface,
  controls are rebuilt in the system.
- **Dream** — full, plus warmed imagery, deeper blooms, drop caps, heavier glass.

Per-site opt-out lives in the popup and is remembered.

---

## Engineering notes

A few decisions that aren't obvious from reading the source, and one bug that
only a real browser could have found.

**Fonts resolve through `__MSG_@@extension_id__`.** Chrome resolves relative
`url()` in content-script CSS against the **page's** origin, not the extension's
— so `url("../assets/fonts/x.woff2")` on `example.com` requests
`https://example.com/assets/fonts/x.woff2`, 404s, and silently falls back to
Georgia. Everything *looks* configured correctly: the computed `font-family` is
right and `document.fonts` even reports faces as loaded. The only honest test is
measuring glyph geometry. Absolute `chrome-extension://__MSG_@@extension_id__/…`
URLs fix it, and this is why the extension carries a `default_locale`.

**Blend modes live on the shadow hosts, not inside them.** `mix-blend-mode`
blends an element with the backdrop of its nearest stacking context. A fixed,
z-indexed overlay *is* a stacking context, so a multiply layer nested inside one
blends only against its own siblings and the page never receives a photon of it.
The effect silently does nothing — the worst kind of nothing. Hence three hosts:
one multiplies, one lights, one carries confetti at true color.

**The icon guard is the feature, not a nicety.** A blunt
`* { font-family: serif !important }` retypesets icon fonts' Private Use Area
codepoints in a face that has no glyphs there, and the site's navigation becomes
small rectangles of regret. Two layers defend against it:

1. CSS declines to touch anything whose class name admits to being an icon
   (`[class*="icon" i]` and friends), so the site's own
   `.fa { font-family: … }` keeps applying through ordinary cascade.
2. JS catches the ones whose class names give nothing away — `.g-sym`, `.nb-i`,
   whatever the build step minified them into — by checking whether a nearly
   empty element's `::before` resolves to a PUA codepoint, and marking it.

**`contain: layout paint style`, never `strict`.** Strict adds size containment,
which zeroes intrinsic size — and every atmosphere panel sizes itself from
`inset: 0`, so the whole thing would quietly collapse to nothing.

**Specificity is load-bearing.** The base typography rule ends in `:not(<the
whole guard>)`, and `:not()` inherits the specificity of its most specific
argument — so a rule selecting `*` scores a class column of 3. The monospace rule
needs an extra attribute in its prefix to outrank it, or every code sample on the
web quietly becomes Garamond. The test fixture caught that; reading did not.

**Everything is one attribute write.** All four stylesheets are declared in the
manifest, so Chrome parses them before the page's first byte renders, and every
rule is scoped under `html[data-sanctuary-*]`. Nothing applies until JS says so
(a site you disabled never flashes cream), toggling causes no stylesheet churn,
and the phase of the day costs a single `setAttribute`.

---

## Layout

```
sanctuary-os/
├── manifest.json
├── _locales/en/messages.json    default_locale, required for the font URLs
├── assets/
│   ├── fonts/                   Cormorant Garamond + Manrope, real woff2 (200 KB)
│   └── icons/                   generated, not hand-committed binaries
├── tools/make-icons.py          stdlib-only PNG encoder; python3 tools/make-icons.py
└── src/
    ├── tokens.css               the design system: four phases, one vocabulary
    ├── fonts.css                @font-face, two voices, two optical sizes
    ├── typography.css           voice assignment + the icon guard
    ├── surfaces.css             ground, containers, glass, radical calmness
    ├── overlay.css              grade, grain, blooms, breath (in shadow DOM)
    ├── confetti.js              SVG shapes + three-axis flutter physics
    ├── lexicon.js               live text substitution
    ├── content.js               orchestrator, phase engine, icon guard
    ├── background.js            defaults + keyboard commands
    └── popup.{html,css,js}      control panel, built in the system
```

`src/tokens.css` is portable on purpose. Drop it into any project and the rest of
Sanctuary OS follows.

## Verification

Verified against real Chromium with the extension loaded — 41 assertions
covering the phase engine, both voices, bundled-font geometry, the icon guard,
de-whitening, radical calmness, confetti physics, the Lexicon and its
reversibility, reduced-motion behavior, and clean teardown on disable.

Note for anyone re-running it: `headless: true` alone resolves to Chromium's
*headless shell*, which cannot load extensions at all. `channel: "chromium"` is
required. Background tabs also throttle CSS transitions to a crawl, so phase
colors have to be sampled after a reload rather than mid-transition.
