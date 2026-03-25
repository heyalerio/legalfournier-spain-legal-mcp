#!/bin/sh
set -eu

OUT_DIR="${1:-.}"
KEY_FILE="${OUT_DIR}/mcp-registry-auth-ed25519.pem"
AUTH_FILE="${OUT_DIR}/mcp-registry-auth"

mkdir -p "${OUT_DIR}"

openssl genpkey -algorithm Ed25519 -out "${KEY_FILE}"
PUBLIC_KEY="$(openssl pkey -in "${KEY_FILE}" -pubout -outform DER | tail -c 32 | base64 | tr -d '\n')"
printf 'v=MCPv1; k=ed25519; p=%s\n' "${PUBLIC_KEY}" > "${AUTH_FILE}"

printf 'Wrote public auth file to %s\n' "${AUTH_FILE}"
printf 'Wrote private key to %s\n' "${KEY_FILE}"
printf 'Host the auth file at /.well-known/mcp-registry-auth and keep the private key outside version control.\n'
