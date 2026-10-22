# Care Passport — Two-minute demo

Status: recording plan. The organiser's suggested structure is: the possibility → the
constraint → the prototype and TideCloak's role → what changes for users. Every refusal
shown must be the real Tide network message, never a mocked screen.

## Cast and starting state (separate browser profiles, already signed in)

| Alias | Labelled as | Crypto role | Groups at start |
|---|---|---|---|
| `patient-a` | Linh Tran, patient (synthetic) | `_tide_encryptor`, `_tide_decryptor` | `/pa-referral`, `/pa-careplan`, `/pa-pathology` |
| `gp-a` | Dr Alex Nguyen, GP | `_tide_decryptor` | none |
| `gp-b` | Dr Bao Pham, GP | `_tide_decryptor` | none |
| `physio-a` | Sam Le, physiotherapist | `_tide_decryptor` | `/pa-careplan` |
| `admin`, `steward-b`, `steward-c` | Care-governance stewards (quorum 2 of 3) | none | none |

Before recording: run every check in [SECURITY-ACCEPTANCE](SECURITY-ACCEPTANCE.md) A1–A8.
Physio has opened the care plan once. GP A is not yet in `/pa-referral`. Allow pop-ups
for the enclave. Open the TideCloak console beside the app.

## Script (120 s)

| Time | Screen | Narration (keep it short) |
|---|---|---|
| 00:00–00:12 | Patient's three records, decrypted in the patient's browser | "A referral shouldn't hand over your whole history, or trust the platform with all of it." |
| 00:12–00:25 | `data/app-db.json`: ciphertext only | "Care Passport's server stores only ciphertext. It holds no key, and neither does any one admin." |
| 00:25–00:55 | Patient shares the referral with Dr Alex → a steward adds Dr Alex to the referral's care group (1 of 2) → a second steward approves (2 of 2) → Dr Alex signs in and opens it | "Sharing is a governed change: two of three stewards must approve, then Tide's network releases the referral to Dr Alex only." (Use a labelled time cut while approvals run.) |
| 00:55–01:10 | Dr Bao (same GP role) runs the leaked-copy test on the referral → refusal text | "Even with the ciphertext and policy, another GP is refused by the network, not by our API." |
| 01:10–01:35 | Patient withdraws Sam's care-plan access → stewards approve removal → Sam signs in again → open → refused | "The next decryption is refused. What Sam already read can't be recalled, and we say so." |
| 01:35–01:52 | One steward adds themselves to the pathology group → change request stuck at 1 of 2 → their decryption is refused | "No single administrator can grant themselves a patient's pathology." |
| 01:52–02:00 | Patient's sharing receipts | "The patient decides, the network enforces, and nobody can override it alone." |

If a step fails during recording, show the honest result and fix the claim. Never splice
in a fabricated success or refusal.

## Recording and export

1. Record in OBS at 1920×1080, 30 fps, to `raw.mkv`. `*.mkv` is gitignored.
2. Trim and compress to the repository root:

   ```bash
   ffmpeg -i raw.mkv -vf "scale=1280:-2,fps=30" -c:v libx264 -preset veryfast -crf 28 \
     -c:a aac -b:a 96k -movflags +faststart demo.mp4
   ffprobe -v error -show_entries format=duration,size -of default=nw=1 demo.mp4
   ```

3. Check that the duration is about 120 s and the size is under 100 MB. Then play
   `demo.mp4` once from a fresh clone or GitHub's file view.
