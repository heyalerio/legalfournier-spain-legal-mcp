#!/usr/bin/env python3
"""Apply only the reviewed lead handler change; refuse source drift."""
from pathlib import Path
import argparse
import datetime
import os
import shutil
import subprocess
import tempfile

parser = argparse.ArgumentParser()
parser.add_argument("--plugin", required=True)
parser.add_argument("--backup-dir", required=True)
args = parser.parse_args()
base = Path(__file__).resolve().parent
plugin = Path(args.plugin)
source = plugin.read_text()
original = (base / "wordpress-agent-handler.original.txt").read_text()
replacement = (base / "wordpress-agent-handler.replacement.txt").read_text()
helper = (base / "wordpress-agent-idempotency.php").read_text().removeprefix("<?php\n")
if "function lf_agent_lead_operation_record(" in source:
    if replacement not in source or helper not in source:
        raise SystemExit("Existing idempotency implementation differs; inspect before updating.")
    print("WordPress idempotency patch already installed")
    raise SystemExit(0)
if source.count(original) != 1:
    raise SystemExit("Lead handler changed; refusing to overwrite unreviewed changes.")
patched = source.replace(original, helper + "\n" + replacement)
backup_dir = Path(args.backup_dir)
backup_dir.mkdir(parents=True, exist_ok=True)
backup = backup_dir / (plugin.name + "." + datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ"))
shutil.copy2(plugin, backup)
staged = backup_dir / "legal-fournier-core.staged.php"
staged.write_text(patched)
subprocess.run(["php", "-l", str(staged)], check=True)
# Replace atomically only after syntax validation; preserve ownership/mode.
metadata = plugin.stat()
fd, temporary = tempfile.mkstemp(prefix=".lf-core-", dir=plugin.parent)
try:
    with os.fdopen(fd, "w") as output:
        output.write(patched)
        output.flush()
        os.fsync(output.fileno())
    os.chmod(temporary, metadata.st_mode & 0o7777)
    os.chown(temporary, metadata.st_uid, metadata.st_gid)
    # Preserve the maintenance ACL that lets Sara administer WordPress without
    # granting PHP or the MCP user host privileges. Keep the new content mtime.
    for attribute in os.listxattr(plugin):
        os.setxattr(temporary, attribute, os.getxattr(plugin, attribute))
    os.replace(temporary, plugin)
finally:
    if os.path.exists(temporary):
        os.unlink(temporary)
subprocess.run(["php", "-l", str(plugin)], check=True)
print("Installed lead retry guard; backup:", backup)
