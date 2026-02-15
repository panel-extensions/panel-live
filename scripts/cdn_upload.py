"""Upload panel-live JS/CSS assets to cdn.holoviz.org S3 bucket.

NOTE: This is a secondary/backup distribution channel. The primary
distribution is via npm (served by jsDelivr at
cdn.jsdelivr.net/npm/@panel-extensions/panel-live@latest/dist/).

Reads the version from package.json and syncs the dist/ directory to:
  1. s3://cdn.holoviz.org/panel-live/{version}/  (versioned)
  2. s3://cdn.holoviz.org/panel-live/latest/      (latest alias)

Usage:
  python scripts/cdn_upload.py

Requires AWS credentials configured via environment variables:
  AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY

Modeled after Panel's scripts/cdn_upload.py.
"""

import json
import subprocess
import sys
from pathlib import Path

BUCKET = "s3://cdn.holoviz.org/panel-live"
DIST_DIR = Path(__file__).resolve().parent.parent / "dist"
PACKAGE_JSON = Path(__file__).resolve().parent.parent / "package.json"


def get_version():
    """Read version from package.json."""
    with open(PACKAGE_JSON) as f:
        data = json.load(f)
    version = data.get("version")
    if not version:
        print("ERROR: No 'version' field in package.json", file=sys.stderr)
        sys.exit(1)
    return version


def s3_sync(source, dest):
    """Run aws s3 sync with appropriate flags."""
    cmd = [
        "aws",
        "s3",
        "sync",
        str(source),
        dest,
        "--delete",
        "--cache-control",
        "max-age=3600",
        "--region",
        "us-east-1",
    ]
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, check=False)
    if result.returncode != 0:
        print(f"ERROR: s3 sync failed with exit code {result.returncode}", file=sys.stderr)
        sys.exit(result.returncode)


def main():
    """Upload dist/ to versioned and latest S3 paths."""
    if not DIST_DIR.exists():
        print(f"ERROR: dist/ directory not found at {DIST_DIR}", file=sys.stderr)
        sys.exit(1)

    version = get_version()
    print(f"Uploading panel-live v{version} to CDN")

    # Upload to versioned path
    versioned_dest = f"{BUCKET}/{version}/"
    print(f"\n--- Uploading to {versioned_dest} ---")
    s3_sync(DIST_DIR, versioned_dest)

    # Upload to latest alias
    latest_dest = f"{BUCKET}/latest/"
    print(f"\n--- Uploading to {latest_dest} ---")
    s3_sync(DIST_DIR, latest_dest)

    print("\nDone. Assets available at:")
    print(f"  https://cdn.holoviz.org/panel-live/{version}/panel-live.js")
    print("  https://cdn.holoviz.org/panel-live/latest/panel-live.js")


if __name__ == "__main__":
    main()
