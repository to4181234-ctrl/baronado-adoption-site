import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',testMatch:'go-stage3.spec.mjs',workers:1,retries:0,
 timeout:60000,expect:{timeout:12000},
 use:{browserName:'chromium',headless:true,viewport:{width:390,height:844},
  baseURL:'http://127.0.0.1:3111',trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:{command:'npm run start -- --hostname 127.0.0.1 --port 3111',
  url:'http://127.0.0.1:3111/go/battle',reuseExistingServer:false,timeout:60000}
});
