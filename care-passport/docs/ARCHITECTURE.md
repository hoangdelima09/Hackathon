# Care Passport — Architecture

## Overview
A patient-controlled health-record application where patients selectively share referrals, pathology results, or care plans with specific clinicians. **TideCloak** provides session-bound end-to-end encryption and clinician-role enforcement, ensuring the platform operator cannot read any patient data.

The prototype uses synthetic records only. Record plaintext is created or encrypted
in the patient client. The API stores metadata and ciphertext; it never returns
plaintext to the platform operator.

## Key Components

### 1. Client (Frontend)
- **Patient Dashboard**: View own records, manage sharing permissions
- **Record Viewer**: Decrypt and display shared records (only when authorized)
- **Share Dialog**: Select record + clinician, set access duration
- **Role Manager**: View/revoke active clinician accesses

### 2. TideCloak Layer
- **Identity**: Patient wallet (no password/database on server)
- **Policies**: Per-record encryption keys tied to clinician roles
- **Access**: `decrypt(record)` only succeeds when caller's role matches authorized clinician
- **Emergent Authority**: No single admin key — access requires patient approval + role alignment

### 3. Data Flow
```
Patient creates record
  → Client encrypts synthetic content through TideCloak
  → Store metadata and ciphertext in DB/IPFS

Clinician Access Request
  → Clinician authenticates via TideCloak (role: "GP", "Physio", etc.)
  → Patient reviews request on dashboard
  → Patient grants access → TideCloak issues a record-scoped capability
  → Clinician client decrypts only that specific record
  → Patient can revoke → capability is rejected immediately

Audit
  → Every access logged: who, which record, timestamp, reason
  → Append-only access events are recorded; patient sees the audit history
```

The exact key derivation and storage mechanism is delegated to TideCloak. The
application must not derive keys directly from predictable values such as a patient
ID, role, or timestamp.

## Trust Model

| Actor | Capability | Limitation |
|-------|-----------|-----------|
| **Patient** | Controls all record access, can revoke at any time | Cannot be bypassed by admin |
| **Clinician** | Can decrypt only authorized records, role-scoped | Cannot access other clinicians' records or patient's full history |
| **Platform Operator** | Infrastructure only, no decryption keys | Cannot read any patient data without patient-generated keys |
| **TideCloak Network** | Enforces policies, routes decryption requests | No master key; authority emerges from patient+clinician alignment |