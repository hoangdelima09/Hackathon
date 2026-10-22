#!/bin/bash
# finish-init.sh — resume `npm run init` after its polling loop died, WITHOUT recreating anything.
#
# init-tidecloak.sh wipes the container and data/keycloakdb* when re-run, which would delete every
# enrolled Tide account. This script runs only the steps init does after the admin links:
#
#   default        Step 10 (drain) + Step 11 (console origin, sign IdP settings) + Step 12 (export
#                  data/tidecloak.json). The realm stays in FirstAdmin mode, so the demo users can
#                  still link their accounts and any change request is drained here, server-side.
#   --grant-admin  Step 11b: grant tide-realm-admin to the enrolled admin and drain. This flips the
#                  realm to multi-admin: after it, every governed change needs an enclave approval.
#                  Run it only once every demo user has linked (scripts/provision-demo.sh refuses
#                  to run after the flip).
#
# Master-admin credential from .env only (AP-41). Code below is copied from init-tidecloak.sh.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
[ -f "$PROJECT_DIR/.env" ] && { set -a; . "$PROJECT_DIR/.env"; set +a; }
: "${KC_BOOTSTRAP_ADMIN_PASSWORD:?KC_BOOTSTRAP_ADMIN_PASSWORD is not set (see .env)}"
KC_BOOTSTRAP_ADMIN_USERNAME="${KC_BOOTSTRAP_ADMIN_USERNAME:-admin}"
TIDECLOAK_URL="${TIDECLOAK_URL:-http://localhost:8080}"
REALM_NAME="${REALM_NAME:-care-passport}"
CLIENT_NAME="${CLIENT_NAME:-${REALM_NAME}-client}"
ADAPTER_OUTPUT="${ADAPTER_OUTPUT:-$PROJECT_DIR/data/tidecloak.json}"
GRANT_ADMIN=0
[ "${1:-}" = "--grant-admin" ] && GRANT_ADMIN=1

get_token() {
  curl -s -X POST "$TIDECLOAK_URL/realms/master/protocol/openid-connect/token" \
    -d "client_id=admin-cli" -d "grant_type=password" \
    --data-urlencode "username=$KC_BOOTSTRAP_ADMIN_USERNAME" \
    --data-urlencode "password=$KC_BOOTSTRAP_ADMIN_PASSWORD" \
    | jq -r '.access_token'
}

approve_all_pending() {
  local TOKEN ready id ids
  TOKEN="$(get_token)"
  ids=$(curl -s "$TIDECLOAK_URL/admin/realms/$REALM_NAME/iga/change-requests?status=PENDING" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null \
    | jq -r 'if type=="array" then (.[] | select(.actionType | IN("DISABLE_IGA","DELETE_REALM","OFFBOARD_REALM") | not) | .id) else empty end' 2>/dev/null)
  for id in $ids; do
    TOKEN="$(get_token)"
    curl -s -X POST "$TIDECLOAK_URL/admin/realms/$REALM_NAME/iga/change-requests/$id/authorize" \
      -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}' > /dev/null 2>&1 || true
  done
  for pass in 1 2 3 4 5; do
    TOKEN="$(get_token)"
    ready=$(curl -s "$TIDECLOAK_URL/admin/realms/$REALM_NAME/iga/change-requests?status=PENDING" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null \
      | jq -r '.[] | select(.actionType | IN("DISABLE_IGA","DELETE_REALM","OFFBOARD_REALM") | not) | select(.readyToCommit==true) | .id' 2>/dev/null)
    [ -z "$ready" ] && break
    for id in $ready; do
      TOKEN="$(get_token)"
      curl -s -X POST "$TIDECLOAK_URL/admin/realms/$REALM_NAME/iga/change-requests/$id/commit" \
        -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
    done
  done
  TOKEN="$(get_token)"
  local left
  left=$(curl -s "$TIDECLOAK_URL/admin/realms/$REALM_NAME/iga/change-requests?status=PENDING" \
    -H "Authorization: Bearer $TOKEN" | jq 'if type=="array" then length else 0 end')
  echo "    pending change requests: $left"
}

TOKEN="$(get_token)"
USER_ID=$(curl -s "$TIDECLOAK_URL/admin/realms/$REALM_NAME/users?username=admin&exact=true" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id // empty')
KEY=$(curl -s "$TIDECLOAK_URL/admin/realms/$REALM_NAME/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.attributes.tideUserKey[0] // empty')
if [ -z "$USER_ID" ] || [ -z "$KEY" ]; then
  echo "STOP: the admin has not linked a Tide account yet (open the admin invite link first)." >&2
  exit 3
fi

RM_UUID=$(curl -s "$TIDECLOAK_URL/admin/realms/$REALM_NAME/clients?clientId=realm-management" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')
ADMINS=$(curl -s "$TIDECLOAK_URL/admin/realms/$REALM_NAME/clients/$RM_UUID/roles/tide-realm-admin/users" \
  -H "Authorization: Bearer $TOKEN" | jq -r '[.[].username] | join(",")')

if [ "$GRANT_ADMIN" = "1" ]; then
  # --- Step 11b of init: grant tide-realm-admin LAST, then final drain (flips to multiAdmin) ---
  if [ -n "$ADMINS" ]; then echo "tide-realm-admin already held by: $ADMINS (nothing to do)"; exit 0; fi
  echo "==> Granting tide-realm-admin to the enrolled admin..."
  ROLE_JSON=$(curl -s "$TIDECLOAK_URL/admin/realms/$REALM_NAME/clients/$RM_UUID/roles/tide-realm-admin" \
    -H "Authorization: Bearer $TOKEN")
  if echo "$ROLE_JSON" | jq -e '.error' > /dev/null 2>&1; then
    echo "ERROR: tide-realm-admin role not found: $ROLE_JSON"; exit 1
  fi
  TOKEN="$(get_token)"
  curl -s -X POST "$TIDECLOAK_URL/admin/realms/$REALM_NAME/users/$USER_ID/role-mappings/clients/$RM_UUID" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "[$ROLE_JSON]" > /dev/null
  echo "==> Final drain (commit grant + firstAdmin -> multiAdmin flip)..."
  sleep 2
  approve_all_pending
  TOKEN="$(get_token)"
  echo "    tide-realm-admin holders: $(curl -s "$TIDECLOAK_URL/admin/realms/$REALM_NAME/clients/$RM_UUID/roles/tide-realm-admin/users" \
    -H "Authorization: Bearer $TOKEN" | jq -r '[.[].username] | join(",")')"
  exit 0
fi

if [ -n "$ADMINS" ]; then
  echo "NOTE: realm is already multi-admin ($ADMINS); skipping governed writes, exporting only."
else
  # --- Step 10 of init: approve change requests created by the link ---
  echo "==> Approving change requests..."
  sleep 2
  approve_all_pending

  # --- Step 11 of init: console origin + sign IdP settings (needs firstAdmin and healthy ORKs) ---
  echo "==> Configuring CustomAdminUIDomain (console origin) + signing IdP settings..."
  TIDE_CONSOLE_ORIGIN="$TIDECLOAK_URL/realms/$REALM_NAME/tide-console/"
  TOKEN="$(get_token)"
  INST=$(curl -s "$TIDECLOAK_URL/admin/realms/$REALM_NAME/identity-provider/instances/tide" \
    -H "Authorization: Bearer $TOKEN")
  UPDATED=$(echo "$INST" | jq --arg d "$TIDE_CONSOLE_ORIGIN" '.config.CustomAdminUIDomain=$d')
  curl -s -X PUT "$TIDECLOAK_URL/admin/realms/$REALM_NAME/identity-provider/instances/tide" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$UPDATED" > /dev/null
  echo "    sign-idp-settings → HTTP $(curl -s -o /dev/null -w '%{http_code}' -X POST \
    "$TIDECLOAK_URL/admin/realms/$REALM_NAME/vendorResources/sign-idp-settings" -H "Authorization: Bearer $TOKEN")"
  approve_all_pending
fi

# --- Step 12 of init: export adapter JSON ---
echo "==> Exporting adapter config..."
TOKEN="$(get_token)"
CLIENT_UUID=$(curl -s "$TIDECLOAK_URL/admin/realms/$REALM_NAME/clients?clientId=$CLIENT_NAME" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')
mkdir -p "$(dirname "$ADAPTER_OUTPUT")"
curl -s "$TIDECLOAK_URL/admin/realms/$REALM_NAME/vendorResources/get-installations-provider?clientId=$CLIENT_UUID&providerId=keycloak-oidc-keycloak-json" \
  -H "Authorization: Bearer $TOKEN" > "$ADAPTER_OUTPUT"
if jq -e 'has("jwk") and has("vendorId") and has("homeOrkUrl")' "$ADAPTER_OUTPUT" > /dev/null 2>&1; then
  echo "    $ADAPTER_OUTPUT has jwk, vendorId and homeOrkUrl."
else
  echo "WARNING: adapter config is missing Tide extensions (jwk/vendorId/homeOrkUrl)." >&2
  exit 1
fi
