# Care Passport — app folder

The project overview for judges is in the [root README](../README.md). This folder holds
the Next.js app (from Tide's `nextjs-customer-portal` template, once scaffolded) and the
project docs.

## Run locally

Full steps, including the one-time TideCloak bootstrap and demo identities, are in
[docs/SETUP.md](docs/SETUP.md). Short version, after setup:

```bash
npm run dev    # http://localhost:3100 (TideCloak on http://localhost:8080)
```

## Docs

| File | Purpose |
|---|---|
| [BUILD-PLAN](docs/BUILD-PLAN.md) | Today's plan, human-only steps, agent prompt (Vietnamese) |
| [TIDE-INTEGRATION](docs/TIDE-INTEGRATION.md) | `RelationshipAttestation:1` per-record groups, gates, Plan B |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Components, access model, flows, limits |
| [API-SPEC](docs/API-SPEC.md) | MVP routes and store |
| [DESIGN](docs/DESIGN.md) | Screens, flows, states |
| [SECURITY-ACCEPTANCE](docs/SECURITY-ACCEPTANCE.md) / [EVIDENCE](docs/EVIDENCE.md) | Checks and measured results |
| [DEMO-SCENARIOS](docs/DEMO-SCENARIOS.md) | Two-minute video script and export |
| [SUBMISSION](docs/SUBMISSION.md) | Organiser requirements, deadline, form |
| [REVIEW](docs/REVIEW.md) | Review findings (Vietnamese) |

All people and records are synthetic.
