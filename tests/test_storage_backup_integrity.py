import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/verify-go-storage-backup.py'

class BackupIntegrity(unittest.TestCase):
    def test_same_size_corruption_and_failed_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            storage = root / 'storage'
            bucket = storage / 'cards'
            bucket.mkdir(parents=True)
            photo = bucket / 'photo.png'
            photo.write_bytes(b'abcd')
            baseline = root / 'baseline.json'
            baseline.write_text(json.dumps({'buckets': {'cards': {
                'objects': 1, 'bytes': 4,
                'names_sizes_md5': hashlib.md5(b'photo.png:4').hexdigest()
            }}}))
            manifest = root / 'trusted.json'
            def run(*args):
                return subprocess.run([sys.executable, str(SCRIPT), str(storage),
                                       str(baseline), *map(str, args)], capture_output=True, text=True)
            self.assertEqual(run('--manifest', manifest).returncode, 0)
            self.assertEqual(run('--expected-manifest', manifest).returncode, 0)
            photo.write_bytes(b'wxyz')
            # Metadata alone cannot establish content integrity.
            self.assertEqual(run().returncode, 0)
            failed_manifest = root / 'failed.json'
            self.assertEqual(run('--expected-manifest', manifest,
                                 '--manifest', failed_manifest).returncode, 1)
            self.assertFalse(failed_manifest.exists())
            photo.unlink()
            self.assertEqual(run('--expected-manifest', manifest).returncode, 1)

if __name__ == '__main__':
    unittest.main()
