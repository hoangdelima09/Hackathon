# Care Passport — Architecture

Status: design fixed on 22 October 2026 from Tide's documented `relationship-attestation`
pattern; **not yet running in this checkout**. Security statements below are targets
until the gates in [TIDE-INTEGRATION](TIDE-INTEGRATION.md) are recorded in `EVIDENCE.md`.

## Product boundary

One patient coordinates a care handoff. They share a referral with a named GP and a care
plan with a named physiotherapist, keep pathology private, and withdraw the
physiotherapist's future access when therapy ends. This adapts the organiser's
[Care Passport inspiration](https://tide.org/unlocked%20/#ideas).

The MVP uses synthetic people and records, one Next.js app (browser and API routes), a
JSON file store and a real TideCloak realm on the Tide network. Medical systems and
notifications are out of scope. No IPFS, blockchain, wallet, DID, hospital connector,
AI agent or emergency override.

## Components and responsibility

| Component | Responsibility | Must not become authority for |
|---|---|---|
| Patient browser | Write synthetic content, encrypt it under the record's policy, open own records, request shares and withdrawals | Other patients' records |
| Clinician browser | Sign in, list records shared with them, attempt decryption | Choosing its own groups or roles |
| App API + `data/app-db.json` | Store ciphertext, signed policies, requests and events; filter lists by verified token claims | Holding keys, minting access, treating a DB row as a grant |
| TideCloak (realm `care-passport`) | Login, tokens/doken with `groups` and roles, IGA change requests | Letting one admin commit a governed change once quorum is 2 |
| Tide network (ORKs, 14-of-20) + `RelationshipAttestation:1` | Release encryption and decryption only to a caller in the record's group holding the matching crypto role | Anything outside encryption and decryption |
| Stewards (3 `tide-realm-admin`, quorum 2) | Approve record policies, role grants and group membership changes | Acting alone, or reading records (they hold no crypto roles) |

The application API is a convenience layer: it hides records a user should not see.
The security boundary is the network check at decryption time. The demo's
"leaked-copy test" proves this by giving GP B the ciphertext and policy anyway.

## Identity and access model

- Identity is the verified access token (`sub`, `preferred_username`, `groups`, roles).
  Display names and patient/GP/physio labels come from `fixtures/directory.json`. They are
  synthetic labels, not authority and not proof of a medical licence.
- **Access to a record = membership of its care group + the crypto role**, checked by
  the network. One record ↔ one group ↔ one policy: `pa-referral` ↔ `/pa-referral`, and so
  on. A second GP gains nothing from sharing the GP label.
- Patient A is in every group of their records and holds `_tide_encryptor` and
  `_tide_decryptor`. Clinicians hold `_tide_decryptor` only, so they can never write.
- Sharing intent (record, recipient, purpose, requested expiry) is an app record shown as
  a receipt. Membership enforces it. Purpose and requested expiry are **not** enforced by
  Tide in the MVP. Signing policies with an expiry is possible but ends access for the
  whole group.

## Flows

```text
Create:   patient browser encryptForRecord(text, recordId, policy) → API stores ciphertext
Share:    patient requests (app) → steward adds clinician to the record group in TideCloak
          → change request needs 2 of 3 stewards → committed → clinician signs in again
Read:     API returns records whose group is in the caller's verified groups claim
          → decryptForRecord in the browser → the network checks group + role
Withdraw: patient requests (app) → steward removes clinician from the group (2 of 3)
          → after the clinician's credential refreshes, the next decryption is refused
```

Request status in the app is bookkeeping (`requested`, `done`, `rejected`). The
effective state is whatever TideCloak has committed and the network enforces. The UI
must say so ("waiting for 2 of 3 steward approvals in TideCloak") and never show
"access granted" from the app row alone.

## Governance and trust boundaries

- Governed in TideCloak (IGA): role grants, group membership, `tide-realm-admin` changes
  and the admin policy threshold. Record policies need a steward's enclave approval.
- Setup runs at threshold 1 (one steward). The demo runs with three stewards and a
  measured threshold of 2. A lone steward's change stays `PENDING`.
- The patient initiates and the stewards execute. Patient-only grants would need a custom
  contract deployed by Tide; this is out of MVP scope and stated as a limitation.
- The local `master` realm admin (bootstrap credential) is outside IGA. It is used only
  by the init script and is listed as a limitation rather than tested further.

## Data protection and limits

- Clinical content exists in plaintext only in an authorized browser's memory. The
  server stores ciphertext; record ids and type labels are clear metadata.
- No decrypted content in localStorage, service workers or downloads. Clear the viewer
  on sign-out and after a refused decryption.
- Withdrawal stops future decryption after the credential refreshes. It cannot recall
  plaintext already viewed. Measure and disclose the delay seen with an old session.
- Out of scope: compromised client JavaScript or devices, colluding stewards at quorum,
  availability and backup, metadata privacy, clinical accreditation and regulatory
  compliance.
- App events in `data/app-db.json` are labelled as application or client reports, not as
  tamper-proof audit.

Acceptance checks are in [SECURITY-ACCEPTANCE](SECURITY-ACCEPTANCE.md).
