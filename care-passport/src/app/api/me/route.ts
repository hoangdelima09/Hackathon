import { withAuth } from "@/server/auth";
import { identityOf, json } from "@/server/identity";

export const GET = withAuth(async (_req, jwt) => {
  const id = identityOf(jwt);
  return json({
    username: id.username,
    displayName: id.profile.displayName,
    kind: id.profile.kind,
    groups: id.groups,
    cryptoRoles: id.cryptoRoles,
    isSteward: id.isSteward,
  });
});
