import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',testMatch:'go-stage2.spec.mjs',workers:1,retries:0,
 timeout:30000,expect:{timeout:10000},
 use:{browserName:'chromium',headless:true,viewport:{width:390,height:844},
  baseURL:'http://127.0.0.1:3110',trace:'off',screenshot:'off'},
 webServer:{command:'npm run start -- --hostname 127.0.0.1 --port 3110',
  url:'http://127.0.0.1:3110/go',reuseExistingServer:false,timeout:60000}
});
