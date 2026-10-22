# Care Passport — API Specification

## Base URL
`/api/care-passport` (TideCloak-enhanced endpoints)

## Authentication
All endpoints require valid TideCloak session token (`Authorization: Bearer <tide-token>`)

## Endpoints

### GET /records
List all patient records with sharing status.

**Query params:**
- `type` (optional): "referral" | "pathology" | "care-plan"
- `sharedWith` (optional): filter by clinician role

**Response:**
```json
{
  "records": [
    {
      "id": "rec_001",
      "title": "Referral - Dr. Smith",
      "type": "referral",
      "sharedWith": ["GP"],
      "sharedAt": "2024-03-15T10:30:00Z",
      "expiresAt": null,
      "accessCount": 2
    }
  ]
}
```

### POST /records/:id/share
Share a record with a clinician role.

**Body:**
```json
{
  "clinicianRole": "GP",
  "expiresAt": "2024-04-15T10:30:00Z" (ISO string, optional)
}
```

**Response:**
```json
{
  "shareId": "share_001",
  "status": "pending_patient_approval",
  "message": "Share request sent to patient"
}
```

### POST /records/:id/approve
Patient approves a share request.

**Body:**
```json
{
  "approve": true
}
```

**Response:**
```json
{
  "status": "active",
  "decryptionKeyValidUntil": "2024-04-15T10:30:00Z"
}
```

### POST /records/:id/revoke
Revoke clinician access.

**Body:**
```json
{
  "shareId": "share_001"
}
```

**Response:**
```json
{
  "status": "revoked",
  "message": "Clinician can no longer decrypt this record"
}
```

### GET /records/:id
Decrypt and return a specific record (clinician only).

**Headers:**
- `Clinician-Role`: "GP" | "Physio" | etc.

**Response (if authorized):**
```json
{
  "record": {
    "id": "rec_001",
    "title": "Referral - Dr. Smith",
    "content": "Patient should see cardiologist within 2 weeks...",
    "decryptedAt": "2024-03-18T14:20:00Z"
  }
}
```

**Response (if not authorized):**
```json
{ "error": "access_denied", "message": "Your role does not authorize access to this record" }
```

### GET /audit/log
Get access audit log (patient only).

**Response:**
```json
{
  "logs": [
    {
      "recordId": "rec_001",
      "clinicianRole": "GP",
      "action": "granted_access",
      "timestamp": "2024-03-18T14:20:00Z",
      "ipfsHash": "bafybeigdwn..."
    }
  ]
}
```