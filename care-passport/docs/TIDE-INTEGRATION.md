# Care Passport — TideCloak Integration

## Integration Pattern: Session-Bound Emergent Authority

### 1. Patient Identity (Onboarding)
```javascript
// Patient enters on first visit
const patient = await tide.clients.create({
  // No password — identity is wallet-based
  // Attributes: name, role (patient), issuedAt
});

// Patient gets unique DID (Decentralized Identifier)
console.log(patient.did); // did:tide:...
```

### 2. Record Encryption & Storage
```javascript
// When patient uploads a record
const record = await tide.records.encryptAndStore({
  title: "Referral - Dr. Smith",
  content: syntheticReferralContent, // or IPFS hash
  // Encryption: key derived from patient session + clinician role pattern
  accessPattern: "role-scoped", // GP, Physio, etc.
  // TideCloak automatically:
  // - Generates per-record encryption key
  // - Binds key to patient identity + clinician role
  // - Stores metadata only (ciphertext on IPFS/DB)
});
```

### 3. Clinician Access Flow
```javascript
// Clinician authenticates with their role
const clinician = await tide.clinicians.authenticate({
  role: "GP", // Their TideCloak role
  // No password — role is cryptographically verified
});

// Patient reviews access request on dashboard
// Patient clicks "Grant" → TideCloak generates decryption key
const grant = await tide.access.grant({
  recordId: "rec_001",
  toRole: "GP",
  // Key is: f(patient_session_key, clinician_role, timestamp)
  // Invalidated immediately if patient revokes
});

// Clinician can now decrypt
const decrypted = await tide.decrypt({
  recordId: "rec_001",
  clinicianRole: "GP"
});
// Returns plaintext only if role matches + key valid
```

### 4. Revocation (Patient Power)
```javascript
// Patient revokes access at any time
await tide.access.revoke({
  recordId: "rec_001",
  fromRole: "GP"
});

// Immediate effect: decryption key invalidated
// Clinician tries decrypt → "access_denied"
// Audit log updated: "access revoked by patient"
```

### 5. Policy Enforcement Examples

```javascript
// Policy: GP can only decrypt referral records, not pathology
tide.policies.define({
  target: "records",
  effect: "decrypt",
  when: {
    role: "GP",
    // Allow only if record.type === "referral"
    condition: (record) => record.type === "referral"
  },
  // Otherwise: access_denied
});

// Policy: Patient can revoke any clinician access
tide.policies.define({
  target: "access",
  effect: "revoke",
  by: "patient",
  always: true // Patient always has revoke power
});
```

### 6. Emergent Authority Guarantees
| Scenario | TideCloak Behavior |
|----------|-------------------|
| **Admin tries to read all records** | ❌ Cannot — no master key; keys bound to patient+clinician |
| **Clinician tries other clinician's records** | ❌ Denied — role-scoped keys only |
| **Patient revokes Physio access** | ✅ Immediate — Physio can no longer decrypt |
| **Platform goes offline** | ✅ Patient still owns keys; can decrypt locally with recovery phrase |
```