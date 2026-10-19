#!/usr/bin/env python3
"""Verify public reads only; never submit contacts, bookings or payments."""
import argparse
import hashlib
import itertools
import json
from pathlib import Path
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request


def registry_read(call, url):
    """Bound transient read failures without retrying invalid registry results."""
    for attempt in range(3):
        try:
            return call(url)
        except (TimeoutError, ConnectionError, urllib.error.URLError) as error:
            if isinstance(error, urllib.error.URLError) and not isinstance(error.reason, (TimeoutError, ConnectionError)):
                raise
            if attempt == 2:
                raise RuntimeError('Official MCP Registry unavailable after three read attempts') from error
            delay = 2 ** (attempt + 1)
            print(f'Registry read interrupted; retrying in {delay}s.', flush=True)
            time.sleep(delay)


def verify_registry(call, manifest, expected):
    # The Registry provides a direct lookup. Global search loads unrelated
    # discovery results and repeatedly timed out even when this record was live.
    name = urllib.parse.quote(manifest['name'], safe='')
    url = f'https://registry.modelcontextprotocol.io/v0.1/servers/{name}/versions/latest'
    status, data, _ = registry_read(
        lambda target: call(target, headers={'Accept': 'application/json'}, timeout=45), url)
    assert status == 200, f'Official Registry lookup returned HTTP {status}'
    assert isinstance(data, dict) and isinstance(data.get('server'), dict), 'Malformed official Registry response'
    server = data['server']
    meta = data.get('_meta')
    official = meta.get('io.modelcontextprotocol.registry/official') if isinstance(meta, dict) else None
    assert isinstance(official, dict) and official.get('isLatest') is True and official.get('status') == 'active', 'Registry entry is not the active latest release'
    assert server.get('name') == manifest['name'], 'Registry server name mismatch'
    assert server.get('version') == expected, f'Registry version drift: expected {expected}, got {server.get("version")}'
    assert server.get('remotes') == manifest['remotes'], 'Registry endpoint drift'
    print('official_registry_matches_release PASS', expected)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', default='http://127.0.0.1:39137')
    parser.add_argument('--expected-version')
    parser.add_argument('--public-metadata', action='store_true')
    parser.add_argument('--registry', action='store_true')
    parser.add_argument('--registry-only', action='store_true', help='Check only the declared release in the official Registry')
    args = parser.parse_args()
    manifest = json.loads((Path(__file__).resolve().parents[1] / 'server.json').read_text())
    expected = args.expected_version or manifest['version']
    endpoint = '/mcp/spain-legal'
    base = args.base.rstrip('/')
    ids = itertools.count(1)
    # Use the system CA store on macOS; certificate verification remains enabled.
    context = ssl.create_default_context(cafile='/etc/ssl/cert.pem') if Path('/etc/ssl/cert.pem').is_file() else ssl.create_default_context()

    def call(path, body=None, headers=None, method=None, timeout=25):
        url = path if path.startswith('https://') else base + path
        request = urllib.request.Request(
            url, data=None if body is None else json.dumps(body).encode(), method=method,
            headers={'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream',
                     'User-Agent': 'LegalFournier-ReleaseVerification/' + expected, **(headers or {})})
        try:
            response = urllib.request.urlopen(request, timeout=timeout, context=context)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            raw = response.read(4_000_000).decode('utf-8')
            if not raw:
                data = None
            elif 'text/event-stream' in response.headers.get('Content-Type', ''):
                messages = [json.loads(line[5:].strip()) for line in raw.splitlines() if line.startswith('data:')]
                data = next((message for message in messages if 'result' in message or 'error' in message), None)
            else:
                data = json.loads(raw)
            return response.status, data, response.headers

    if args.registry_only:
        verify_registry(call, manifest, expected)
        return

    def rpc(method, params=None, modern=True, headers=None):
        params = dict(params or {})
        version = '2026-07-28' if modern else '2025-11-25'
        request_headers = {'MCP-Protocol-Version': version}
        if modern:
            params['_meta'] = {
                'io.modelcontextprotocol/protocolVersion': version,
                'io.modelcontextprotocol/clientCapabilities': {'extensions': {
                    'io.modelcontextprotocol/skills': {},
                    'io.modelcontextprotocol/ui': {'mimeTypes': ['text/html;profile=mcp-app']}}},
                'io.modelcontextprotocol/clientInfo': {'name': 'LegalFournier-ReleaseVerification', 'version': expected}}
            request_headers['Mcp-Method'] = method
            if method in ('tools/call', 'resources/read', 'prompts/get'):
                request_headers['Mcp-Name'] = params.get('name', params.get('uri', ''))
        return call(endpoint, {'jsonrpc': '2.0', 'id': next(ids), 'method': method, 'params': params},
                    {**request_headers, **(headers or {})})

    def result(response, label):
        status, body, _ = response
        assert status == 200 and isinstance(body, dict) and 'result' in body and 'error' not in body, (label, status, body)
        return body['result']

    status, ready, _ = call('/api/spain-legal/readyz')
    assert status == 200 and ready['version'] == expected and ready['status'] == 'ready', (status, ready)
    assert ready['content']['video_count'] >= 3 and ready['content'].get('stale') is False, ready['content']
    print('readiness PASS', expected, ready['content'])

    cases = [
        ('spanish_articles', '/api/spain-legal/search', {'query': 'nacionalidad', 'language': 'es', 'max_results': 3}, 200),
        ('videos', '/api/spain-legal/search', {'query': 'digital nomad', 'type': 'video'}, 200),
        ('video_fetch', '/api/spain-legal/fetch', {'id': 'youtube:s2D42HhAobQ'}, 200),
        ('bad_boolean', '/api/spain-legal/visa-options', {'nationality': 'USA', 'has_eu_family_link': 'false'}, 400),
        ('excluded_article', '/api/spain-legal/fetch', {'id': 'wp:post:2191'}, 404),
    ]
    for label, path, body, wanted in cases:
        status, data, _ = call(path, body)
        assert status == wanted, (label, status, data)
        if label in ('spanish_articles', 'videos'):
            assert data['result']['resources'], label
        print(label, 'PASS')

    legacy = result(rpc('initialize', {'protocolVersion': '2025-11-25', 'capabilities': {},
                                      'clientInfo': {'name': 'release-legacy-check', 'version': expected}}, modern=False), 'legacy initialize')
    assert legacy['protocolVersion'] == '2025-11-25' and legacy['serverInfo']['version'] == expected, legacy
    old_tools = result(rpc('tools/list', modern=False), 'legacy tools')['tools']
    discover = result(rpc('server/discover'), 'modern discover')
    assert '2026-07-28' in discover['supportedVersions'], discover
    extensions = discover['capabilities'].get('extensions', {})
    assert 'io.modelcontextprotocol/skills' in extensions and 'io.modelcontextprotocol/ui' in extensions, extensions
    print('legacy_and_modern_discovery PASS')

    modern_tools = result(rpc('tools/list'), 'modern tools')
    assert modern_tools['resultType'] == 'complete', modern_tools.keys()
    assert modern_tools['cacheScope'] == 'public' and 0 < modern_tools['ttlMs'] <= 300000, modern_tools.keys()
    assert {tool['name'] for tool in old_tools} == {tool['name'] for tool in modern_tools['tools']}, 'Tool lists differ between eras'
    assert {'search', 'fetch'}.issubset({tool['name'] for tool in old_tools})
    fetched = result(rpc('tools/call', {'name': 'fetch', 'arguments': {'id': 'youtube:s2D42HhAobQ'}}), 'modern fetch')
    assert not fetched.get('isError') and fetched.get('structuredContent'), fetched
    print('modern_tools_and_video_fetch PASS')

    skill_entries = []
    cursor = None
    seen_cursors = set()
    while True:
        skills = result(rpc('skills/list', {'cursor': cursor} if cursor else {}), 'skills list')
        assert skills['resultType'] == 'complete', skills
        skill_entries.extend(skills['skills'])
        cursor = skills.get('nextCursor')
        if not cursor:
            break
        assert cursor not in seen_cursors and len(seen_cursors) < 10, 'Invalid skill pagination'
        seen_cursors.add(cursor)
    assert len(skill_entries) == 5, skill_entries
    for skill in skill_entries:
        item = result(rpc('skills/get', {'uri': skill['uri']}), 'skills get')
        assert item['skill'] == skill, 'Skill list/get mismatch'
        for resource in skill['resources']:
            read = result(rpc('resources/read', {'uri': resource['uri']}), 'skill file')
            raw = read['contents'][0]['text'].encode('utf-8')
            assert len(raw) == resource['size'], resource['uri']
            assert 'sha256:' + hashlib.sha256(raw).hexdigest() == resource['digest'], resource['uri']
            assert raw.startswith(b'---\n'), 'Missing skill frontmatter'
    print('five_skill_manifests_and_content_integrity PASS')

    app_uris = {tool.get('_meta', {}).get('ui', {}).get('resourceUri') for tool in modern_tools['tools']}
    app_uris.discard(None)
    assert app_uris, 'Missing Apps tool metadata'
    for uri in app_uris:
        app = result(rpc('resources/read', {'uri': uri}), 'app resource')['contents'][0]
        assert app['mimeType'] == 'text/html;profile=mcp-app' and '<html' in app['text'].lower(), uri
        assert isinstance(app.get('_meta', {}).get('ui', {}).get('csp'), dict), 'Missing Apps CSP'
    print('app_resources_and_csp PASS')

    status, _, headers = rpc('tools/list', headers={'Origin': 'https://protocol-review.invalid'})
    assert status == 403 and not headers.get('Access-Control-Allow-Origin'), ('untrusted origin', status)
    allowed_response = rpc('tools/list', headers={'Origin': 'https://legalfournier.com'})
    result(allowed_response, 'allowed browser origin')
    assert allowed_response[2].get('Access-Control-Allow-Origin') == 'https://legalfournier.com'
    status, _, headers = call(endpoint, headers={'Origin': 'https://legalfournier.com',
        'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,mcp-protocol-version,mcp-method,mcp-name'}, method='OPTIONS')
    allowed = headers.get('Access-Control-Allow-Headers', '').lower()
    assert status == 204 and 'mcp-method' in allowed and 'mcp-name' in allowed, (status, allowed)
    status, body, _ = rpc('tools/list', headers={'Mcp-Method': 'resources/list'})
    assert status == 400 and body['error']['code'] == -32020, ('header mismatch', status, body)
    print('origin_cors_and_header_validation PASS')

    if args.public_metadata:
        status, card, _ = call('/.well-known/mcp/server-card.json')
        assert status == 200 and card['serverInfo']['version'] == expected, ('server card', status)
        status, api, _ = call('/.well-known/openapi/spain-legal-api.json')
        assert status == 200 and api['info']['version'] == expected, ('OpenAPI', status)
        print('published_metadata PASS')
    if args.registry:
        verify_registry(call, manifest, expected)


if __name__ == '__main__':
    main()
