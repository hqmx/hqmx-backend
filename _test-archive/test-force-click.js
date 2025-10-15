const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // 네트워크 모니터링
  page.on('request', req => {
    if (req.url().includes('/api/convert')) {
      console.log('📤 /api/convert request:', req.method());
      console.log('   Origin:', req.headers()['origin']);
    }
  });
  
  page.on('response', async res => {
    if (res.url().includes('/api/convert')) {
      console.log('📥 /api/convert response:', res.status());
      try {
        const body = await res.text();
        console.log('   Body:', body.substring(0, 200));
      } catch (e) {}
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
  
  console.log('✅ 4. Checking button state...');
  const button = page.locator('#startConversionBtn');
  const isVisible = await button.isVisible();
  const isEnabled = await button.isEnabled();
  const buttonText = await button.textContent();
  console.log(`   Visible: ${isVisible}, Enabled: ${isEnabled}, Text: "${buttonText}"`);
  
  console.log('✅ 5. Force clicking button...');
  await button.click({ force: true });
  
  console.log('✅ 6. Waiting for network activity (10s)...');
  await page.waitForTimeout(10000);
  
  await page.screenshot({ path: 'force-click-result.png', fullPage: true });
  await browser.close();
  console.log('✅ Done! Check server logs.');
})();
