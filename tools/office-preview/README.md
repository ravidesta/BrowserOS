# Office Suite — Preview

Standalone, runnable preview of the OnlyOffice integration. Mirrors what the
BrowserOS extension does (same hushed customization, same editor config shape,
same JWT signing) but as a regular web page you can open in any browser — no
extension build required.

Use this to:
- Verify the OnlyOffice docserver is reachable and rendering documents
- Test different document URLs and file types before wiring them through the LLM
- See the JWT-signed config shape that `office_prepare_document` produces
- Demo the integration to others without loading the extension

Long-term, this can grow into a hosted web app (e.g. `office.luminous.com`)
that the extension just iframes to.

## Prerequisites

- Docker + Docker Compose (for the OnlyOffice docserver)
- A modern browser (Chrome, Firefox, Safari)
- Node 18+ (only for the optional `prepare-document.mjs` CLI demo)

## Three-step quick start

```bash
cd tools/office-preview
docker compose up -d
open http://localhost:3000     # or visit it manually
```

The page opens. Defaults are pre-filled to talk to the docserver on
`http://localhost:8080`. Click **Open Editor** — OnlyOffice's `api.js` loads,
the editor mounts on the sample document, and you're in.

### What's running

| Container | Port | What |
|---|---|---|
| `browseros-office-docserver` | 8080 | OnlyOffice Document Server (docserver) |
| `browseros-office-preview` | 3000 | Nginx serving the preview page |

The docserver's built-in example UI lives at <http://localhost:8080/example/> —
handy for sanity-checking that the docserver itself works, separately from the
preview.

## Trying it with a different document

Drop any reachable doc URL into the **Document URL** field. The docserver needs
to be able to fetch it, so use one of:

- The bundled sample at `http://localhost:8080/example/sample.docx`
- Any publicly reachable URL (e.g. a doc on S3, a doc on your own server)
- A URL on the docker host's network the docserver container can reach

The file type selector controls which OnlyOffice editor mounts (docx → word,
xlsx → cell, pptx → slide, pdf → pdf).

## Testing the JWT-signed flow

Production docservers reject unsigned requests. To test the signed-config flow:

1. Stop the docserver: `docker compose down`
2. Edit `docker-compose.yml`: set `JWT_ENABLED: "true"` and `JWT_SECRET: "your-secret"`
3. Bring it back up: `docker compose up -d`
4. Run the CLI demo to see the signed config and deep link:

   ```bash
   ONLYOFFICE_JWT_SECRET=your-secret \
     node prepare-document.mjs \
     --url=http://localhost:8080/example/sample.docx \
     --title="My Doc"
   ```

   This prints the same JSON `office_prepare_document` produces server-side,
   plus the `/office?config=...` deep link the LLM would surface to the user.

5. To use the signed config in the preview UI, you'd need to feed the `token`
   field of the generated config to OnlyOffice. The preview page itself doesn't
   currently expose a JWT input — if you need that flow end-to-end, run the
   real extension with `ONLYOFFICE_JWT_SECRET` set.

## Files

- `index.html` — the preview app (vanilla JS, no build step)
- `docker-compose.yml` — docserver + nginx for serving the preview
- `prepare-document.mjs` — standalone Node CLI mirroring the MCP tool's logic

## Troubleshooting

**"Failed to load api.js"** — the docserver isn't up or isn't reachable.
Check `docker compose ps`. Try opening <http://localhost:8080/healthcheck>.

**Editor mounts but shows a blank doc** — the document URL isn't reachable
from the docserver container. Test by opening it directly in your browser; if
that works but the docserver still can't load it, you might need to use the
docker host's IP instead of `localhost` (the docserver container's `localhost`
is itself, not your machine).

**"This document is being edited by another user"** — OnlyOffice keys
documents by the `document.key` field. The preview generates a new key each
open, but if you re-click quickly the key can collide. Wait a second, click again.
