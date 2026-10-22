import { withAuth } from "@/lib/auth/protect";
import { apiError, clinicians, identityOf, json } from "@/server/identity";

export const GET = withAuth(async (_req, jwt) => {
  if (identityOf(jwt).profile.kind !== "patient") return apiError(403, "forbidden");
  return json({ clinicians: clinicians() });
});
