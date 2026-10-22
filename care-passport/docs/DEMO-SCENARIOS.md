# Care Passport — Two-minute demo

Status: recording plan, simulated build (22 Oct, 16:50). The organiser's suggested structure is: the possibility → the
constraint → the prototype and TideCloak's role → what changes for users. Every refusal
shown must be the real Tide network message, never a mocked screen.

## Mode used for the video

Recorded in the **simulated build** (`npm run dev:sim`, see [SIMULATION](SIMULATION.md)), because
the realm's licence refused every Tide account after the first. The red SIMULATED banner stays on
screen, and the narration says so once. One Chromium window, one tab per identity
(`http://localhost:4300/?as=<username>`).

## Before recording (not filmed, about 3 minutes)

1. Tab `admin` → **Steward** → **Sign policy** for all three records (OK in the "Simulated Tide
   enclave" dialog).
2. Tab `patient-a` → **Patient** → **Write synthetic content** on all three cards → **Open** all three.
3. Tab `physio-a` → **Clinician** → **Open** the care plan once.
4. Terminal ready in `care-passport/`: `jq '.records[] | {id, ciphertext: .ciphertext[0:48]}' data/sim-app-db.json`
5. Browser zoom 110 %, bookmarks bar hidden, notifications off. Record in clips if easier; they are
   joined afterwards.

## Script (about 120 s)

| Time | Tab and actions | Narration |
|---|---|---|
| 0:00–0:12 | `patient-a` → Patient: three opened records (referral, care plan, pathology) | "Linh is between a GP referral and physiotherapy. Each clinician needs one record, not her whole history." |
| 0:12–0:22 | Terminal: the `jq` command shows ciphertext only | "Care Passport's server stores only ciphertext. Normally whoever runs the platform, or one admin, could still read or re-share it." |
| 0:22–0:30 | Back to `patient-a`: referral card → Share with **Dr Alex Nguyen**, purpose **Referral consultation** → **Request access** | "Linh asks to share just the referral with Dr Alex. The request itself grants nothing." |
| 0:30–0:42 | `admin` → Steward → Patient requests → **File change request** → Change requests → **Approve** (1/2, Pending) → `steward-b` → **Approve** (2/2, Committed) | "Adding Dr Alex to the referral's care group is a governed change: two of three stewards must approve." |
| 0:42–0:52 | `gp-a` → **Sign in again** → Clinician → Referral → **Open** → plaintext | "With a fresh credential, the network releases the referral to Dr Alex, and only the referral." |
| 0:52–1:05 | `gp-b` → Clinician → Prove it → Record **Referral** → **Try to decrypt the leaked copy** → refusal | "Dr Bao is also a GP and even holds a leaked copy and the policy. Refused: he is not in this record's care group." |
| 1:05–1:12 | `patient-a` → care plan card → Withdraw from **Sam Le** → **Withdraw future access** → confirm | "Therapy is over. Linh withdraws Sam's access." |
| 1:12–1:20 | `admin` → File a change: `physio-a` / remove from / `/pa-careplan` → **File change request** → **Approve** → `steward-b` → **Approve** (Committed) | "Again, two stewards." |
| 1:20–1:32 | `physio-a` → **Sign in again** → Clinician → Prove it → **Care plan** → **Try to decrypt** → refusal | "Sam's next decryption is refused. What he already read can't be recalled, and we say so." |
| 1:32–1:48 | `admin` → File a change: `admin` / add to / `/pa-pathology` → **File change request** → **Approve** → stays **1/2 Pending** → Lone-administrator test → **Pathology** → **Try to decrypt** → refusal | "One steward tries to give themselves Linh's pathology. Stuck at one of two, and still refused." |
| 1:48–2:00 | `patient-a` → Sharing requests and Activity | "The patient decides, a quorum executes, and the network enforces. No single admin can override it. Shown here in simulated mode; the real TideCloak integration is in the repo." |

If a step fails during recording, show the honest result and fix the claim. Never splice
in a fabricated success or refusal.

## Real Tide build (when the licence allows more accounts)

Cast as before: `patient-a`, `gp-a`, `gp-b`, `physio-a` and three stewards, each in their own
browser profile. Group changes are made in the TideCloak console and approved in the enclave.
Run SECURITY-ACCEPTANCE A1–A8 first.

## Recording and export

1. Record in OBS at 1920×1080, 30 fps, to `raw.mkv` (or several clips). `*.mkv` is gitignored.
2. Trim and compress to the repository root:

   ```bash
   ffmpeg -i raw.mkv -vf "scale=1280:-2,fps=30" -c:v libx264 -preset veryfast -crf 28 \
     -c:a aac -b:a 96k -movflags +faststart demo.mp4
   ffprobe -v error -show_entries format=duration,size -of default=nw=1 demo.mp4
   ```

3. Check that the duration is about 120 s and the size is under 100 MB. Then play
   `demo.mp4` once from a fresh clone or GitHub's file view.
