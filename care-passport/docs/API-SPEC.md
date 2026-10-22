# Care Passport — API Specification

## Base URL
`/api/care-passport` (TideCloak-enhanced endpoints)

## Authentication
All endpoints require valid TideCloak session token (`Authorization: Bearer <tide-token>`)

The authenticated subject and clinician role are read from the TideCloak session. The
API must not trust a client-supplied `Clinician-Role` header. Every endpoint also
enforces ownership: patients can manage only their own records and shares, while
clinicians can request or read only records exposed to their authenticated role.

Unless stated otherwise, successful responses use `2xx` status codes. Errors use this
shape:

```json
{
  "error": "access_denied",
  "message": "Your role does not authorize access to this record"
}
```

Common errors are `400 invalid_request`, `401 unauthenticated`, `403 access_denied`,
`404 not_found`, and `409 share_conflict`.

## Endpoints

### POST /records
Create a synthetic patient record. The client encrypts the content before sending it;
the API stores metadata and ciphertext only.

**Body:**
```json
{
  "title": "Referral - Dr. Smith",
  "type": "referral",
  "ciphertext": "<encrypted-payload>",
  "contentType": "text/plain"
}
```

`type` is one of `referral`, `pathology`, or `care-plan`. The response returns the
record ID and metadata, never plaintext content.

**Response:**
```json
{
  "record": {
    "id": "rec_001",
    "title": "Referral - Dr. Smith",
    "type": "referral",
    "status": "private"
  }
}
```

### GET /records
List the authenticated patient's record metadata and sharing status. Clinicians receive
only records they are already authorized to discover.

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
      "status": "active",
      "shares": [
        {
          "shareId": "share_001",
          "clinicianRole": "GP",
          "status": "active",
          "sharedAt": "2024-03-15T10:30:00Z",
          "expiresAt": null
        }
      ],
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
  "expiresAt": "2024-04-15T10:30:00Z"
}
```

**Response:**
```json
{
  "shareId": "share_001",
  "status": "pending_patient_approval"
}
```

This endpoint is used when a clinician requests access. A patient-initiated share may
skip the pending state and become `active` after the patient authorization succeeds.
The same record cannot have two active shares for the same authenticated clinician
role.

### POST /records/:id/approve
Patient approves a share request.

**Body:**
```json
{
  "shareId": "share_001",
  "approve": true
}
```

**Response:**
```json
{
  "status": "active",
  "expiresAt": "2024-04-15T10:30:00Z"
}
```

When `approve` is `false`, the share becomes `denied` and no key or capability is
issued.

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
Return a specific record for an authorized clinician. The API returns ciphertext or a
TideCloak decryption capability; plaintext decryption happens in the authorized
client/session. This preserves the claim that the platform operator cannot read the
record.

**Response (if authorized):**
```json
{
  "record": {
    "id": "rec_001",
    "title": "Referral - Dr. Smith",
    "ciphertext": "<encrypted-payload>",
    "contentType": "text/plain",
    "decryption": {
      "status": "authorized",
      "expiresAt": "2024-04-15T10:30:00Z"
    }
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
      "actorId": "did:tide:clinician-001",
      "reason": "Initial consultation",
      "shareId": "share_001"
    }
  ]
}
```

Audit entries are append-only. The patient can view them; operators can monitor
operational metadata but cannot decrypt record content.