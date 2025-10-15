const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('✅ 1. Navigating to https://hqmx.net...');
  await page.goto('https://hqmx.net');
  await page.waitForLoadState('networkidle');
  
  console.log('✅ 2. Uploading test.avi file...');
  const fileInput = await page.locator('input[type="file"]').first();
  await fileInput.setInputFiles('./conv-test/test.avi');
  await page.waitForTimeout(1000);
  
  console.log('✅ 3. Selecting MP4 output format...');
  await page.click('.format-btn[data-format="mp4"]');
  await page.waitForTimeout(500);
  
  console.log('✅ 4. Starting conversion...');
  await page.locator('button').filter({ hasText: '변환 시작' }).click();
  
  console.log('✅ 5. Waiting for API request...');
  await page.waitForTimeout(5000);
  
  console.log('✅ 6. Taking screenshot...');
  await page.screenshot({ path: 'conversion-test.png', fullPage: true });
  
  await browser.close();
  console.log('✅ Test completed! Check server logs for CORS debug messages.');
})();
