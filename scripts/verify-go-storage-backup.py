#!/usr/bin/env python3
"""Verify a manually downloaded OFFLINE Supabase Storage backup.

Read only: does not connect to Supabase, upload objects, delete files, or
store authentication secrets. The optional detail manifest belongs ONLY
on the user's encrypted backup volume, never in GitHub.

Run:
 python3 scripts/verify-go-storage-backup.py \
   /absolute/path/to/private-backup/storage \
   docs/releases/go2-storage-baseline-20261117.json \
   --manifest /absolute/path/to/private-backup/file-checksums.json
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

def inspect(bucket_dir):
    if not bucket_dir.is_dir():
        return {"files": [], "bytes": 0}
    if bucket_dir.is_symlink():
        raise ValueError(f"refusing symlink bucket: {bucket_dir}")
    files = []
    for path in bucket_dir.rglob('*'):
        if path.is_symlink():
            raise ValueError(f"refusing symlink file: {path}")
        if path.is_file() and path.name != '.DS_Store':
            rel = path.relative_to(bucket_dir).as_posix()
            if rel.startswith('/') or '..' in Path(rel).parts:
                raise ValueError('unsafe relative path')
            files.append({"name": rel, "size": path.stat().st_size,
                          "sha256": digest(path)})
    return {"files": sorted(files, key=lambda x: x['name']),
            "bytes": sum(item["size"] for item in files)}

def main():
    p = argparse.ArgumentParser()
    p.add_argument("backup_storage_dir", type=Path)
    p.add_argument("baseline", type=Path)
    p.add_argument("--manifest", type=Path,
                   help="optional local private manifest file; never commit")
    args = p.parse_args()
    base = json.loads(args.baseline.read_text(encoding="utf-8"))
    dest = args.backup_storage_dir
    if not dest.is_dir():
        p.error("downloaded Storage directory not found")
    results = {}
    failed = False
    for bucket, expected in base["buckets"].items():
        current = inspect(dest / bucket)
        files, total = current["files"], current["bytes"]
        names_sizes = "\n".join(f"{f['name']}:{f['size']}" for f in files)
        metadata_md5 = hashlib.md5(names_sizes.encode("utf-8")).hexdigest() if files else None
        ok = (len(files) == expected["objects"] and
              total == expected["bytes"] and
              metadata_md5 == expected.get("names_sizes_md5"))
        results[bucket] = {
            "files": files, "file_count": len(files),
            "total_bytes": total, "names_sizes_md5": metadata_md5,
            "expected": expected, "ok": ok,
        }
        print(f"{bucket}: {len(files)} files, {total} bytes, "
              f"names/sizes manifest match={metadata_md5 == expected.get('names_sizes_md5')}, "
              f"PASS={ok}")
        failed |= not ok
    if args.manifest:
        args.manifest.parent.mkdir(parents=True, exist_ok=True)
        if args.manifest.exists():
            p.error("will not overwrite previous checksum manifest")
        fd = os.open(args.manifest, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(results, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
    if failed:
        print("FAIL: missing/extra/changed files. Check download, then refresh the "
              "baseline with new READ-ONLY production metadata if users added files.",
              file=sys.stderr)
        return 1
    print("PASS: downloaded object counts, exact bytes, and paths/sizes match baseline.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
