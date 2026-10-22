# Care Passport — Security acceptance

Status: **nothing run yet.** These checks back the README claims. Record results in
[EVIDENCE](EVIDENCE.md). A mocked test never counts, and an app `403` is not evidence
of Tide enforcement.

## Must pass before the video (maps to the gates in TIDE-INTEGRATION)

| ID | Gate | Action | Required observation |
|---|---|---|---|
| A1 | G0 | Steward signs the `pa-referral` policy | Signed policy stored; contract id `RelationshipAttestation:1` |
| A2 | G1 | Patient writes and opens all three records | Plaintext matches in the browser; `data/app-db.json` has ciphertext only |
| A3 | G2 | GP A, in `/pa-referral`, opens the referral | Decrypts |
| A4 | G2 | GP B (same `_tide_decryptor`, not in group) runs the leaked-copy test on `pa-referral` | Network refusal, message mentions the group; no plaintext |
| A5 | G2 | GP A runs the leaked-copy test on `pa-pathology` | Network refusal |
| A6 | G3 | Physio opens the care plan, then is removed from `/pa-careplan` (2 of 3 approvals) | After signing in again: refused. Also record what the old session did and when |
| A7 | G4 | One steward adds themselves to `/pa-pathology` | Change request `PENDING` with `authCount 1`, `threshold 2`; their leaked-copy decryption refused |
| A8 | G5 | Inspect `data/app-db.json`, server console and network tab | No plaintext or keys outside the authorized browser |
| A9 | — | Call a steward route as a patient, and send a request with a missing or invalid token | 403 and 401 respectively |

## Nice to have (only if time allows)

| ID | Action | Observation |
|---|---|---|
| B1 (G6) | Encrypt with a wrong or second tag | `Tags do not contain assignmentId.` |
| B2 | Clinician tries `PUT /api/records/:id` and tries to encrypt | 404 from the API; network refuses encryption (no `_tide_encryptor`) |
| B3 | Lone steward tries to sign a new `User` policy for `pa-pathology` naming themselves | Record the outcome; the claim stays limited if it succeeds |
| B4 | Replay a request without a DPoP proof | 401 |

## Out of scope for the MVP (stated as limits, not tested)

Master-realm admin and direct H2 database edits in TideCloak, network outages and retries,
concurrency, crash recovery, colluding stewards, compromised clients and metadata
privacy. These replace the earlier S05–S17 matrix, which assumed PostgreSQL, operation
reconciliation and patient-signed consent artifacts that the MVP does not use.

## Evidence format

For each ID record: time (UTC+7), commit, SDK and image versions, who did what, the
expected and observed result, and the network's refusal `cause` text where relevant.
Add a screenshot or the video timestamp. Never store tokens, passwords or plaintext.
Mark each result `PASS`, `FAIL`, `BLOCKED` or `NOT RUN`. A failed check narrows the
README claim; it is never hidden.
