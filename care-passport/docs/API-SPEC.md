# Care Passport — Application API (MVP)

Status: contract for the MVP; **not implemented yet**. These are Care Passport routes,
not Tide APIs. They organise ciphertext and requests; **the Tide network, not this API,
decides who can decrypt** (see [TIDE-INTEGRATION](TIDE-INTEGRATION.md)).

## Conventions

- Next.js route handlers under `/api`, each wrapped in the template's `withAuth` or
  `withRole`, which verify the TideCloak JWT (embedded `jwk`) and the DPoP proof.
  Browser calls use `IAMService.secureFetch` with absolute URLs.
- Identity comes only from the verified token: `sub`, `preferred_username`, `groups`,
  `realm_access.roles`, and `resource_access["realm-management"].roles` (steward =
  `tide-realm-admin`). Never from a body field or header.
- Labels (`displayName`, `kind`: `patient` | `gp` | `physio`) come from
  `fixtures/directory.json`, keyed by username. Provisioned records come from
  `fixtures/records.json`.
- Bodies are JSON; the maximum body size is 256 KB. Responses carrying ciphertext use
  `Cache-Control: no-store`. Never accept, return or log clinical plaintext or tokens.

## Store: `data/app-db.json` (gitignored)

| Collection | Fields |
|---|---|
| `records` | `id` (`pa-referral` …), `owner` (username), `group` (`/pa-referral`), `label` (`Referral`, `Care plan`, `Pathology`), `ciphertext` (string or null), `updatedAt` |
| `policies` | `recordId`, `policy` (signed base64), `subject` (`/pa-…`), `signedBy`, `createdAt` |
| `requests` | `id`, `recordId`, `owner`, `recipient` (username), `action` (`share` \| `withdraw`), `purpose`, `status` (`requested` \| `done` \| `rejected`), `note`, `createdAt`, `updatedAt` |
| `events` | `id`, `at`, `actor`, `recordId`, `type`, `source` (`application` \| `client_report`), `detail` |

Writes are serialized: load, change, then write to a temp file and rename it into place.

## Endpoints

| Method and path | Allowed caller | Behaviour |
|---|---|---|
| `GET /api/config` | Anyone (template) | Public client config |
| `GET /api/me` | Signed in | `{ username, displayName, kind, groups, cryptoRoles, isSteward }` |
| `GET /api/directory` | Patient | Clinicians only: `[{ username, displayName, kind }]` |
| `GET /api/records` | Signed in | Patient: own records. Others: records whose `group` is in the caller's verified `groups` claim. Each item: `{ id, label, group, ciphertext, policy }` (`policy` only if signed) |
| `PUT /api/records/:id` | Record owner | Body `{ ciphertext }`. 404 if the record is not provisioned or not theirs |
| `GET /api/admin-policy` | Steward | Fetches `GET {auth-server-url}/admin/realms/care-passport/iga/role-policies/name/tide-realm-admin` **with the caller's own token** and returns `{ policy }` (base64) |
| `POST /api/policies` | Steward | Body `{ recordId, policy }`. Record must be provisioned. Store the subject and contract id shown by `describeRelationshipPolicy`, decoded in the steward's browser if the SDK will not run on the server. The network enforces the policy regardless |
| `POST /api/requests` | Record owner | Body `{ recordId, recipient, action, purpose }`; the recipient must be a directory clinician. Creates status `requested` and an event |
| `GET /api/requests` | Patient (own) or steward (all) | Lists requests, newest first |
| `PATCH /api/requests/:id` | Steward | Body `{ status: "done" \| "rejected", note }`. Bookkeeping after acting in TideCloak; grants nothing |
| `GET /api/demo/leaked/:recordId` | Signed in | **Demo only.** Returns `{ ciphertext, policy }` for any record, simulating a full database leak or compromised server. Logs an event |
| `POST /api/events` | Signed in | Client report `{ recordId, type: "decrypt_ok" \| "decrypt_refused", detail }`. The detail is the refusal `cause`, never plaintext |
| `GET /api/events` | Patient (own records) or steward (all) | Activity list labelled by `source` |

## Errors

| HTTP | `error` | Meaning |
|---|---|---|
| 400 | `invalid_request` | Bad fields, unknown recipient, or body too large |
| 401 | `unauthenticated` | Missing or invalid token or DPoP proof |
| 403 | `forbidden` | Signed in but not allowed (for example a non-steward calling a steward route) |
| 404 | `not_found` | Unknown record, or not visible to the caller |

A decryption refusal is not an API error: it happens in the browser, comes from the
network (`TIDE-TIDEJS-NET-THRESHOLD_FAILURE` with a `cause`) and is shown verbatim.

## Deferred (not in the MVP)

Idempotency keys, an operations/reconciliation table, cursor pagination, consent
versions, Tide-enforced purpose/expiry, a server-side IGA governance panel, PostgreSQL
and migrations. Revisit only after the four demo moments work.
