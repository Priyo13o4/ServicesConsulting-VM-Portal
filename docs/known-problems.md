# Known problems

The single list of open bugs, limitations and workarounds. Newest first. Never delete an entry; mark it Fixed.

## Template

```
## KP-000 — Short title
- **Status:** Open | Workaround in place | Fixed (YYYY-MM-DD, commit abc1234)
- **Severity:** Blocker | High | Medium | Low
- **Found:** YYYY-MM-DD, by whom or how
- **Area:** module or file paths
- **What happens:** What the user or developer sees, in plain words.
- **Steps to reproduce:** Numbered steps, with the exact input used.
- **Expected:** What should happen instead.
- **Cause:** What is actually wrong, if known. Otherwise "Unknown" plus what has been ruled out.
- **Workaround:** What to do until it is fixed, or "None".
- **Fix plan:** The intended fix and what it touches.
- **Related:** Links to files, commits, open questions (Qn).
```

---

## KP-001 — Docker images have not been built or run yet
- **Status:** Open
- **Severity:** Medium
- **Found:** 2026-10-08, during repo setup
- **Area:** `docker/Dockerfile`, `compose*.yml`
- **What happens:** The setup environment could not pull images from Docker Hub, so no stack (local, smoke, deploy) has been started.
- **Steps to reproduce:** Not applicable; nothing has run yet.
- **Expected:** `npm run stack:local` and `npm run stack:smoke` start cleanly; `/api/health` returns `{"status":"ok"}`.
- **Cause:** Not a code fault. What was verified without Docker: `npm run build` succeeds and produces the standalone server; the bundled migration script applied migrations to a real Postgres; `server.js` served `/` and `/api/health` (200); the container healthcheck command passed; all three compose combinations pass `docker compose config`.
- **Workaround:** None needed.
- **Fix plan:** On the first machine with Docker: run `npm run stack:local`, then `npm run local:migrate`, open http://localhost:3000/api/health and http://localhost:8025. Then `npm run stack:down` and `npm run stack:smoke`. Mark this Fixed once both work.
- **Related:** `README.md` (Environments)
