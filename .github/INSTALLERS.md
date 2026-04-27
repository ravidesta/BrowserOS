# Building real, double-clickable installers

This repo has two CI workflows that produce installable artifacts:

| Workflow | Trigger | Output | Verified runtime? |
|---|---|---|---|
| `build-coach-extension.yml` | Auto (every push to `claude/**`, `feat/**`, `fix/**`, plus PRs) | `.zip` Chrome-loadable extension (~14 MB) | ❌ Not yet end-to-end |
| `build-installers.yml` | Manual (`workflow_dispatch`) | Per-OS BrowserOS installers (`.dmg` / `.exe` / `.AppImage` / `.deb`) | ❌ Not yet end-to-end |

> **Honest status:** the workflows produce the right artifacts in CI; nobody on the team has yet downloaded one and watched a fresh machine launch it. That's the next verification step. Until then, all artifacts are **shipped, unverified.**

## Path A — load the extension into stock BrowserOS (works today, 3 clicks)

1. Download the official BrowserOS for your OS (already signed, already notarized):
   - macOS: <https://files.browseros.com/download/BrowserOS.dmg>
   - Windows: <https://files.browseros.com/download/BrowserOS_installer.exe>
   - Linux: <https://files.browseros.com/download/BrowserOS.AppImage>
2. Install + open it.
3. Open the latest `coach-extension-*.zip` from this repo's [Actions tab](../../actions/workflows/build-coach-extension.yml) → unzip → drag the unzipped folder into `chrome://extensions` with **Developer mode** on.

That gets Coach + Mistral + Azure TTS into a real Chromium browser without a custom build. The downside: the bundled BrowserOS extension is also loaded, so behavior may overlap until the bundled one is disabled.

## Path B — produce a custom-built BrowserOS installer (the dream)

This is what `build-installers.yml` is for. **Currently it sits idle until you add signing secrets**, then every run produces a real signed `.dmg` / `.exe` / `.AppImage`.

### One-time secret setup

Add these in **Settings → Secrets and variables → Actions** for this repo:

#### macOS signing & notarization
| Secret name | What it is | Where to get it |
|---|---|---|
| `MACOS_CERT_P12_BASE64` | Developer ID Application certificate, exported as `.p12`, then `base64 -i cert.p12` | Apple Developer portal → Certificates → Developer ID Application |
| `MACOS_CERT_PASSWORD` | Password used when exporting the `.p12` | You set it during export |
| `MACOS_KEYCHAIN_PASSWORD` | Any string — used to unlock the temporary CI keychain | Generate any random password |
| `APPLE_TEAM_ID` | 10-character team id | Apple Developer portal → Membership |
| `APPLE_NOTARY_KEY_ID` | App Store Connect API key id | App Store Connect → Users and Access → Keys |
| `APPLE_NOTARY_ISSUER_ID` | App Store Connect issuer id | Same page |
| `APPLE_NOTARY_KEY_BASE64` | The `.p8` notary key, `base64 -i AuthKey_*.p8` | Same page (downloaded once at key creation) |
| `SPARKLE_PRIVATE_KEY_BASE64` | EdDSA private key for Sparkle auto-update signing | Generated once via `sign_update -g` from the Sparkle tools |

#### Windows code signing (eSigner)
| Secret name | What it is |
|---|---|
| `WINDOWS_CODE_SIGN_TOOL_PATH` | Path to the eSigner CodeSignTool binary on the runner (or omit if installing fresh in the workflow) |
| `WINDOWS_ESIGNER_USERNAME` | SSL.com / eSigner account username |
| `WINDOWS_ESIGNER_PASSWORD` | Account password |
| `WINDOWS_ESIGNER_TOTP_SECRET` | TOTP shared secret for unattended signing |

#### Linux
No signing secrets required. The workflow produces unsigned `.AppImage` and `.deb`, which is the standard for desktop Linux.

### Triggering a build

1. **Actions** tab → **Build BrowserOS Installers** → **Run workflow**.
2. Pick `os: all` (or a single OS), leave `sign: true`, leave `release: true`.
3. Wait ~2–4 hours per OS the first time (Chromium build is huge). Subsequent builds are faster if caches survive.
4. When green, the run page has the installers attached as artifacts, and a draft GitHub release is created with each installer attached as a downloadable file.

### Cost note

Full Chromium builds on GitHub-hosted runners are not free. A single all-OS run is roughly:
- macos-14-large: ~3 hours × $0.16/min ≈ **$29**
- windows-2022 (default): ~2 hours, included in many plans
- ubuntu-24.04 (default): ~1.5 hours, included

Run `os: macos` (or just one OS) when iterating to keep costs down. Self-hosted runners are the right answer for frequent builds.

### Failure modes I expect on first run

The workflow has **never been executed end-to-end against this repo's signing secrets**, so first-run failures are likely. The most probable ones:

1. **`MACOS_CERT_P12_BASE64` not in keychain format** — the build's `sign/macos.py` expects the cert imported into a temporary keychain. The workflow currently passes the raw env var; the build module may need a small wrapper to actually `security import` it. See `packages/browseros/build/modules/sign/macos.py:48-74`.
2. **Disk space on Linux runner** — Chromium + checkout is ~100 GB, GitHub free runners give you 14 GB. Likely you'll need to add a cleanup step (`sudo rm -rf /usr/share/dotnet /opt/ghc /usr/local/lib/android`) or jump to the larger ubuntu runners.
3. **Windows path length** — Chromium has notoriously long paths; you may need `git config --global core.longpaths true` in a step before checkout.

When the first dispatch fails, paste me the failing step's output and I'll fix the specific issue. I'd rather get one OS green end-to-end than guess at all three.

## Path C — self-hosted runners (best for steady dev)

If you find yourself running the installer workflow more than weekly, paying for a self-hosted runner is cheaper than renting GitHub-large compute. A Mac Studio + a Hetzner Linux box covers all three (Mac runs Mac and Linux Docker; the Hetzner box runs Linux + Wine for Windows tests). I can write the runner setup when you're ready — same workflow file, just different `runs-on` labels.
