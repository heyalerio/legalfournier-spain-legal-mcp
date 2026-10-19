import copy
import importlib.util
import io
import json
from pathlib import Path
import ssl
import unittest
from unittest.mock import Mock, patch
import urllib.error

spec = importlib.util.spec_from_file_location('public_monitor', Path(__file__).with_name('smoke-readonly.py'))
monitor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(monitor)


class RegistryMonitorTests(unittest.TestCase):
    def setUp(self):
        self.manifest = {'name': 'org.example/legal', 'version': '1.2.3',
                         'remotes': [{'type': 'streamable-http', 'url': 'https://example.org/mcp'}]}
        self.data = {'server': copy.deepcopy(self.manifest), '_meta': {
            'io.modelcontextprotocol.registry/official': {'isLatest': True, 'status': 'active'}}}
        self.quiet = patch('sys.stdout', new_callable=io.StringIO)
        self.quiet.start()
        self.addCleanup(self.quiet.stop)

    def test_uses_direct_latest_lookup_with_encoded_name(self):
        call = Mock(return_value=(200, self.data, {}))
        monitor.verify_registry(call, self.manifest, '1.2.3')
        call.assert_called_once_with(
            'https://registry.modelcontextprotocol.io/v0.1/servers/org.example%2Flegal/versions/latest',
            headers={'Accept': 'application/json'}, timeout=45)

    def test_release_mismatches_fail_without_retries(self):
        changes = [
            ('server', 'name', 'org.attacker/legal'),
            ('server', 'version', '1.2.2'),
            ('server', 'remotes', []),
            ('official', 'isLatest', False),
            ('official', 'status', 'deprecated'),
        ]
        for section, key, value in changes:
            with self.subTest(section=section, key=key):
                data = copy.deepcopy(self.data)
                target = data['server'] if section == 'server' else data['_meta']['io.modelcontextprotocol.registry/official']
                target[key] = value
                call = Mock(return_value=(200, data, {}))
                with self.assertRaises(AssertionError):
                    monitor.verify_registry(call, self.manifest, '1.2.3')
                self.assertEqual(call.call_count, 1)

    def test_missing_or_malformed_registry_record_fails(self):
        cases = [(404, self.data), (503, self.data), (200, None), (200, {}),
                 (200, {'server': []}), (200, {'server': self.manifest, '_meta': None})]
        for status, data in cases:
            with self.subTest(status=status, data=data):
                with self.assertRaises(AssertionError):
                    monitor.verify_registry(Mock(return_value=(status, data, {})), self.manifest, '1.2.3')

    def test_transient_reads_recover_with_bounded_delays(self):
        expected = (200, self.data, {})
        call = Mock(side_effect=[TimeoutError(), ConnectionResetError(), expected])
        with patch.object(monitor.time, 'sleep') as sleep:
            self.assertEqual(monitor.registry_read(call, 'url'), expected)
        self.assertEqual(call.call_count, 3)
        self.assertEqual([item.args[0] for item in sleep.call_args_list], [2, 4])

    def test_urlopen_wrapped_timeout_can_recover(self):
        expected = (200, self.data, {})
        call = Mock(side_effect=[urllib.error.URLError(TimeoutError()), expected])
        with patch.object(monitor.time, 'sleep'):
            self.assertEqual(monitor.registry_read(call, 'url'), expected)
        self.assertEqual(call.call_count, 2)

    def test_persistent_timeout_reports_external_registry(self):
        call = Mock(side_effect=TimeoutError())
        with patch.object(monitor.time, 'sleep'):
            with self.assertRaisesRegex(RuntimeError, 'Official MCP Registry unavailable') as error:
                monitor.registry_read(call, 'url')
        self.assertIsInstance(error.exception.__cause__, TimeoutError)
        self.assertEqual(call.call_count, 3)

    def test_http_and_certificate_errors_are_not_retried(self):
        for error in [urllib.error.HTTPError('url', 403, 'Forbidden', {}, None),
                      urllib.error.URLError(ssl.SSLCertVerificationError('untrusted certificate'))]:
            with self.subTest(error=error):
                call = Mock(side_effect=error)
                with patch.object(monitor.time, 'sleep') as sleep:
                    with self.assertRaises(urllib.error.URLError):
                        monitor.registry_read(call, 'url')
                self.assertEqual(call.call_count, 1)
                sleep.assert_not_called()

    def test_invalid_json_is_not_retried(self):
        call = Mock(side_effect=json.JSONDecodeError('Invalid response', '<html>', 0))
        with self.assertRaises(json.JSONDecodeError):
            monitor.registry_read(call, 'url')
        self.assertEqual(call.call_count, 1)

    def test_registry_only_never_calls_the_live_service(self):
        manifest = json.loads((Path(__file__).resolve().parents[1] / 'server.json').read_text())
        data = copy.deepcopy(self.data)
        data['server'] = manifest

        class Response(io.BytesIO):
            status = 200
            headers = {'Content-Type': 'application/json'}

        with patch('sys.argv', ['smoke-readonly.py', '--registry-only', '--base', 'https://must-not-call.invalid']):
            with patch.object(monitor.urllib.request, 'urlopen', return_value=Response(json.dumps(data).encode())) as fetch:
                monitor.main()
        fetch.assert_called_once()
        request = fetch.call_args.args[0]
        self.assertEqual(request.host, 'registry.modelcontextprotocol.io')
        self.assertEqual(request.get_method(), 'GET')
        self.assertIsNone(request.data)


if __name__ == '__main__':
    unittest.main()
