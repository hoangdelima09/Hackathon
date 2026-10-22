# Care Passport — Interaction design

Status: design specification, not a rendered or tested interface. Keep the MVP
focused on the patient's care handoff and the clinician's authorized reading.
Security outcomes come from the [integration](TIDE-INTEGRATION.md), not UI labels.

## Information architecture

- Patient: **My records**, **Sharing**, **Activity**. Show named recipients and their
  roles together, such as “Dr Alex — GP (demo identity)”.
- Clinician: **Shared with me**. Return only records whose care group is in this person's
  verified `groups` claim. A separate, clearly labelled **Leaked-copy test** panel lets a
  clinician try any record id, to show that the Tide network refuses non-members.
- Stewards: `/steward` signs one policy per record and lists patient requests. Governed
  changes (group membership, roles) are made and approved in the TideCloak console.
  Do not build a "view all patient data" screen.
- Display “Synthetic demonstration data” consistently. A role picker is a filter
  over enrolled recipients, never a way to authenticate as that role.

Decrypt titles only when authorized; until then show a neutral “Protected record”
label. Do not put clinical titles in URLs, notifications, analytics or error text.

## Primary flows

**Share:** My records → choose one record → choose a named clinician → choose a purpose
from a short list → review → **Request access** → status “Waiting for 2 of 3 steward
approvals in TideCloak” → receipt (recipient, record, purpose, requested time). Never
show “access granted” from the app row: access starts when TideCloak commits the
membership change and the clinician signs in again. No custom-role entry and no “all
GPs” option. Do not persist plaintext or secrets in browser storage.

**Withdraw:** Sharing → choose the exact recipient/record → “Withdraw future access”
→ confirmation: “Stop new access to this record for Dr Alex? Copies already viewed
cannot be erased.” Buttons: “Keep access” and “Withdraw access”; focus the safe action
first. Afterwards show: “Withdrawal requested. Access continues until two stewards
approve and Dr Alex's session refreshes.” Re-sharing is a new request.

**Read:** Shared with me → open record → decrypt in the browser → display. If the network
refuses, clear any shown content and display the refusal `cause` text in an alert (for
example “not in this record's care group”), then report it to `/api/events`. Never fall
back to cached plaintext.

## Data component state matrix

| State | Records / sharing list | Share or withdraw action | Record viewer / activity |
|---|---|---|---|
| First-use empty | “No records yet” + Create synthetic record; clinician: “No records have been shared with you” | Explain that a record is needed before sharing | Activity: “No sharing activity yet” |
| No matches | Show the active filter + Clear filters | Recipient search: “No enrolled clinicians match” | Activity filter has its own clear action |
| All access ended | “No active shares. Past consents are in Activity” | A fresh share is available | Retain only metadata the viewer remains entitled to see |
| Initial loading | Stable skeleton, no fake records | Show progress and prevent duplicate submission | “Checking access…”; no plaintext |
| Refresh / stale | Keep safe metadata with last-checked time | Show the existing request instead of creating a duplicate | Suspend stale sensitive content until decryption succeeds again |
| Pending | Show the exact recipient and pending action | “Waiting for 2 of 3 steward approvals” / “Withdrawal requested; access may still work” | Never label a request as granted or revoked |
| Partial failure | Keep successful sections; retry the failed section | Preserve safe input; show the failed step | Failed activity load must not erase record state |
| Recoverable error | “Couldn't load your records. Try again.” + Retry | “Couldn't confirm the change. Check its status.” + Check status | “Access could not be verified” + Retry; fail closed |
| Signed out | Explain session expiry and offer Sign in | Re-authenticate, then recheck operation outcome | Clear decrypted content and keys under application control |
| Denied / revoked / expired | Show reason only where caller may know the record | Explain no active permission; owner can create a new share | “This record is unavailable to your account” for undiscoverable records |
| Offline | Safe metadata may remain marked out of date | Do not queue consent changes invisibly or claim success | No new decryption; explain that connection is required |
| Success | Show confirmed status and effective timestamp | Receipt and visible return action | Content only after actual decryption; audit source labelled accurately |
| Many items | Pagination and item count | Search named recipients | Paginated activity |

A client view cleared after withdrawal is helpful behavior, not proof that another
person's copy disappeared. Remove the old “Decrypt again in 24h” text: each fresh
protected operation must follow current consent rules, not a display timer.

## Forms and feedback

Use visible labels and a single-column layout. Validate expiry/recipient on blur and
submission; focus the first invalid field. Disable the submit control only while
its request is being handled. Keep failures visible until resolved or dismissed.
Acknowledge clicks promptly; show progress during longer waits. After roughly ten
seconds, show “Still waiting for confirmation” with a safe status-check action.
Closing the panel does not cancel a submitted protected operation; say so.

Translate known API errors into action-oriented text. Do not display raw server
messages, ciphertext, tokens or stack traces. No success toast before enforcement.

## Accessibility and visual direction

Use neutral surfaces, dark body text and a restrained blue accent. The previous
palette is a suggestion, not an official Tide brand specification. MVP priority is
one readable light theme; dark mode is optional.

Use semantic buttons/forms, keyboard-operable dialogs, visible focus, focus return
to the trigger, and labelled inputs. Announce asynchronous results with an appropriate
live region. Pair status colours with text. Target at least 4.5:1 contrast for normal
text and 3:1 for large text and relevant control boundaries. Use 44×44 CSS-pixel
interaction targets as a product usability target. Verify contrast in the rendered
interface; a colour list alone does not establish accessibility.

At 320 CSS pixels wide, keep forms single-column, allow page scrolling with the
keyboard open and avoid hover-only actions. Respect reduced motion. Before calling
the UI complete, walk first-use, no-permission, slow-network and partial-failure
flows by keyboard. These are planned checks; no UI exists to execute them yet.
