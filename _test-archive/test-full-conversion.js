const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('✅ 1. Navigating to https://hqmx.net...');
  await page.goto('https://hqmx.net');
  await page.waitForLoadState('networkidle');
  
  console.log('✅ 2. Uploading test.avi file...');
  const fileInput = await page.locator('input[type="file"]');
  await fileInput.setInputFiles('./conv-test/test.avi');
  await page.waitForTimeout(1000);
  
  console.log('✅ 3. Selecting MP4 output format...');
  await page.click('button[data-format="mp4"]');
  await page.waitForTimeout(500);
  
  console.log('✅ 4. Starting conversion...');
  await page.click('button:has-text("변환 시작")');
  await page.waitForTimeout(2000);
  
  console.log('✅ 5. Monitoring console for fallback...');
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('fallback') || text.includes('서버')) {
      console.log('📝 Console:', text);
    }
  });
  
  console.log('✅ 6. Waiting for conversion to complete (max 30s)...');
  try {
    await page.waitForSelector('button:has-text("다운로드")', { timeout: 30000 });
    console.log('🎉 SUCCESS! Conversion completed, download button appeared!');
  } catch (e) {
    console.log('⏱️ Timeout or error:', e.message);
    console.log('📸 Taking screenshot for debugging...');
    await page.screenshot({ path: 'conversion-timeout.png' });
  }
  
  await browser.close();
  console.log('✅ Test completed!');
})();
