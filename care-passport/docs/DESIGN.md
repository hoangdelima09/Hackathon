# Care Passport — Design

## UI Principles

### 1. Patient-Centric
- Primary view: patient's records + sharing state
- Clear visual indication: "Shared with GP", "Shared with Physio (expires in 7 days)"
- One-click revoke on any active share

### 2. Role-Aware UI
- Different views for patient vs clinician
- Clinician sees only authorized records + "view reason" field

### 3. Synthetic Data Friendly
- Demo uses mock records (no real PHI)
- Record types: "Referral", "Pathology Result", "Care Plan"
- Each has consistent UI card design

## Information Architecture

### Record Card (Patient Dashboard)
```
+------------------------------------------+
| 📄 Referral - Dr. Smith                  |
| 🔐 Encrypted · Only you can decrypt      |
| ✏️ Share · ❌ Revoke                     |
+------------------------------------------+

+------------------------------------------+
| 📊 Pathology Result - 2024-03-15         |
| 🔐 Encrypted · Access: 1 clinician       |
| ✏️ Share · ❌ Revoke                     |
+------------------------------------------+
```

### Share Dialog
```
Select record → Select clinician role → Set expiry → Confirm
- GP (General Practitioner)
- Physio (Physiotherapist)  
- Cardiologist
- Custom role
```

### Clinician View
```
Record: "Referral - Patient X"
Status: ✅ Decrypted (your role authorized)
Decrypt again in: 24h
Purpose: Initial consultation
```

## Color Scheme (Light/Dark Support)
- Primary: Tide blue (#0a84ff)
- Success: Green (#22c55e)
- Warning: Orange (#f6e05e)
- Error: Red (#f87171)
- Background: Slate gray gradient