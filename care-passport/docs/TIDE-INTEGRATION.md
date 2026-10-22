# Care Passport — TideCloak integration

Status: **design fixed from Tide's agent pack and implemented in `src/`; gates not yet run.**
The realm is bootstrapped: users, crypto roles and `/pa-*` memberships were provisioned by
`scripts/provision-demo.sh` while the realm was in FirstAdmin mode.
Sources were read on 22 October 2026 from the Tide MCP (`@tideorg/mcp` 1.9.33): scenario
`relationship-attestation`, template `templates/relationship-attestation/relationship.ts`,
canon `custom-contracts`, `iga-change-requests-api` and `tidecloak-bootstrap`. Ask the MCP
(`tide_scenario`, `tide_scenario_bootstrap`, `tide_playbook`) for exact commands; do not
invent Tide APIs. A gate stays "Not run" until it has been run against the real realm.

## The mechanism: one care group per record

Care Passport uses the ORK's **built-in contract `RelationshipAttestation:1`**. Nothing is
written, compiled or deployed. A realm admin approves one policy per record; from then
on the Tide network (ORKs, threshold 14-of-20) decides every encryption and decryption.

| Concept | Care Passport value |
|---|---|
| Record id (`assignmentId`, and the **only** tag on its ciphertext) | `pa-referral`, `pa-careplan`, `pa-pathology` |
| Care group (policy subject, `subjectType: Group`) | `/pa-referral`, `/pa-careplan`, `/pa-pathology` (full path as in the `groups` claim) |
| Policy `roles` | `["_tide_encryptor","_tide_decryptor"]` (read-write policy) |
| Patient A | Member of all three groups; realm roles `_tide_encryptor` + `_tide_decryptor` |
| GP A, GP B, Physio A | Realm role `_tide_decryptor` only, so clinicians can read but never write |
| Stewards (admins) | `tide-realm-admin`; **none** of the `_tide_*` crypto roles and no group membership |

On every request the network checks:

- every tag equals the record id;
- the caller holds `_tide_encryptor` (encrypt) or `_tide_decryptor` (decrypt), and the
  policy's `roles` list that operation;
- the caller's credential has a `groups` entry equal to the record's group;
- the policy has not expired.

Consequences that make the demo credible:

- **Selective sharing:** sharing the referral means adding GP A to `/pa-referral`. GP B
  holds the same `_tide_decryptor` role but is not in the group, so the network refuses
  GP B, even if GP B obtains the ciphertext and the policy.
- **Withdrawal:** removing Physio A from `/pa-careplan` makes the next decryption fail
  once Physio A's credential refreshes. Record the measured delay.
- **No lone administrator:** with IGA on, adding or removing a group member and granting
  a role are governed change requests. With three stewards the quorum is two, so one
  admin's request stays `PENDING` and that admin still cannot decrypt.
- **Server holds ciphertext only:** the app server and its JSON store never hold a key.
  A full database copy does not decrypt.

## SDK surface (from the pack, pin versions when installing)

Copy `templates/relationship-attestation/relationship.ts` into `src/lib/tide/`. It needs
`@tidecloak/js`, `@tideorg/js` and `heimdall-tide` in addition to the template's
`@tidecloak/nextjs`. Resolve current versions with `npm view <pkg> version`. Never use
0.99.x or anything below 0.14.17, and match the SDK to the server (canon `version-policy`).

| Call (browser only) | Who | Purpose |
|---|---|---|
| `signRelationshipPolicy({ vendorId, subject: { type: "Group", id: "/pa-referral" }, recordId: "pa-referral", access: "read-write" }, adminPolicy)` | Steward, in the Tide enclave | The approval **is** the grant of the record to its group. Returns signed policy (base64) |
| `encryptForRecord(text, recordId, policyB64)` | Patient A | Ciphertext is stored by the app |
| `decryptForRecord(ciphertext, recordId, policyB64)` | Any caller; the network decides | Plaintext stays in browser memory |
| `describeRelationshipPolicy(policyB64)` | Server, before storing | Confirm subject, record and contract id |
| `readSession()` | Browser | Shows the caller's `groups` and crypto roles (UI hint only) |

`adminPolicy` comes from
`GET {auth-server-url}/admin/realms/{realm}/iga/role-policies/name/tide-realm-admin`
(field `policy`, base64). The steward's **browser** fetches it directly from TideCloak with
its own DPoP-bound token (`IAMService.secureFetch`), so the app server never relays it.

A refusal arrives as `TIDE-TIDEJS-NET-THRESHOLD_FAILURE` ("Could not reach enough VVK
ORKs"). That **is** the contract's refusal, not an outage: show the `cause` text
(for example `'/pa-referral' group not found in doken.`) and do not retry.

## Pack rules that apply here

- `vendorId` comes from `data/tidecloak.json`. Policies use it as the key id.
- Realm roles `_tide_encryptor`/`_tide_decryptor` and the `groups` mapper (access token,
  full path on) ship in the pack's realm template. Never put the crypto roles in the
  default-roles composite.
- `hasRealmRole()` and route guards are UI only. Real authorization is
  `verifyTideJWT()` (embedded `config.jwk`, never remote JWKS) + DPoP via the template's
  `withAuth`/`withRole` wrappers.
- Use `IAMService.secureFetch` with absolute URLs for DPoP-bound calls (adapter rule).
- Master-admin credentials appear only in bootstrap scripts and `.env`, never in app code.
- Never proxy IGA approvals through the app server: each steward approves in their own
  browser (TideCloak console or a page calling TideCloak with their own token).
- Self-encryption (`_tide_<tag>.selfencrypt`) is user-bound and **cannot** be upgraded to
  sharing. Do not use it for shared records.

## Governance and quorum

- The initial admin from `npm run init` is the first steward (threshold 1). Do every
  setup change while the threshold is still 1: sign-ups, role grants, groups, Patient A's
  memberships, and the three policies.
- Then link two more stewards and grant them `tide-realm-admin`. The commit gate uses
  the threshold in the signed admin policy, which changes only when a
  `REGEN_ADMIN_POLICY` request commits. The projected value is
  `max(1, floor(0.7 × admins))`, which is 2 for three admins. **Verify** that a new
  change request shows `threshold: 2` before claiming quorum.
- The filer may approve their own request, so a lone steward's request reaches 1 of 2 and
  stays `PENDING`.

## Gates: run in this order, record results in `docs/EVIDENCE.md`

| Gate | Experiment | Pass when | Status |
|---|---|---|---|
| G0 contract | Steward signs the `pa-referral` policy | Signed bytes returned; `describeRelationshipPolicy` shows `RelationshipAttestation:1` | Not run |
| G1 round trip | Patient A encrypts and decrypts `pa-referral` | Plaintext matches; server stored ciphertext only | Not run |
| G2 named group | GP A (member) decrypts; GP B (not member, same role) uses the leaked-copy test | GP A succeeds; GP B refused with the group message | Not run |
| G3 withdrawal | Remove Physio A from `/pa-careplan` (quorum), then decrypt with (a) the old session and (b) after sign-in | (b) refused; (a) measured and disclosed | Not run |
| G4 lone admin | One steward adds themselves to `/pa-pathology` | Change request `PENDING` 1/2; their decryption refused | Not run |
| G5 operator | Inspect `data/app-db.json` and server logs | No plaintext, no keys | Not run |
| G6 tag binding | Encrypt with a wrong or second tag | Refused (`Tags do not contain assignmentId.`) | Not run |

Optional, only if time allows: whether a lone steward can sign a *new* policy for an
existing record while the threshold is 2. Until tested, rely on the second barrier: the
steward also lacks `_tide_decryptor`, and granting it needs quorum.

## Plan B if G0 fails (unknown contract on the network)

`RelationshipAttestation:1` has been on ORK `main` since 2026-10-16. The pack marks the
availability on other networks as ASSUMED. `tideorg/tidecloak-dev:latest` uses the
production network.

1. Post the exact error in Tide Discord `#support` (https://discord.gg/XBMd9ny2q5) at once.
   Do not write a custom contract; only the Tide team can deploy one.
2. Decision time: **13:30 Vietnam time**. If there is no answer, switch to the
   `encrypted-communication` hybrid. Each user's X25519 private key is Tide
   self-encrypted (`_tide_keys.selfencrypt/selfdecrypt`). The patient wraps a per-record
   key to the clinician's public key in the browser. Withdrawal deletes the wrapped key
   and, for a Tide-enforced stop, a governed change removes the clinician's
   `selfdecrypt` role. That stop is coarse: it ends all of their access.
3. Update the README claims to whatever was actually demonstrated.

## Limits to state honestly

- Granting and withdrawing need two of three stewards. The patient initiates; the
  stewards execute. Patient-only grants would need a custom contract deployed by Tide.
- Withdrawal takes effect when the clinician's credential refreshes (sign-in or token
  refresh), not instantly. Plaintext already viewed or copied cannot be recalled.
- Colluding stewards at quorum can add a member. Metadata stays visible to the operator:
  record ids, group names, who is in which group, sizes and timing.
- A compromised client (malicious JavaScript or device) can leak what it decrypts.
- Demo only: synthetic people and records, local TideCloak, not for real patient data.
