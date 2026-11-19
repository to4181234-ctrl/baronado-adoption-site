#!/usr/bin/env node
/**
 * MeongGO stage-1 isolated PostgreSQL test-environment preflight.
 * READ-ONLY: does not start services, connect to databases, mutate files, or deploy.
 * Run in the project's root: node scripts/meonggo2-stage1-preflight.mjs
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const LIVE_REF = 'reksykfnutjtfdotidua';
function run(bin, args) {
  try {
    const p = spawnSync(bin, args, {encoding:'utf8', timeout:8000, stdio:['ignore','pipe','pipe']});
    return {available: !p.error && p.status === 0, output: (p.stdout||p.stderr||'').trim().split('\n')[0].slice(0,180)};
  } catch { return {available:false,output:''}; }
}
const git = run('git',['branch','--show-current']);
const docker = run('docker',['info','--format','{{.ServerVersion}}']);
const cli = run('supabase',['--version']);
const devBranch = git.available && git.output === 'work/meonggo2-next-update-staging-20261119';
const hasConfig = existsSync('supabase/config.toml');
const hasMigrations = existsSync('supabase/migrations');
const productionEnvNames = ['DATABASE_URL','DIRECT_URL','POSTGRES_URL','POSTGRES_PRISMA_URL','SUPABASE_DB_URL',
  'NEXT_PUBLIC_SUPABASE_URL','SUPABASE_URL'];
const leakedLiveEnvNames = productionEnvNames.filter(name => String(process.env[name]||'').includes(LIVE_REF));
// Never print secret values, connection strings, or production data.
const checks = [
  {name:'Working in isolated GitHub branch',ok:devBranch,details:git.output||'Git branch unavailable'},
  {name:'Docker daemon available',ok:docker.available,details:docker.output||'not installed / not running'},
  {name:'Supabase CLI installed',ok:cli.available,details:cli.output||'not installed'},
  {name:'Local Supabase config present',ok:hasConfig,details:hasConfig?'present':'missing'},
  {name:'Local migrations present',ok:hasMigrations,details:hasMigrations?'present':'missing'},
  {name:'No live production DB endpoints in process environment',ok:leakedLiveEnvNames.length===0,
    details:leakedLiveEnvNames.length?'unsafe env variable names: '+leakedLiveEnvNames.join(', '):'pass'}
];
for(const c of checks) console.log((c.ok?'PASS':'BLOCK')+' | '+c.name+' | '+c.details);
const ready = checks.every(c=>c.ok);
console.log(ready
  ? '\nREADY: prerequisites for a local-only Supabase DB were detected; no database started.'
  : '\nNOT READY: local-only PostgreSQL testing must not be claimed as completed.');
process.exitCode = ready ? 0 : 2;
