# Isolated real HTTP integration QA

This harness starts actual PostgreSQL, PostgREST, Supabase Storage and Next.js processes on loopback only. It uses synthetic members/photos and real password/HMAC sessions; there are no mocked HTTP responses. It never reads production credentials or contacts the production database. The disposable local `go_integration_http` database is recreated on each run.

Runtime prerequisites (kept outside Git): Node 24, `embedded-postgres@18.6.0-beta.19`, `pg@8.16.3`, PostgREST v16.6 static Linux binary, and a built official Supabase Storage v1.26.1 checkout (`681287a`). Storage uses its real local-file backend and migrations. This is not an exact copy of managed Supabase infrastructure; production PostgreSQL is 17.6, the QA binary is 18.6, and external Google OAuth/device hardware are not tested.

Create a dedicated runtime folder with these Node dependencies, its `package.json`, a `postgrest` executable, and the official checkout at `storage-source/` with dependencies and `npm run build` complete. Install the application's locked dependencies and build it first.

```sh
GO_HTTP_QA_RUNTIME=/absolute/path/to/qa-runtime node tests/http-qa/run-http-qa.mjs
```

The runtime directory contains generated local-only JWTs, disposable database/files, component logs, and `http-result.json`. Never commit these files. Runtime role keys and passwords are synthetic and cannot authenticate to production. To reproduce independently, use the exact component versions above. The retained baseline SQL is read-only production function/schema structure, without production records.

Checks cover private uploads/signed download, anon/authenticated RPC denial, two-member password login, sessions, 200/300C purchases and sequential/concurrent idempotency, affordability races, foreign-card/third-member denial, two-member PvP result/history/reconnection, real administrator image upload/publication/pause/resume, published-photo preservation, daily draw idempotency, care and visit rewards. Visit testing follows the actual KST request window; outside the window it verifies denial instead of approval. Boundary 09:00/21:00 cases are covered by Node tests.
