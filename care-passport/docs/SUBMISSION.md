# Care Passport — Submission Requirements

## Repository Structure (must match)

```
/care-passport
  ├── README.md                  # Must start with template, 300 words max
  ├── docs/
  │   ├── ARCHITECTURE.md
  │   ├── DESIGN.md
  │   ├── API-SPEC.md
  │   ├── TIDE-INTEGRATION.md
  │   ├── DEMO-SCENARIOS.md
  │   └── SUBMISSION.md
  ├── src/                       # Source code (any framework)
  │   └── ... (your implementation)
  └── demo.mp4                   # 2-minute demo video (< 100 MB)
```

## README Template (copy to top of README.md)

```markdown
[![Built with TideCloak](https://tide.org/badges/built-with-tidecloak.svg)](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked)

## Project overview

_One-sentence description: Care Passport — patient-controlled selective sharing of health records with clinicians via TideCloak emergent authority._

Built with [TideCloak](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked).

### 1. Vision & originality
<!-- What new product, service, experience or way of working are you proposing? What makes your idea distinctive? -->
We propose a patient-controlled health-record system where selective sharing replaces full-disclosure transfers. Patients decide exactly which records each clinician can access, with revocable, role-scoped permissions.

### 2. Trust constraint insight
<!-- What is difficult, risky or impossible today because trust, privacy or security gets in the way? Explain what becomes possible when that constraint is removed. -->
Today, sharing health records means handing over entire medical history to each provider, requiring trust in that provider and the platform. Removing this constraint enables precise, revocable access — patients control who sees what, and when.

### 3. Value & impact
<!-- Who would benefit, and how would their lives or work improve? Give a concrete example of why this matters. -->
Patients benefit from privacy and control. Clinicians benefit from relevant data without noise. Example: A patient gives a GP access to their referral but revokes a physiotherapist's access after 2 weeks — no more than-necessary data sharing, no permanent handover of full history.

### 4. Why TideCloak matters
<!-- How does your application use TideCloak, and how does that integration help enable your idea? Connect the technology to the possibility you are demonstrating. -->
TideCloak provides the emergent authority layer: decryption keys are bound to patient identity + clinician role + patient consent. Without TideCloak, we'd need a trusted central server to manage keys — introducing a single point of failure and privacy risk. TideCloak enables true patient control without requiring trust in the platform operator.

### 5. Prototype & storytelling
<!-- What does your prototype demonstrate today? Describe the key interaction judges should look for. -->
The demo shows three 20-second scenarios: (1) patient shares a referral with a GP, (2) patient revokes a physiotherapist's access, (3) a physiotherapist attempts to access a referral they're not authorized for. Judges should see the TideCloak-enforced access control in action — specifically, the immediate revocation and role-based denial.
```

## Submission Checklist

- [ ] Public GitHub repository
- [ ] README.md starts with template (copied from tide.org)
- [ ] README ≤ 300 words total
- [ ] All docs/ files present and filled
- [ ] demo.mp4 ≤ 100 MB, .mp4 format
- [ ] Video covers 3 scenarios from DEMO-SCENARIOS.md
- [ ] TideCloak integrated (visible in code, not just wrapper)
- [ ] Synthetic/mocked data used (no real PHI)
- [ ] Submission form: https://forms.gle/HRHYjnqB86j1LFS97

## Deadlines

| Vùng | Thời gian |
|------|-----------|
| **Vietnam** | Thứ 22/10/2026, 18:00 (UTC+7) |
| **Malaysia** | Thứ 22/10/2026, 18:00 (local) |
| **Melbourne** | Năm 23/10/2026, 10:00 AEDT (UTC+11) |

## Tide Resources to Cite

- TideCloak docs: https://docs.tide.org/
- Emergent Authority blog: https://tide.org/blog/emergent-authority-beyond-cybersecurity
- MCP walkthrough: https://youtu.be/z0o-B3258Cg