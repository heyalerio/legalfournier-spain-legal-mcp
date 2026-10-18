import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SERVER_NAME, SERVER_VERSION } from '../dist/config.js';

const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const [pkg, registry, card, api] = await Promise.all([
  read('../package.json'), read('../server.json'),
  read('../public/.well-known/mcp/server-card.json'),
  read('../public/.well-known/openapi/spain-legal-api.json'),
]);
for (const version of [pkg.version, registry.version, card.serverInfo.version, api.info.version]) {
  assert.equal(version, SERVER_VERSION, 'Release version drift');
}
assert.equal(pkg.mcpName, SERVER_NAME);
assert.equal(registry.name, SERVER_NAME);
assert.equal(registry.remotes[0].url, 'https://legalfournier.com/mcp/spain-legal');
assert.ok(card.protocolVersions.includes('2026-07-28'));
assert.ok(card.capabilities.extensions['io.modelcontextprotocol/skills']);
assert.ok(card.capabilities.extensions['io.modelcontextprotocol/ui']);
assert.ok(card.apps.resources.length > 0);
assert.ok(card.capabilities.tools.consequentialNames.includes('create_legal_fournier_contact_request'));
console.log('Release metadata agrees with the built server:', SERVER_VERSION);
