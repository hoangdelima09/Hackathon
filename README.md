[![Built with TideCloak](https://tide.org/badges/built-with-tidecloak.svg)](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked)

## Project overview

_Care Passport lets a patient share one health record with one named clinician, then withdraw it, while no server, operator or single administrator can read or widen that access._

Built with [TideCloak](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked).

### 1. Vision & originality

A patient-held passport for care handoffs: share a referral with a GP and a care plan with a physiotherapist, keep pathology private, and end access when therapy ends. Distinctive: Tide's network enforces access per record, and no single party, operator included, can widen it.

### 2. Trust constraint insight

Platforms that store records can usually read them, and one privileged administrator can quietly grant themselves access. So selective, revocable sharing still means trusting the operator. Removing that unilateral authority makes it credible.

### 3. Value & impact

Patients disclose only what each clinician needs and can stop future access without trusting the platform. Clinicians receive exactly what a handoff requires.

### 4. Why TideCloak matters

Each record has its own care group and a policy for Tide's built-in `RelationshipAttestation` contract. The patient encrypts in the browser; Tide's ORK network releases decryption only to group members holding the decrypt role. Joining a group is a TideCloak IGA change request needing two of three stewards. With ordinary login and database permissions, whoever controls the database or console could read or re-share everything.

### 5. Prototype & storytelling

Status: the TideCloak integration is built and runs against a licensed local realm, but the free-tier licence refused every Tide account after the first. So the demo runs in a clearly labelled **simulated mode** mirroring the contract's checks ([SIMULATION](care-passport/docs/SIMULATION.md), [EVIDENCE](care-passport/docs/EVIDENCE.md)). Watch for: GP A opening the referral after two approvals; GP B refused despite holding the ciphertext; the physiotherapist refused after withdrawal; a lone steward stuck at one of two. Synthetic data only.

## Setup

Real TideCloak: see [care-passport/docs/SETUP.md](care-passport/docs/SETUP.md) (Node.js,
Docker, local TideCloak on port 8080, app on port 4300). Simulated mode, no TideCloak needed:
`cd care-passport && npm ci && npm run dev:sim`, then open
`http://localhost:4300/?as=patient-a` (one tab per identity). Demo video: [`demo.mp4`](demo.mp4).

More: [architecture](care-passport/docs/ARCHITECTURE.md) ·
[Tide integration](care-passport/docs/TIDE-INTEGRATION.md) ·
[API](care-passport/docs/API-SPEC.md) · [simulated mode](care-passport/docs/SIMULATION.md) · [demo script](care-passport/docs/DEMO-SCENARIOS.md) ·
[security checks](care-passport/docs/SECURITY-ACCEPTANCE.md)
