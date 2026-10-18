import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from urllib.error import HTTPError

spec = importlib.util.spec_from_file_location("content_sync", Path(__file__).with_name("sync-content-index.py"))
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


def post(ident=1916, **changes):
    source = {
        "id": ident, "status": "publish", "date_gmt": "2026-01-01T10:00:00", "modified_gmt": "2026-10-16T12:00:00",
        "link": "https://legalfournier.com/en/immigration/spanish-nationality-law/",
        "title": {"rendered": "Spanish Nationality &amp; Residence"},
        "content": {"rendered": "<p>Current legal text.</p>", "protected": False},
        "excerpt": {"rendered": "<p>Article summary.</p>", "protected": False},
    }
    source.update(changes)
    return source


class ContentSyncTests(unittest.TestCase):
    def test_published_only_and_quarantined_article(self):
        for source in [post(2191), post(2663, status="draft"), post(status="private"), post(content={"rendered": "secret", "protected": True})]:
            self.assertIsNone(sync.article_document(source, "2026-10-18T10:00:00Z"))

    def test_plain_text_has_source_citations_but_no_scripts_or_forms(self):
        source = post(content={"rendered": '<p>Read <a href="https://www.boe.es/example">the law</a>.</p><script>bad()</script><form>private input</form><p>Next paragraph.</p>'})
        document = sync.article_document(source, "2026-10-18T10:00:00Z")
        self.assertIn("the law (https://www.boe.es/example)", document["text"])
        self.assertNotIn("bad()", document["text"])
        self.assertNotIn("private input", document["text"])
        self.assertIn("Next paragraph", document["text"])
        self.assertIsNone(document["reviewed_at"])
        self.assertEqual(document["source_modified_at"], "2026-10-16T12:00:00Z")

    def test_only_embedded_youtube_players_are_pairings(self):
        source = post(content={"rendered": '<p>Video.</p><iframe src="https://www.youtube-nocookie.com/embed/VItK51LZbfE"></iframe><a href="https://www.youtube.com/watch?v=DGchnucg8eg">Mention</a><iframe src="https://youtube.com.evil.example/embed/s2D42HhAobQ"></iframe>'})
        document = sync.article_document(source, "2026-10-18T10:00:00Z")
        self.assertEqual(document["related_video_ids"], ["youtube:VItK51LZbfE"])

    def test_relative_source_citations_resolve_against_article_url(self):
        source = post(content={"rendered": '<p>See <a href="#requirements">requirements</a>.</p>'})
        document = sync.article_document(source, "2026-10-18T10:00:00Z")
        self.assertIn(source["link"] + "#requirements", document["text"])

    def test_metadata_only_firm_video_and_live_article_relation(self):
        source = post(content={"rendered": '<p>Article.</p><iframe src="https://www.youtube.com/embed/VItK51LZbfE"></iframe>'})
        snapshot = sync.build_snapshot([source], lambda url: ({"type": "video", "author_name": "Legal Fournier", "author_url": sync.TRUSTED_CHANNEL_URL, "title": "Our video"}, {}))
        self.assertEqual(len(snapshot["documents"]), 2)
        video = next(document for document in snapshot["documents"] if document["type"] == "video")
        self.assertEqual(video["transcript_status"], "unavailable")
        self.assertEqual(video["language"], "und")
        self.assertIsNone(video["source_modified_at"])
        self.assertEqual(video["related_article_ids"], ["wp:post:1916"])

    def test_removed_private_or_third_party_video_is_not_published(self):
        source = post(content={"rendered": '<p>Article.</p><iframe src="https://www.youtube.com/embed/VItK51LZbfE"></iframe>'})
        def unavailable(url):
            raise HTTPError(url, 404, "Unavailable", {}, None)
        for fetch in [unavailable, lambda url: ({"type": "video", "author_name": "Third party", "title": "Video"}, {}), lambda url: ({"type": "video", "author_name": "Legal Fournier", "author_url": "https://www.youtube.com/@different-channel", "title": "Video"}, {})]:
            snapshot = sync.build_snapshot([source], fetch)
            self.assertEqual(len(snapshot["documents"]), 1)
            self.assertEqual(snapshot["documents"][0]["related_video_ids"], [])

    def test_cross_origin_redirect_is_rejected_before_fetching(self):
        request = sync.Request("https://www.youtube.com/oembed")
        with self.assertRaises(ValueError):
            sync.SameOriginRedirects().redirect_request(request, None, 302, "Found", {}, "http://127.0.0.1/internal")

    def test_partial_wordpress_crawl_cannot_publish(self):
        with self.assertRaises(ValueError):
            sync.read_published_posts(lambda url: ([post()], {"X-WP-Total": "2", "X-WP-TotalPages": "1"}))

    def test_snapshot_is_replaced_atomically_and_old_documents_are_removed(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "content-index.json"
            sync.publish_atomic(sync.build_snapshot([post(), post(2936)]), target)
            self.assertEqual(len(json.loads(target.read_text())["documents"]), 2)
            sync.publish_atomic(sync.build_snapshot([post()]), target)
            self.assertEqual(len(json.loads(target.read_text())["documents"]), 1)
            with self.assertRaises(ValueError):
                sync.publish_atomic({"documents": []}, target)
            self.assertEqual(len(json.loads(target.read_text())["documents"]), 1)


if __name__ == "__main__":
    unittest.main()
