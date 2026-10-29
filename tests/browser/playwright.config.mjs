import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'.',testMatch:'*.spec.mjs',timeout:20000,expect:{timeout:5000},fullyParallel:false,workers:5,retries:0,maxFailures:6,
 reporter:[['list'],['html',{outputFolder:'report',open:'never'}],['json',{outputFile:'results.json'}]],
 outputDir:'artifacts',use:{baseURL:'http://127.0.0.1:4173',trace:'on',screenshot:'on',video:'off',
 launchOptions:{...(process.env.ENC_CHROMIUM_PATH?{executablePath:process.env.ENC_CHROMIUM_PATH}:{}),args:['--no-sandbox']}},
 projects:[[320,568],[360,800],[390,844],[768,1024],[1440,900]].map(([width,height])=>({name:`chromium-${width}x${height}`,use:{browserName:'chromium',viewport:{width,height}}})),
 webServer:{cwd:new URL('../../',import.meta.url).pathname,command:'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort',url:'http://127.0.0.1:4173',reuseExistingServer:false,timeout:30000}
});
