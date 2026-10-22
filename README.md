[![Built with TideCloak](https://tide.org/badges/built-with-tidecloak.svg)](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked)

## Project overview

_Care Passport lets a patient share one health record with one named clinician, then withdraw it, while no server, operator or single administrator can read or widen that access._

Built with [TideCloak](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked).

### 1. Vision & originality

A patient-held passport for care handoffs: share a referral with a GP and a care plan with a physiotherapist, keep pathology private, and end access when therapy ends. Distinctive: access is enforced per record by Tide's network, and no single party, including the operator, can widen it.

### 2. Trust constraint insight

Platforms that store records can usually read them, and one privileged administrator can quietly grant themselves access. Selective, revocable sharing therefore still means trusting the operator, so patients hand over everything. Removing that unilateral authority makes fine-grained sharing credible.

### 3. Value & impact

Patients disclose only what each clinician needs and can stop future access without trusting the platform. Example: Linh shares a referral with Dr Alex; Dr Bao, another GP, cannot open it even with a leaked copy; when physiotherapy ends, Sam's next decryption is refused.

### 4. Why TideCloak matters

Records are encrypted in the browser under per-record policies using Tide's built-in `RelationshipAttestation` contract. Tide's ORK network releases decryption only to members of that record's care group who hold the decrypt role. Membership changes are TideCloak IGA change requests needing two of three stewards. With ordinary login and database permissions, whoever controls the database or admin console could read or re-share everything.

### 5. Prototype & storytelling

Status: in progress (results in [EVIDENCE](care-passport/docs/EVIDENCE.md)). Watch for: GP A opening the shared referral; GP B refused by the network despite holding the ciphertext; the physiotherapist refused after withdrawal; a lone steward's self-grant stuck at one of two approvals. Synthetic data only.

## Setup

See [care-passport/docs/SETUP.md](care-passport/docs/SETUP.md): Node.js, Docker, local
TideCloak on port 8080 and the app on port 4300. The demo video will be at
[`demo.mp4`](demo.mp4).

More: [architecture](care-passport/docs/ARCHITECTURE.md) ·
[Tide integration](care-passport/docs/TIDE-INTEGRATION.md) ·
[API](care-passport/docs/API-SPEC.md) · [demo script](care-passport/docs/DEMO-SCENARIOS.md) ·
[security checks](care-passport/docs/SECURITY-ACCEPTANCE.md)
