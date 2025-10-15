const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // 네트워크 모니터링
  page.on('request', req => {
    if (req.url().includes('/api/')) {
      console.log('📤 API Request:', req.url());
      console.log('   Method:', req.method());
      console.log('   Origin:', req.headers()['origin'] || 'none');
    }
  });
  
  page.on('response', async res => {
    if (res.url().includes('/api/')) {
      console.log('📥 API Response:', res.status(), res.url());
      const headers = res.headers();
      if (headers['access-control-allow-origin']) {
        console.log('   CORS header:', headers['access-control-allow-origin']);
      }
    }
  });
  
  console.log('✅ 1. Navigating...');
  await page.goto('https://hqmx.net');
  await page.waitForLoadState('networkidle');
  
  console.log('✅ 2. Uploading file...');
  await page.locator('input[type="file"]').first().setInputFiles('./conv-test/test.avi');
  await page.waitForTimeout(1000);
  
  console.log('✅ 3. Selecting MP4 format...');
  await page.locator('.format-btn').filter({ hasText: 'MP4' }).first().click();
  await page.waitForTimeout(500);
  
  console.log('✅ 4. Making button visible and clicking with JavaScript...');
  await page.evaluate(() => {
    const btn = document.getElementById('startConversionBtn');
    if (btn) {
      btn.style.display = 'block';
      btn.style.visibility = 'visible';
      btn.style.opacity = '1';
      console.log('Button made visible');
      btn.click();
      console.log('Button clicked');
    }
  });
  
  console.log('✅ 5. Waiting for API request (15s)...');
  await page.waitForTimeout(15000);
  
  await page.screenshot({ path: 'js-click-result.png', fullPage: true });
  await browser.close();
  console.log('✅ Done! Check server logs for [CORS] debug messages.');
})();
