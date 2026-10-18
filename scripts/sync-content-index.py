#!/usr/bin/env python3
"""Publish the public MCP's read-only article/video index from public sources.

This process requires no WordPress or Metricool credentials. Sara's published
embeds are the pairing decisions. Run outside the public MCP service and give
that service read-only access to the resulting atomic JSON snapshot.
"""
from __future__ import annotations

import argparse
import fcntl
from datetime import datetime, timezone, timedelta
from hashlib import sha256
from html import unescape
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import ssl
import sys
import tempfile
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, quote, urlencode, urljoin, urlparse
from urllib.request import HTTPRedirectHandler, HTTPSHandler, Request, build_opener

WP_ORIGIN = "https://legalfournier.com"
WP_FIELDS = "id,date_gmt,modified_gmt,link,title,content,excerpt,status"
EXCLUDED_POST_IDS = {2191}
MAX_POSTS = 3000
MAX_RESPONSE_BYTES = 16 * 1024 * 1024
MAX_INDEX_BYTES = 32 * 1024 * 1024
MAX_ARTICLE_CHARS = 250000
TRUSTED_CHANNEL_URL = "https://www.youtube.com/@legalfournier"
TOPIC_TERMS = {
    "nationality": ("nationality", "citizenship", "nacionalidad", "ciudadania", "nationalite", "citoyennete"),
    "residency": ("residency", "residence", "residencia", "sejour"),
    "digital-nomad": ("digital nomad", "nomada", "nomade", "telework", "teletrabajo", "teletravail"),
    "beckham": ("beckham", "impatriate", "impatriado", "impatrie"),
    "tax": ("tax", "taxes", "taxation", "fiscal", "impuesto", "impuestos", "fiscalite", "impot", "impots"),
    "property": ("property", "real estate", "inmueble", "inmobiliario", "immobilier", "propiedad", "vivienda"),
    "business": ("business", "company", "empresa", "sociedad", "societe", "entreprise", "entrepreneur", "emprendedor"),
    "family": ("family", "familia", "familiar", "famille", "spouse", "conyuge", "conjoint"),
    "immigration": ("immigration", "inmigracion", "extranjeria", "visa", "visado"),
    "inheritance": ("inheritance", "succession", "herencia", "sucesion", "heritage"),
    "healthcare": ("healthcare", "sanidad", "salud", "sante", "nursing", "enfermeria", "infirmier"),
    "employment": ("employment", "employee", "work permit", "trabajo", "empleo", "travail", "salarie"),
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def utc_wp_date(value):
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    except ValueError:
        return None


def normalise(text):
    import unicodedata
    decomposed = unicodedata.normalize("NFKD", text)
    return re.sub(r"[^a-z0-9]+", " ", "".join(c for c in decomposed if not unicodedata.combining(c)).lower()).strip()


def infer_topics(title, url, text):
    # Titles and paths carry the topic; only use the lead, rather than every
    # incidental mention/link in the entire article, as a secondary signal.
    haystack = " " + normalise(title + " " + urlparse(url).path + " " + text[:1800]) + " "
    return [topic for topic, terms in TOPIC_TERMS.items() if any(" " + term + " " in haystack for term in terms)]


def youtube_id(value):
    try:
        parsed = urlparse(unescape(value))
        if parsed.scheme not in ("https", "http", ""):
            return None
        host = (parsed.hostname or "").lower()
        if host == "youtu.be":
            candidate = parsed.path.strip("/").split("/")[0]
        elif host in {"youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"}:
            segments = parsed.path.strip("/").split("/")
            candidate = segments[1] if len(segments) >= 2 and segments[0] in {"embed", "shorts"} else parse_qs(parsed.query).get("v", [""])[0]
        else:
            return None
        return candidate if re.fullmatch(r"[A-Za-z0-9_-]{11}", candidate) else None
    except ValueError:
        return None


class ArticleText(HTMLParser):
    BLOCKS = {"p", "div", "section", "article", "aside", "h1", "h2", "h3", "h4", "h5", "h6", "li", "ul", "ol", "blockquote", "tr", "table", "figure", "figcaption", "br"}
    SUPPRESSED = {"script", "style", "noscript", "form", "button", "svg"}

    def __init__(self, base_url=WP_ORIGIN):
        super().__init__(convert_charrefs=True)
        self.base_url = base_url
        self.parts = []
        self.suppressed = []
        self.videos = set()
        self.links = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in self.SUPPRESSED:
            self.suppressed.append(tag)
        if self.suppressed:
            return
        if tag in self.BLOCKS:
            self.parts.append("\n")
        if tag in {"td", "th"}:
            self.parts.append(" | ")
        # Only embedded players are publication/pairing decisions. Ordinary
        # mentions of an arbitrary YouTube link do not admit a video to MCP.
        if tag in {"iframe", "lite-youtube"} or attrs.get("class", "").find("youtube") >= 0:
            for name in ("src", "data-src", "data-embed", "data-youtube-url"):
                video = youtube_id(attrs.get(name, ""))
                if video:
                    self.videos.add(video)
            video = attrs.get("videoid", "") or attrs.get("data-video-id", "")
            if re.fullmatch(r"[A-Za-z0-9_-]{11}", video):
                self.videos.add(video)
        if tag == "a":
            href = urljoin(self.base_url, attrs.get("href", ""))
            parsed = urlparse(href)
            self.links.append(href if parsed.scheme == "https" and parsed.hostname and not parsed.username and not parsed.password else "")

    def handle_endtag(self, tag):
        if self.suppressed:
            if tag == self.suppressed[-1]:
                self.suppressed.pop()
            return
        if tag == "a" and self.links:
            href = self.links.pop()
            if href:
                self.parts.append(f" ({href})")
        if tag in self.BLOCKS:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.suppressed:
            self.parts.append(data)

    def result(self):
        text = "".join(self.parts)
        text = re.sub(r"[ \t\r\f\v]+", " ", text)
        text = "\n".join(line.strip() for line in text.splitlines())
        return re.sub(r"\n{3,}", "\n\n", text).strip()


def html_text(value):
    parser = ArticleText()
    parser.feed(str(value or ""))
    parser.close()
    return parser.result()


def article_document(post, indexed_at):
    if not isinstance(post, dict) or post.get("status") != "publish":
        return None
    ident = post.get("id")
    if not isinstance(ident, int) or ident <= 0 or ident in EXCLUDED_POST_IDS:
        return None
    content = post.get("content") or {}
    if content.get("protected") or (post.get("excerpt") or {}).get("protected"):
        return None
    url = post.get("link", "")
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in {"legalfournier.com", "www.legalfournier.com"} or parsed.username or parsed.password:
        return None
    source_modified = utc_wp_date(post.get("modified_gmt"))
    published_at = utc_wp_date(post.get("date_gmt"))
    if not source_modified or not published_at:
        return None
    if datetime.fromisoformat(published_at.replace("Z", "+00:00")) > datetime.now(timezone.utc) + timedelta(minutes=5):
        return None
    html = content.get("rendered", "")
    parser = ArticleText(url)
    parser.feed(html)
    parser.close()
    text = parser.result()
    title = html_text((post.get("title") or {}).get("rendered", ""))
    if not text or not title:
        return None
    if len(text) > MAX_ARTICLE_CHARS:
        raise ValueError(f"Article {ident} exceeds the index document limit")
    first_segment = parsed.path.strip("/").split("/")[0]
    language = first_segment if first_segment in {"en", "es", "fr"} else "und"
    return {
        "id": f"wp:post:{ident}", "type": "article", "status": "publish", "title": title,
        "url": url, "language": language, "description": html_text((post.get("excerpt") or {}).get("rendered", ""))[:1200],
        "text": text, "topics": infer_topics(title, url, text),
        "source_published_at": published_at, "source_modified_at": source_modified,
        "reviewed_at": None, "law_effective_dates": [], "indexed_at": indexed_at,
        "source_html_sha256": sha256(html.encode()).hexdigest(),
        "related_video_ids": [f"youtube:{video}" for video in sorted(parser.videos)],
    }


class SameOriginRedirects(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, newurl):
        previous, target = urlparse(request.full_url), urlparse(newurl)
        if target.scheme != "https" or target.netloc != previous.netloc:
            raise ValueError("Unexpected cross-origin redirect")
        return super().redirect_request(request, fp, code, message, headers, newurl)


def request_json(url):
    request = Request(url, headers={"User-Agent": "LegalFournier-PublishedContentSync/1.0", "Accept": "application/json"})
    context = ssl.create_default_context()
    # Optional local certificate bundle; no TLS bypass, including for tests.
    try:
        import certifi
        context.load_verify_locations(cafile=certifi.where())
    except ImportError:
        pass
    opener = build_opener(SameOriginRedirects(), HTTPSHandler(context=context))
    with opener.open(request, timeout=25) as response:
        if response.geturl().split("/", 3)[2] != url.split("/", 3)[2]:
            raise ValueError("Unexpected cross-origin redirect")
        raw = response.read(MAX_RESPONSE_BYTES + 1)
        if len(raw) > MAX_RESPONSE_BYTES:
            raise ValueError("Public response exceeds limit")
        return json.loads(raw), dict(response.headers.items())


def read_published_posts(fetch_json=request_json):
    posts = []
    expected_total = None
    expected_pages = None
    for page in range(1, MAX_POSTS // 100 + 1):
        query = urlencode({"status": "publish", "per_page": 100, "page": page, "orderby": "id", "order": "asc", "_fields": WP_FIELDS})
        batch, headers = fetch_json(f"{WP_ORIGIN}/wp-json/wp/v2/posts?{query}")
        headers = {key.lower(): value for key, value in headers.items()}
        if not isinstance(batch, list):
            raise ValueError("Public WordPress API did not return posts")
        total, pages = int(headers["x-wp-total"]), int(headers["x-wp-totalpages"])
        if total < 1 or total > MAX_POSTS or pages < 1:
            raise ValueError("Unexpected published-post count")
        if expected_total is None:
            expected_total, expected_pages = total, pages
        if (total, pages) != (expected_total, expected_pages):
            raise ValueError("Publication count changed during pagination; retry a full snapshot")
        posts.extend(batch)
        if page == expected_pages:
            break
    if len(posts) != expected_total or len({post["id"] for post in posts}) != expected_total:
        raise ValueError("Incomplete or duplicate publication snapshot")
    return posts


def video_document(video_id, articles, indexed_at, fetch_json=request_json):
    url = "https://www.youtube.com/watch?v=" + video_id
    metadata, _ = fetch_json("https://www.youtube.com/oembed?" + urlencode({"url": url, "format": "json"}))
    if not isinstance(metadata, dict) or metadata.get("type") != "video":
        return None
    # Only the firm's channel is automatically admitted, never third parties
    # embedded in an article or metadata chosen by an unauthenticated caller.
    if normalise(str(metadata.get("author_name", ""))) != "legal fournier" or metadata.get("author_url", "").rstrip("/") != TRUSTED_CHANNEL_URL:
        return None
    title = html_text(metadata.get("title", ""))[:1000]
    if not title:
        return None
    article_lines = [f"- {article['title']}: {article['url']}" for article in articles]
    text = f"{title}\n\nPublished by Legal Fournier. Video: {url}\n\n" + \
        "This resource contains verified video metadata and article pairings only. " + \
        "The video transcript, spoken language, publication date, duration and Shorts classification have not been verified. " + \
        "Use the current linked article for its published legal text; do not infer video statements from this metadata.\n\nEmbedded in:\n" + "\n".join(article_lines)
    return {
        "id": "youtube:" + video_id, "type": "video", "status": "publish",
        "title": title, "url": url, "language": "und", "description": "Legal Fournier video embedded in the linked published article. Transcript unavailable.",
        "text": text, "topics": sorted({topic for article in articles for topic in article["topics"]}),
        "source_modified_at": None, "reviewed_at": None, "law_effective_dates": [],
        "indexed_at": indexed_at, "availability_verified_at": indexed_at,
        "transcript_status": "unavailable", "video_format": "unverified", "video_language": "unverified",
        "channel_url": TRUSTED_CHANNEL_URL,
        "related_article_ids": [article["id"] for article in articles], "related_article_urls": [article["url"] for article in articles],
    }


def build_snapshot(posts, fetch_json=request_json):
    indexed_at = now_iso()
    documents = [document for post in posts if (document := article_document(post, indexed_at))]
    pairings = {}
    for document in documents:
        for ident in document["related_video_ids"]:
            pairings.setdefault(ident.removeprefix("youtube:"), []).append(document)
    unavailable = []
    for ident, articles in sorted(pairings.items()):
        try:
            video = video_document(ident, articles, indexed_at, fetch_json)
        except (HTTPError, URLError, TimeoutError, OSError, ValueError, KeyError):
            video = None
        if video:
            documents.append(video)
        else:
            unavailable.append(ident)
    admitted = {document["id"] for document in documents if document["type"] == "video"}
    for document in documents:
        if document["type"] == "article":
            document["related_video_ids"] = [ident for ident in document["related_video_ids"] if ident in admitted]
    return {
        "schema_version": 1, "generated_at": indexed_at,
        "source": "https://legalfournier.com/wp-json/wp/v2/posts",
        "source_post_count": len(posts), "excluded_post_ids": sorted(EXCLUDED_POST_IDS),
        "unavailable_video_ids": unavailable,
        "documents": sorted(documents, key=lambda document: document["id"]),
    }


def publish_atomic(snapshot, output):
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    if not snapshot["documents"]:
        raise ValueError("Refusing to publish an empty index")
    fd, temp = tempfile.mkstemp(prefix=".content-index-", suffix=".json", dir=output.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(snapshot, stream, ensure_ascii=False, separators=(",", ":"))
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        if os.path.getsize(temp) > MAX_INDEX_BYTES:
            raise ValueError("Refusing an oversized content index")
        os.chmod(temp, 0o644)
        os.replace(temp, output)
        directory_fd = os.open(output.parent, os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True, help="Atomic published index path")
    args = parser.parse_args()
    try:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        # A manual Sara refresh and the timer must not publish snapshots out of
        # order. The lock protects fetching as well as the final rename.
        with (args.output.parent / ".content-index-sync.lock").open("a") as lock:
            try:
                fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                print(json.dumps({"ok": True, "skipped": "publisher_already_running"}))
                return 0
            snapshot = build_snapshot(read_published_posts())
            publish_atomic(snapshot, args.output)
        counts = {kind: sum(document["type"] == kind for document in snapshot["documents"]) for kind in ("article", "video")}
        print(json.dumps({"ok": True, "generated_at": snapshot["generated_at"], "counts": counts, "unavailable_video_count": len(snapshot["unavailable_video_ids"])}))
    except (HTTPError, URLError, TimeoutError, OSError, ValueError, KeyError) as error:
        # Preserve the last complete snapshot; never publish a partial WP crawl.
        print(json.dumps({"ok": False, "error": type(error).__name__, "message": str(error)}), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
