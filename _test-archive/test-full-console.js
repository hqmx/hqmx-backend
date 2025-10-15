const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // 모든 콘솔 로그 캡처
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[${type.toUpperCase()}]`, text);
  });
  
  // 페이지 에러 캡처
  page.on('pageerror', error => {
    console.log('❌ Page Error:', error.message);
  });
  
  // 네트워크 실패 캡처
  page.on('requestfailed', request => {
    console.log('❌ Request Failed:', request.url(), request.failure().errorText);
  });
  
  console.log('\n=== Starting Test ===\n');
  await page.goto('https://hqmx.net');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  console.log('\n=== Uploading File ===\n');
  await page.locator('input[type="file"]').first().setInputFiles('./conv-test/test.avi');
  await page.waitForTimeout(2000);
  
  console.log('\n=== Selecting Format ===\n');
  await page.locator('.format-btn').filter({ hasText: 'MP4' }).first().click();
  await page.waitForTimeout(2000);
  
  console.log('\n=== Triggering Conversion via JavaScript ===\n');
  await page.evaluate(() => {
    const btn = document.getElementById('startConversionBtn');
    btn.style.display = 'block';
    btn.style.visibility = 'visible';
    
    // startConversion 함수 직접 호출
    if (typeof startConversion === 'function') {
      console.log('Calling startConversion()...');
      startConversion();
    } else {
      console.log('startConversion function not found, clicking button...');
      btn.click();
    }
  });
  
  console.log('\n=== Waiting for Activity ===\n');
  await page.waitForTimeout(10000);
  
  await browser.close();
  console.log('\n=== Test Complete ===');
})();
