# Care Passport — instructions for coding agents

Entry for **UNLOCKED, Challenge 2 of the RMIT hackathon (Tide)**. Build a small working
prototype with TideCloak where no single administrator, organisation or AI can override
the rules protecting people's data. **Vietnam deadline: 18:00 (UTC+7), Thursday
22 October 2026.** Plan against the clock in `care-passport/docs/BUILD-PLAN.md`.

## Read first, in order

1. `care-passport/docs/BUILD-PLAN.md`: phases, times, human-only steps, scope.
2. `care-passport/docs/TIDE-INTEGRATION.md`: the Tide mechanism and gates G0–G6.
3. `care-passport/docs/API-SPEC.md`, `DEMO-SCENARIOS.md`, `SUBMISSION.md`.

Scope is the MVP in BUILD-PLAN: no PostgreSQL, no multi-phase P00–P11 programme and no
S01–S17 matrix. If two docs disagree, the order is: user instruction → organiser
rules → measured Tide behaviour → BUILD-PLAN → TIDE-INTEGRATION → other docs.

## Layout

- Repo root (`hoangdelima09/Hackathon`, public): `README.md` is what judges read first,
  plus `demo.mp4`. Keep the README overview at **300 words or fewer**, starting with the
  organiser template. Setup instructions go in a separate section.
- `care-passport/`: the Next.js app (copied from Tide's `nextjs-customer-portal`
  template) and `docs/`. Never overwrite `care-passport/README.md` or `docs/` when copying
  the template.

## Tide: how to work

- Use the `tide-pack` MCP (hosted `https://mcp.tide.org/mcp`). Useful calls:
  `tide_scenario`/`tide_scenario_bootstrap` with `name: "relationship-attestation"`,
  `tide_scaffold`, `tide_playbook`, `tide_doctor`, `tide_adapter` (`CLAUDE`). If it fails,
  read `care-passport/.tide-pack/` (see BUILD-PLAN §3). Never invent a Tide API; cite
  `GAP_REGISTER.md` when something is unknown.
- Mechanism: built-in contract `RelationshipAttestation:1`, one **Group-subject** policy
  per record (`pa-referral`, `pa-careplan`, `pa-pathology` ↔ groups `/pa-…`), helper
  `templates/relationship-attestation/relationship.ts`. Self-encryption cannot share.
- Real authorization lives in the network and in `verifyTideJWT` + DPoP (template
  `withAuth`/`withRole`). `hasRealmRole()` and route guards are UI only.
- `tidecloak.json` is the only client config (no `NEXT_PUBLIC_TIDECLOAK_*` env vars).
  JWT verification uses the embedded `jwk` only, never remote JWKS.
- Master-admin credentials only in `.env` and bootstrap scripts, never in app code.
- Never proxy IGA approvals through the app server; stewards approve in their own browser.
- A refusal shows as `TIDE-TIDEJS-NET-THRESHOLD_FAILURE`; read `cause`, do not retry.
- Pin Tide packages with `npm view <pkg> version` (≥0.14.17, never 0.99.x).

## This machine

- Ports **3000** (another project's container) and **3100** (another local web app) are taken. The app runs on **4300**
  (`CLIENT_APP_URL=http://localhost:4300`, `next dev --webpack -p 4300`). TideCloak: 8080.
- Docker works without sudo (user in `docker` group, uid 1000). Remove the three `sudo`
  calls from `scripts/init-tidecloak.sh`, which would otherwise hang on a password prompt.
- Run `npm run init` **once**. A rerun deletes the realm database and every enrolled
  account. Run it in the background and relay the invite link to the user.
- Available tools: node 26, docker, jq, curl, gh, ffmpeg, OBS (for the video).

## Only the user may

Give the Tide licence email, accept Tide's Terms & Conditions (https://tide.org/legal),
choose and type passwords, open invite links and create Tide accounts, approve change
requests in the enclave, record the screen, push, publish or submit the Google Form.
Ask for exactly one action at a time, then continue with independent work.

## Do not

- Mock Tide on any security path, or fall back to fake success when Tide refuses.
- Send plaintext record content or keys to the server, logs or `data/app-db.json`.
- Put `_tide_encryptor`/`_tide_decryptor` in default roles, or give them to stewards.
- Claim a gate passed from docs alone. Record real outcomes in `care-passport/docs/EVIDENCE.md`.
- Use real patient data. All people and records are synthetic.
- Commit `.env`, `data/tidecloak.json`, `data/keycloakdb*`, `data/app-db.json` or `.tide-pack/`.
- Commit or push unless the user asks.

## Done means

App runs at `http://localhost:4300` against real TideCloak; gates G0–G5 recorded in
EVIDENCE; `npm run build` passes; the four demo moments work; `demo.mp4` (~2 min,
<100 MB) and the final README are in the repo root; claims match what was measured.
