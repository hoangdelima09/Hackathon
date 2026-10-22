import { withAuth } from "@/server/auth";
import { identityOf, json } from "@/server/identity";
import { withDb } from "@/server/store";

// Patient: own records. Anyone else: records whose care group is in their VERIFIED groups claim.
// This only decides what to list. The Tide network decides who can decrypt.
export const GET = withAuth(async (_req, jwt) => {
  const id = identityOf(jwt);
  const records = await withDb((db) =>
    db.records
      .filter((r) => r.owner === id.username || id.groups.includes(r.group))
      .map((r) => ({
        id: r.id,
        label: r.label,
        group: r.group,
        owner: r.owner,
        ciphertext: r.ciphertext,
        updatedAt: r.updatedAt,
        policy: db.policies.find((p) => p.recordId === r.id)?.policy ?? null,
      }))
  );
  return json({ records });
});
