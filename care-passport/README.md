[![Built with TideCloak](https://tide.org/badges/built-with-tidecloak.svg)](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked)

# Care Passport

Care Passport is a patient-controlled way to share only the health records a clinician
needs, with role-scoped access and patient-controlled revocation.

Built with [TideCloak](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked).

## Why it matters

Patients often have to hand over more medical history than a consultation requires.
Care Passport lets a patient share one referral with a GP, keep unrelated records
private, and revoke access without asking a platform administrator.

## What the prototype demonstrates

The two-minute demo covers three synthetic-data scenarios:

1. A patient shares a referral with a GP.
2. The patient revokes a physiotherapist's access.
3. A physiotherapist attempts to access a referral authorized only for the GP.

TideCloak provides the authenticated identity, clinician-role policy, consent-bound
access, and revocation decision. The application stores metadata and encrypted
payloads; it does not use real protected health information.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API specification](docs/API-SPEC.md)
- [TideCloak integration](docs/TIDE-INTEGRATION.md)
- [Demo scenarios](docs/DEMO-SCENARIOS.md)
- [Design](docs/DESIGN.md)
- [Submission checklist](docs/SUBMISSION.md)