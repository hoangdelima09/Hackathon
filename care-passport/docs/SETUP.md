# Care Passport — Setup

Status: **target procedure; not yet executed.** Replace this line with the date, commit
and versions once a clean run succeeds. The project build plan is in
[BUILD-PLAN](BUILD-PLAN.md) and the mechanism in [TIDE-INTEGRATION](TIDE-INTEGRATION.md).

## Prerequisites

- Linux or macOS with Node.js 18+ (tested target: Node 26), npm, Docker, `curl`, `jq`.
- Free ports **8080** (TideCloak) and **4300** (app). The app uses 4300 because 3000 and 3100 were
  occupied on the development machine. Any free port works if `CLIENT_APP_URL` matches.
- A browser that allows pop-ups for `localhost:8080` (the Tide enclave opens in one).
- Separate browser profiles for each demo identity. Each Tide session is per browser.

## 1. Install

```bash
git clone https://github.com/hoangdelima09/Hackathon.git
cd Hackathon/care-passport
npm ci
cp .env.example .env
```

Fill in `.env` yourself. It is gitignored:

| Variable | Value |
|---|---|
| `KC_BOOTSTRAP_ADMIN_PASSWORD` | A local TideCloak master-admin password you choose |
| `TIDE_LICENSE_EMAIL` | A real email you control (the realm is licensed to it) |
| `TIDE_TERMS_ACCEPTED` | `yes`, only if you agree to https://tide.org/legal |

## 2. Start and bootstrap TideCloak (once)

```bash
CLIENT_APP_URL=http://localhost:4300 npm run init
```

The script starts `tideorg/tidecloak-dev:latest` on port 8080. It then creates the
`care-passport` realm, licenses it, enables IGA and writes `data/tidecloak.json`.
It pauses at an **invite link**: open it and create the first steward's Tide account.
**Running it again deletes the realm and all enrolled accounts.**

## 3. Run the app

```bash
npm run dev            # http://localhost:4300
```

Check the setup until it reports `RESULT: OK` (the pack files are not committed, so
fetch them first):

```bash
mkdir -p .tide-pack && curl -fsSL https://mcp.tide.org/pack/templates.tgz | tar -xz -C .tide-pack
bash .tide-pack/templates/shared/tide-doctor.sh --url http://localhost:4300
```

## 4. Demo identities and governance (in this order)

1. In separate browser profiles, sign in to the app once as each of `patient-a`, `gp-a`,
   `gp-b`, `physio-a`, `steward-b` and `steward-c` (each creates a Tide account).
2. As the first steward, in the TideCloak admin console (`http://localhost:8080/admin`,
   realm `care-passport`):
   - Realm roles: `patient-a` gets `_tide_encryptor` + `_tide_decryptor`; `gp-a`, `gp-b`
     and `physio-a` get `_tide_decryptor` only.
   - Groups `/pa-referral`, `/pa-careplan`, `/pa-pathology`: add `patient-a` to all
     three and `physio-a` to `/pa-careplan`.
   - Change requests: approve everything pending (threshold is 1 at this point).
3. In the app at `/steward`, sign one policy per record (three enclave approvals).
4. Grant `tide-realm-admin` (client `realm-management`) to `steward-b` and `steward-c`,
   then approve. Confirm that a new change request shows **threshold 2**.
5. Every user signs out and in again so their tokens carry the new roles and groups.

## 5. Try it

| Step | Who | Expected |
|---|---|---|
| Write and open the three synthetic records | `patient-a` at `/patient` | Plaintext only in the browser |
| Request to share the referral with GP A | `patient-a` | Request listed; awaiting 2 of 3 stewards |
| Add `gp-a` to `/pa-referral`; two stewards approve | Stewards in TideCloak | Change request committed |
| Open the referral | `gp-a` at `/clinician` (after signing in again) | Decrypts |
| Leaked-copy test on `pa-referral` | `gp-b` | Refused by the Tide network |
| Withdraw Physio; stewards remove `physio-a` from `/pa-careplan` | `patient-a`, stewards | Physio's next decryption refused after sign-in |
| Add yourself to `/pa-pathology` alone | One steward | Change request stays pending (1/2); decryption refused |

## 6. Reset

Delete `data/app-db.json` to clear app data (ciphertext, requests, events). Group
memberships and policies live in TideCloak and change only through governed requests.
Do not re-run `npm run init` unless you intend to re-enroll everyone.

## Fill in after the verified run

| Item | Value |
|---|---|
| Commit / date | Not recorded |
| TideCloak image digest | Not recorded |
| `@tidecloak/nextjs`, `@tidecloak/js`, `@tideorg/js`, `heimdall-tide` | Not recorded |
| Measured withdrawal delay (old session / after sign-in) | Not measured |
