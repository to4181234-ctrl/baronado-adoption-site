import path from 'node:path';import {createRequire} from 'node:module';
export const scriptRoot=path.dirname(new URL(import.meta.url).pathname);
export const repoRoot=path.resolve(scriptRoot,'../..');
export const runtimeRoot=path.resolve(process.env.GO_HTTP_QA_RUNTIME||path.join(repoRoot,'.qa-http-runtime'));
export const runtimeRequire=createRequire(path.join(runtimeRoot,'package.json'));
