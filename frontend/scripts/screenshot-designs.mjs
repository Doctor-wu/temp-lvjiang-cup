import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = '/Users/doctorwu/Projects/Self/lvjiangbei';
const designDir = path.join(root, 'docs/02-UI 设计文档/v4-redesign');
const outDir = path.join(designDir, 'screenshots');
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();

const desktop = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const dp = await desktop.newPage();
await dp.goto(pathToFileURL(path.join(designDir, 'desktop.html')).href);
await dp.waitForLoadState('networkidle').catch(() => {});
await dp.waitForTimeout(3000);
await dp.screenshot({ path: path.join(outDir, 'desktop.png'), fullPage: true });

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const mp = await mobile.newPage();
await mp.goto(pathToFileURL(path.join(designDir, 'mobile.html')).href);
await mp.waitForLoadState('networkidle').catch(() => {});
await mp.waitForTimeout(3000);
await mp.screenshot({ path: path.join(outDir, 'mobile.png'), fullPage: true });

await browser.close();
console.log('Screenshots saved to', outDir);
