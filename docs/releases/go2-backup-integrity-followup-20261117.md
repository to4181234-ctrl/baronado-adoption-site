# Backup integrity follow-up — 2026-11-18 KST

Continues PR #19 at 815ce758e1d5c39e1297793fcbfbe3623b0ec30e. No production changes or paid Supabase resources.

The previous offline verifier calculated SHA-256 values but only checked paths and byte sizes against the production metadata baseline. Same-size content corruption could pass. Its previous claim of content corruption detection must be limited to the tested mutation, not generalized.

The verifier now accepts `--expected-manifest` to compare file content hashes with a previously trusted successful manifest. A failed check cannot write a new trusted manifest. Bucket sets must match. Without a trusted manifest it explicitly says source content integrity is not established by metadata.

Example after obtaining a trusted archive and manifest:

```sh
python3 scripts/verify-go-storage-backup.py BACKUP_DIR BASELINE_JSON --expected-manifest TRUSTED_MANIFEST_JSON
```

A trusted manifest must be retained separately from the backup being checked. This does not prove the initial download matches the production source; that requires independent source verification.

Python regression verifies unchanged files pass, same-size changed content fails, missing files fail, and failed verification does not create a manifest. Production DB dump and original Storage backup remain unperformed; real Auth/Storage HTTP integration and deployment approval remain outstanding.
