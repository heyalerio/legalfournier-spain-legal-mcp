#!/bin/sh
set -eu

OUT_DIR="${1:-./.well-known}"
KEY_DIR="${2:-${XDG_STATE_HOME:-${HOME}/.local/state}/legalfournier-mcp}"
KEY_FILE="${KEY_DIR}/mcp-registry-auth-ed25519.pem"
AUTH_FILE="${OUT_DIR}/mcp-registry-auth"

if [ -e "${KEY_FILE}" ] || [ -e "${AUTH_FILE}" ]; then
  printf '%s\n' 'Existing registry key or public proof found. Reuse it; this command never rotates credentials.' >&2
  exit 1
fi
mkdir -p "${OUT_DIR}"
umask 077
mkdir -p "${KEY_DIR}"
PUBLIC_PATH="$(CDPATH= cd -P "${OUT_DIR}" && pwd -P)"
PRIVATE_PATH="$(CDPATH= cd -P "${KEY_DIR}" && pwd -P)"
case "${PRIVATE_PATH}/" in
  "${PUBLIC_PATH}/"*) printf '%s\n' 'Private keys must stay outside the public proof directory.' >&2; exit 1 ;;
esac
case "${PUBLIC_PATH}/" in
  "${PRIVATE_PATH}/"*) printf '%s\n' 'Public proofs must stay outside the private key directory.' >&2; exit 1 ;;
esac

openssl genpkey -algorithm Ed25519 -out "${KEY_FILE}"
PUBLIC_KEY="$(openssl pkey -in "${KEY_FILE}" -pubout -outform DER | tail -c 32 | base64 | tr -d '\n')"
printf 'v=MCPv1; k=ed25519; p=%s\n' "${PUBLIC_KEY}" > "${AUTH_FILE}"
chmod 644 "${AUTH_FILE}"

printf 'Wrote public auth file to %s\n' "${AUTH_FILE}"
printf 'Wrote private key to %s\n' "${KEY_FILE}"
printf 'Host only the public auth file at /.well-known/mcp-registry-auth. Keep the private key outside the webroot, releases and version control.\n'
