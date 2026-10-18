#!/usr/bin/env python3
"""Patch only the two Legal Fournier MCP proxy locations, with rollback copies."""
from pathlib import Path
import argparse
import re
import shutil
import subprocess

parser=argparse.ArgumentParser()
parser.add_argument('--backup-dir',required=True)
args=parser.parse_args()
backup=Path(args.backup_dir);backup.mkdir(parents=True,exist_ok=True)
available=Path('/etc/nginx/sites-available/legalfournier')
enabled=Path('/etc/nginx/sites-enabled/legalfournier')
if not enabled.is_symlink() and available.read_bytes()!=enabled.read_bytes():
    raise SystemExit('Nginx source and active configuration differ; reconcile before patching.')
for label,path in [('nginx-available',available),('nginx-enabled',enabled)]:
    if not (backup/label).exists():shutil.copy2(path,backup/label)
source=available.read_text()
def update(match):
    body=match[2]
    if 'X-LF-Verified-Client-IP' in body:return match[0]
    body=re.sub(r'proxy_set_header X-Forwarded-For [^;]+;', 'proxy_set_header X-Forwarded-For $remote_addr;', body)
    body=re.sub(r'proxy_(read|send)_timeout\s+\d+;', r'proxy_\1_timeout 60;', body)
    body+='''
        include /etc/nginx/snippets/lf-mcp-cloudflare-realip.conf;
        proxy_set_header X-LF-Verified-Client-IP $remote_addr;
        proxy_set_header X-LF-Verified-Client-Country "";
        proxy_set_header CF-Connecting-IP "";
        proxy_set_header True-Client-IP "";
        proxy_set_header X-Real-IP "";
        proxy_connect_timeout 5s;
        client_body_timeout 10s;
        client_max_body_size 100k;
    '''
    return match[1]+body+match[3]
patched,count=re.subn(r'(location\s+\^~\s+/(?:mcp/spain-legal|api/spain-legal)/?\s*\{)([^{}]*)(\})',update,source)
if count!=2:raise SystemExit(f'Expected exactly 2 MCP locations, found {count}; refusing change.')
try:
    available.write_text(patched)
    if not enabled.is_symlink():enabled.write_text(patched)
    subprocess.run(['/usr/sbin/nginx','-t'],check=True)
except BaseException:
    shutil.copy2(backup/'nginx-available',available)
    if not enabled.is_symlink():shutil.copy2(backup/'nginx-enabled',enabled)
    raise
print('Both MCP locations validated; reload separately after service activation.')
