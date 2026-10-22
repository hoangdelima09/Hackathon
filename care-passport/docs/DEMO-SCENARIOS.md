# Care Passport — Demo Scenarios (2-Minute Video Structure)

The video contains three scenarios totaling two minutes: 60 seconds, 30 seconds,
and 30 seconds. All records and identities are synthetic.

## Scenario 1: Share Referral with GP (1 min)
### Setup
- Patient has "Referral - Dr. Smith" record encrypted
- GP clinician logged in via TideCloak

### Action
1. Patient opens dashboard → sees "Referral" card
2. Patient clicks "Share" → selects "GP" role → confirms
3. GP receives notification (simulated) → can now decrypt
4. GP clicks "View" → record displays: "Patient should see cardiologist within 2 weeks"

### Key TideCloak Moment
- GP's decryption key was: bound to their "GP" role + patient's consent
- If patient revokes: GP immediately gets "access_denied"

### What Changes for User
- Patient doesn't hand over full medical history
- GP only sees relevant referral (not entire record collection)
- Patient can cut off access anytime without admin approval

---

## Scenario 2: Withdraw Physio Access (30 sec)
### Setup
- Patient previously shared a record with "Physio" role
- Physio has decrypted and viewed the record

### Action
1. Patient opens dashboard → sees active share with Physio
2. Patient clicks "Revoke" next to Physio share
3. Physio (in demo) tries to re-access → fails with "access_denied"
4. Audit log shows: "Access revoked by patient at 14:32"

### Key TideCloak Moment
- Revocation is immediate and irreversible without patient action
- No need to contact platform admin or submit support ticket

### What Changes for User
- Patient has true control, not just "administrative permission"
- No dependency on platform responsiveness
- Trust model shifts from "trust platform" to "verify via cryptography"

---

## Scenario 3: Clinician Different Role (30 sec)
### Setup
- Same record shared with GP only
- Physio tries to access

### Action
1. Physio authenticates with their role
2. Attempts to decrypt the referral record
3. Gets: "access_denied — Your role (Physio) does not authorize access to referral records"
4. GP can still access (their role is authorized)

### Key TideCloak Moment
- Role-based policy enforcement at cryptographic level
- No "backdoor" or master key that bypasses roles

### What Changes for User
- Clear, enforceable boundaries between provider types
- Reduces risk of over-access or snooping
- Supports compliance with role-separation policies
```