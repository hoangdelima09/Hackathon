# Care Passport — Simulated TideCloak mode

Status: added 22 October 2026, 16:20 (UTC+7), at the user's request, because the realm's free-tier
licence refused to create any Tide account after the first one (see [EVIDENCE](EVIDENCE.md)). It
lets the full demo run while that is resolved. **Nothing observed in this mode is evidence of Tide
enforcement.**

## Two builds, one codebase

| Build | Command | Security backend |
|---|---|---|
| Real (default) | `npm run dev` / `npm run build` | TideCloak realm `care-passport` and the Tide network (`RelationshipAttestation:1`) |
| Simulated | `npm run dev:sim` / `npm run build:sim` | Local stand-ins in `src/sim/`, selected by `NEXT_PUBLIC_CARE_PASSPORT_MODE=simulated` |

Pages call one surface, `usePlatform()` (`src/lib/client/platform.tsx`). API routes import
`withAuth`/`withRole` from `src/server/auth.ts`, which in the real build **are** the template's
wrappers (`verifyTideJWT` with the embedded `jwk`, plus DPoP). The template's `src/lib/auth/*`,
`relationship.ts` and the realm are unchanged.

A fresh clone has no `data/tidecloak.json` (it is never committed), so the `:sim` scripts copy
`fixtures/tidecloak.simulated-placeholder.json` there **only if the file is missing**. The placeholder
has no keys and cannot verify a real token. Checked 22 Oct, 16:40: a copy holding only the files git
would commit builds with `npm run build:sim`.

Every simulated screen carries a red **SIMULATED TideCloak** banner. Measured on the real
production build (22 Oct, 16:36): `POST /api/sim/login` answers **404**, and a simulated token sent
to a real route answers **401**.

## Where TideCloak fits, and what stands in for it

Planned from Tide's agent pack (`tide_scenario` and `tide_scenario_roles`, `relationship-attestation`).

| Tide piece (real build) | Used for | Simulated stand-in |
|---|---|---|
| TideCloak sign-in (OIDC and the Tide enclave), DPoP-bound token | Who the user is | Pick a synthetic identity (`/api/sim/login`). The server issues an HS256 token with the same claims: `preferred_username`, `groups`, `realm_access.roles`, `resource_access["realm-management"].roles` |
| `verifyTideJWT` and DPoP proof | Every API route | `src/sim/auth.ts` verifies the simulated token |
| Realm roles `_tide_encryptor`/`_tide_decryptor`, groups `/pa-*`, `tide-realm-admin` | Who may read, write or govern | `data/sim-tide.json`, seeded like `scripts/provision-demo.sh` with the full cast of 7 |
| IGA change requests at the admin-policy threshold | Share and withdraw (group membership) | Change-request panel on `/steward`. Threshold `max(1, floor(0.7 × stewards))` = 2 of 3; one approval per steward; commits only at the threshold |
| Credential refresh | Membership reaches the token | The token is a snapshot taken at sign-in; **Sign in again** re-issues it |
| Steward enclave approval of a record policy | The grant of a record to its group | A confirmation dialog, then the stand-in network signs the policy (HMAC) |
| Tide ORK network running `RelationshipAttestation:1` | Every encrypt and decrypt | `src/sim/network.ts` runs the contract's checks in the pack's order, with its refusal messages: signature, contract id, expiry, tags = record id, caller's `groups` contains the subject, policy `roles` permit the operation, caller holds the realm role |

## What the simulation does not reproduce

- **Keys.** The real network never assembles a key. The stand-in keeps one AES-256 key per record
  in `data/sim-tide.json` and releases it to a browser that passes the checks. The browser
  encrypts and decrypts locally (AES-GCM, record id as associated data), so plaintext still never
  reaches the server and `data/sim-app-db.json` holds ciphertext only. But in this mode **the
  process that runs the app also holds the keys**, which the real design exists to prevent.
- **Threshold.** There are no ORKs and no threshold cryptography: one process decides.
- **Sign-in.** There are no passwords; anyone can pick any identity.
- **Enclave.** Approvals are API calls from the steward's tab, not enclave signatures.

## Measured in the simulated build (22 Oct, ~16:25, via the API)

These results show the app's flows behave as designed against the stand-in. They do not show Tide.

| Check | Result |
|---|---|
| Steward signs the 3 Group policies | Stored |
| Patient (all groups, both roles) asks to encrypt the referral | Key released |
| GP A before the share | Refused: `'/pa-referral' group not found in doken.` |
| Add GP A to `/pa-referral` | 1/2 PENDING after Steward 1; a second approval by Steward 1 is rejected; 2/2 COMMITTED after Steward 2 |
| GP A with the old credential, then after signing in again | Refused, then key released |
| GP B (same role) with the leaked ciphertext and policy | Refused: `'/pa-referral' group not found in doken.` |
| Physio removed from `/pa-careplan` (2/2) | Old credential still released the key; after signing in again, refused |
| Lone steward adds themselves to `/pa-pathology` | 1/2 PENDING; their decryption refused |
| Wrong tag; GP A encrypting; tampered policy | `Tags do not contain assignmentId.`; `'_tide_encryptor' role not found for this encryption request.`; `Policy supplied has not been signed` |
| Patient calls a steward route; no token; forged token | 403; 401; 401 |

## Switching back

Stop the simulated server and run `npm run dev`. The real store (`data/app-db.json`) and the realm
were never touched by the simulation; its own state is in `data/sim-*.json` (gitignored).
