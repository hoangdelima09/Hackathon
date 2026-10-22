# Care Passport — Architecture

## Overview
A patient-controlled health-record application where patients selectively share referrals, pathology results, or care plans with specific clinicians. **TideCloak** provides session-bound end-to-end encryption and clinician-role enforcement, ensuring the platform operator cannot read any patient data.

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
Patient Upload
  → Record encrypted with patient's TideCloak session key
  → Store metadata (title, type, synthetic content) in DB
  → Encryption keys derived from: patient_id + clinician_role + expiry

Clinician Access Request
  → Clinician authenticates via TideCloak (role: "GP", "Physio", etc.)
  → Patient reviews request on dashboard
  → Patient grants access → TideCloak generates decryption key: f(patient_key, clinician_role, timestamp)
  → Clinician can decrypt only that specific record
  → Patient can revoke → key invalidated immediately

Audit
  → Every access logged: who, which record, timestamp, reason
  → Logs encrypted, only patient can view summary
```

## Trust Model

| Actor | Capability | Limitation |
|-------|-----------|-----------|
| **Patient** | Controls all record access, can revoke at any time | Cannot be bypassed by admin |
| **Clinician** | Can decrypt only authorized records, role-scoped | Cannot access other clinicians' records or patient's full history |
| **Platform Operator** | Infrastructure only, no decryption keys | Cannot read any patient data without patient-generated keys |
| **TideCloak Network** | Enforces policies, routes decryption requests | No master key; authority emerges from patient+clinician alignment |