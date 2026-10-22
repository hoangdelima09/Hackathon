#!/usr/bin/env bash
# Bootstrap-only: create the synthetic demo identities, their crypto roles and care-group
# memberships, then print one Tide invite link per user (the realm is invite-only).
#
# Must run while the realm is still in FirstAdmin mode, i.e. BEFORE any user holds
# tide-realm-admin (init grants it last). After that flip every governed change needs an
# enclave approval in the TideCloak console instead. Safe to re-run: existing users,
# roles and memberships are skipped. Uses the master-admin credential from .env (AP-41:
# bootstrap scripts only, never app code).
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
[ -f "$PROJECT_DIR/.env" ] && { set -a; . "$PROJECT_DIR/.env"; set +a; }
: "${KC_BOOTSTRAP_ADMIN_PASSWORD:?KC_BOOTSTRAP_ADMIN_PASSWORD is not set (see .env)}"
KC_BOOTSTRAP_ADMIN_USERNAME="${KC_BOOTSTRAP_ADMIN_USERNAME:-admin}"
TIDECLOAK_URL="${TIDECLOAK_URL:-http://localhost:8080}"
REALM="${REALM_NAME:-care-passport}"
API="$TIDECLOAK_URL/admin/realms/$REALM"

# username : realm roles (comma separated) : groups (comma separated)
USERS=(
  "patient-a:_tide_encryptor,_tide_decryptor:/pa-referral,/pa-careplan,/pa-pathology"
  "gp-a:_tide_decryptor:"
  "gp-b:_tide_decryptor:"
  "physio-a:_tide_decryptor:/pa-careplan"
  "steward-b::"
  "steward-c::"
)

token() {
  curl -s -X POST "$TIDECLOAK_URL/realms/master/protocol/openid-connect/token" \
    -d client_id=admin-cli -d grant_type=password \
    --data-urlencode "username=$KC_BOOTSTRAP_ADMIN_USERNAME" \
    --data-urlencode "password=$KC_BOOTSTRAP_ADMIN_PASSWORD" | jq -r .access_token
}
get() { curl -s "$API$1" -H "Authorization: Bearer $(token)"; }
send() { curl -s -o /dev/null -w '%{http_code}' -X "$1" "$API$2" -H "Authorization: Bearer $(token)" -H "Content-Type: application/json" ${3:+-d "$3"}; }

approve_all_pending() {
  local ids ready id pass
  ids=$(get "/iga/change-requests?status=PENDING" | jq -r 'if type=="array" then (.[] | select(.actionType | IN("DISABLE_IGA","DELETE_REALM","OFFBOARD_REALM") | not) | .id) else empty end')
  for id in $ids; do send POST "/iga/change-requests/$id/authorize" '{}' >/dev/null || true; done
  for pass in 1 2 3 4 5; do
    ready=$(get "/iga/change-requests?status=PENDING" | jq -r 'if type=="array" then (.[] | select(.actionType | IN("DISABLE_IGA","DELETE_REALM","OFFBOARD_REALM") | not) | select(.readyToCommit==true) | .id) else empty end')
    [ -z "$ready" ] && break
    for id in $ready; do send POST "/iga/change-requests/$id/commit" >/dev/null; done
  done
  local left
  left=$(get "/iga/change-requests?status=PENDING" | jq 'if type=="array" then length else 0 end')
  [ "$left" = "0" ] || echo "    WARN: $left change request(s) still pending"
}

user_id() { get "/users?username=$1&exact=true" | jq -r '.[0].id // empty'; }

# Refuse to run after the multi-admin flip: approvals would then need the enclave.
RM_CLIENT=$(get "/clients?clientId=realm-management" | jq -r '.[0].id')
ADMINS=$(get "/clients/$RM_CLIENT/roles/tide-realm-admin/users" | jq 'if type=="array" then length else 0 end')
if [ "$ADMINS" != "0" ]; then
  echo "STOP: a user already holds tide-realm-admin (multi-admin mode)." >&2
  echo "      Make these changes in the TideCloak console and approve them in the enclave." >&2
  exit 3
fi

echo "==> Users"
for spec in "${USERS[@]}"; do
  IFS=: read -r name _ _ <<<"$spec"
  if [ -n "$(user_id "$name")" ]; then echo "    $name exists"; continue; fi
  # Fictional demo characters: names from fixtures/directory.json, and an address on the
  # reserved .invalid TLD (RFC 2606) because the realm's user profile requires an email.
  # tideInvitable lets TideCloak issue an invite link for the user.
  display=$(jq -r --arg u "$name" '.[$u].displayName // $u' "$PROJECT_DIR/fixtures/directory.json")
  body=$(jq -nc --arg u "$name" --arg d "$display" '{
    username: $u, enabled: true, emailVerified: false,
    email: ($u + "@care-passport.invalid"),
    firstName: ($d | split(" ") | .[0:-1] | join(" ") | if . == "" then $d else . end),
    lastName: ($d | split(" ") | .[-1]),
    attributes: { tideInvitable: ["true"] } }')
  code=$(send POST "/users" "$body")
  echo "    $name create → HTTP $code"
done
approve_all_pending

echo "==> Crypto roles"
for spec in "${USERS[@]}"; do
  IFS=: read -r name roles _ <<<"$spec"
  [ -z "$roles" ] && continue
  uid=$(user_id "$name"); [ -z "$uid" ] && { echo "    $name missing (CREATE_USER not committed?)" >&2; exit 1; }
  have=$(get "/users/$uid/role-mappings/realm" | jq -r '.[].name')
  # One governed write per user at a time: a second write while a CR is pending returns 409.
  for r in ${roles//,/ }; do
    grep -qx "$r" <<<"$have" && { echo "    $name has $r"; continue; }
    echo "    $name +$r → HTTP $(send POST "/users/$uid/role-mappings/realm" "[$(get "/roles/$r")]")"
    approve_all_pending
  done
done

echo "==> Care-group memberships"
for spec in "${USERS[@]}"; do
  IFS=: read -r name _ groups <<<"$spec"
  [ -z "$groups" ] && continue
  uid=$(user_id "$name")
  have=$(get "/users/$uid/groups" | jq -r '.[].path')
  for g in ${groups//,/ }; do
    grep -qx "$g" <<<"$have" && { echo "    $name in $g"; continue; }
    gid=$(get "/group-by-path$g" | jq -r '.id // empty')
    [ -z "$gid" ] && { echo "    group $g not found" >&2; exit 1; }
    echo "    $name → $g: HTTP $(send PUT "/users/$uid/groups/$gid")"
    approve_all_pending
  done
done

echo "==> Check"
for spec in "${USERS[@]}"; do
  IFS=: read -r name _ _ <<<"$spec"
  uid=$(user_id "$name")
  printf '    %-10s roles=[%s] groups=[%s]\n' "$name" \
    "$(get "/users/$uid/role-mappings/realm" | jq -r '[.[].name | select(startswith("_tide_e") or startswith("_tide_d"))] | join(",")')" \
    "$(get "/users/$uid/groups" | jq -r '[.[].path] | join(",")')"
done

echo "==> Invite links (open each in its own browser profile; valid 12 h)"
for name in admin $(printf '%s\n' "${USERS[@]}" | cut -d: -f1); do
  uid=$(user_id "$name")
  key=$(get "/users/$uid" | jq -r '.attributes.tideUserKey[0] // empty')
  if [ -n "$key" ]; then echo "    $name: already linked"; continue; fi
  link=$(curl -s -X POST "$API/tideAdminResources/get-required-action-link?userId=$uid&lifespan=43200" \
    -H "Authorization: Bearer $(token)" -H "Content-Type: application/json" -d '["link-tide-account-action"]')
  echo "    $name: $link"
done
