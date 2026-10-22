# Care Passport — Evidence log

Fill this in while running [SECURITY-ACCEPTANCE](SECURITY-ACCEPTANCE.md). Only real,
observed results belong here. No tokens, passwords or plaintext.

## Environment

| Item | Value |
|---|---|
| Commit | `552968f` + uncommitted working tree (22 Oct, 15:50) |
| TideCloak image digest | `tideorg/tidecloak-dev@sha256:3f52d0bc3e4e…aa2708` (production network, home ORK `ork1.tideprotocol.com`) |
| `@tidecloak/nextjs` / `@tidecloak/js` / `@tideorg/js` / `heimdall-tide` | 0.14.40 / 0.14.41 / 0.14.29 / 0.14.41 (single deduped copy, `npm ls`, 22 Oct 11:37) |
| Build | `npm run build` (real mode) passed 22 Oct 11:55 and again 16:35 (Next 16.4.2, webpack, 22 routes) |
| `tide-doctor --url http://localhost:4300 --realm care-passport` | 22 Oct 15:48: 18 passed, 0 failures, `RESULT: OK` |
| Stewards / measured threshold | 1 linked (admin), not yet `tide-realm-admin`. Threshold not measured: no further account could be created |
| Withdrawal delay: old session / after sign-in | Not measured on Tide (blocked) |

## Results

| ID | Time (UTC+7) | Actor | Observed (incl. refusal `cause`) | Result |
|---|---|---|---|---|
| A1 | — | — | Blocked: needs `tide-realm-admin` (the flip) and the admin policy; not run yet | BLOCKED |
| A2 | — | — | Blocked: `patient-a` has no Tide account (licence user limit) | BLOCKED |
| A3 | — | — | Blocked: `gp-a` has no Tide account | BLOCKED |
| A4 | — | — | Blocked: `gp-b` removed (licence user limit) | BLOCKED |
| A5 | — | — | Blocked: `gp-a` has no Tide account | BLOCKED |
| A6 | — | — | Blocked: `physio-a` removed (licence user limit) | BLOCKED |
| A7 | — | — | Blocked: `steward-b`/`steward-c` have no Tide account, so no quorum of 2 | BLOCKED |
| A8 | — | — | Blocked: no Tide ciphertext exists yet (`data/app-db.json` not created) | BLOCKED |
| A9 | 16:36 | curl on the real production build | No token and a forged (simulated) token: 401 on `/api/me` and `/api/sim/realm`; `/api/sim/login`: 404. The 403 case needs a signed-in patient: blocked | PARTIAL |

Simulated build: the same flows were run against local stand-ins and are recorded in
[SIMULATION](SIMULATION.md). They are **not** evidence of Tide enforcement and are kept out of this table.

## Blockers and decisions

- 15:20: the earlier `npm run init` had died while polling for the admin link, so there was no
  adapter. Not re-run (it would wipe the realm). Users, crypto roles and `/pa-*` memberships were
  already provisioned in FirstAdmin mode by `scripts/provision-demo.sh` (12:33).
- 15:45: admin linked its Tide account. `scripts/finish-init.sh` ran init's post-link steps:
  drain (0 pending), `sign-idp-settings` HTTP 200, adapter exported with `jwk`, `vendorId`
  and `homeOrkUrl`.
- Branding and onboarding (asked at the invite step): keep Tide's logo; collect no extra user
  details (synthetic names come from `fixtures/directory.json`).
- 15:55–16:05: creating the other six Tide accounts failed in the enclave, first with "Something
  went wrong", then "Could not reach enough NEW ORKs (got 1 of 20 required, 19 of 20 failed)", then
  "This action isn't available on your current plan - your subscription may have expired or hit its
  user limit". TideCloak logged nothing. `GET …/vendorResources/getLicenseDetails` returned
  `{"currentUserAcc":5, "expiryDate":2026-11-22}` while the realm held 7 users (1 linked).
- 16:08 (user's decision): cut the cast to 5 accounts. `gp-b` and `physio-a` (synthetic, never
  linked) deleted; both `DELETE_USER` change requests committed in FirstAdmin mode. GP A now stands
  in for the "same role, not in the group" refusal (leaked-copy test on `pa-pathology`) and for
  the withdrawal.
- 16:12: with the realm at 5 users, creating `patient-a`'s Tide account still fails with the same
  plan/user-limit message. The limit is not the realm's user count. `getLicenseDetails` unchanged
  (`currentUserAcc 5`), `isPendingLicenseActive true`, `licenseHistory []`. Escalated to Tide.
- 16:20 (user's instruction): build the app "as though TideCloak protects it" and simulate sign-in,
  roles and access checks for now. Added a simulated build (`npm run dev:sim`) beside the
  unchanged real path; see [SIMULATION](SIMULATION.md). The demo video is recorded in that mode
  and says so on screen.
