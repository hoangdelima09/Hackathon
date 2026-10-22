// A contract refusal surfaces as TIDE-TIDEJS-NET-THRESHOLD_FAILURE ("Could not reach enough VVK
// ORKs"). That IS the refusal, not an outage: the contract's own message is in `cause`.

export function tideErrorText(err: unknown): string {
  const parts: string[] = [];
  let cur: unknown = err;
  for (let depth = 0; cur && depth < 4; depth++) {
    if (typeof cur === "string") {
      parts.push(cur);
      break;
    }
    const e = cur as { message?: unknown; cause?: unknown; errors?: unknown };
    if (typeof e.message === "string") parts.push(e.message);
    else parts.push(safeJson(cur));
    if (Array.isArray(e.errors)) parts.push(...e.errors.map((x) => (typeof x === "string" ? x : safeJson(x))));
    cur = e.cause;
  }
  return [...new Set(parts.filter(Boolean))].join(" — ");
}

/** A plain-language reading of the network's refusal, shown next to the raw text. */
export function refusalReason(text: string): string {
  if (/group not found in doken/i.test(text)) return "Not a member of this record's care group";
  if (/_tide_decryptor'? role not found/i.test(text)) return "Missing the decrypt role (_tide_decryptor)";
  if (/_tide_encryptor'? role not found/i.test(text)) return "Missing the encrypt role (_tide_encryptor)";
  if (/not found in list of roles/i.test(text)) return "The record's policy does not permit this operation";
  if (/Tags do not contain assignmentId|tagged with the assignmentId/i.test(text)) return "Wrong record tag";
  if (/subjectId does not match/i.test(text)) return "Not the user this policy names";
  if (/expired/i.test(text)) return "Policy or session expired";
  if (/THRESHOLD_FAILURE|enough VVK ORKs/i.test(text)) return "Refused by the Tide network";
  return "Request failed";
}

function safeJson(v: unknown) {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
