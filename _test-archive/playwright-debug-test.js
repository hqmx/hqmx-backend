const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // 네트워크 요청 모니터링
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log('📤 API Request:', request.method(), request.url());
      console.log('   Headers:', JSON.stringify(request.headers(), null, 2));
    }
  });
  
  page.on('response', async response => {
    if (response.url().includes('/api/')) {
      console.log('📥 API Response:', response.status(), response.url());
      console.log('   Headers:', JSON.stringify(response.headers(), null, 2));
    }
  });
  
  // 콘솔 로그 모니터링
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('CORS') || text.includes('fallback') || text.includes('서버') || text.includes('Error')) {
      console.log('🖥️  Console:', text);
    }
  });
  
  console.log('✅ 1. Navigating to https://hqmx.net...');
  await page.goto('https://hqmx.net');
  await page.waitForLoadState('networkidle');
  
  console.log('✅ 2. Taking initial screenshot...');
  await page.screenshot({ path: 'step-1-loaded.png' });
  
  console.log('✅ 3. Uploading test.avi file...');
  const fileInput = await page.locator('input[type="file"]').first();
  await fileInput.setInputFiles('./conv-test/test.avi');
  await page.waitForTimeout(1000);
  
  console.log('✅ 4. Taking screenshot after upload...');
  await page.screenshot({ path: 'step-2-uploaded.png' });
  
  console.log('✅ 5. Looking for format buttons...');
  const formatButtons = await page.locator('.format-btn').count();
  console.log(`   Found ${formatButtons} format buttons`);
  
  // MP4 버튼 찾기 (여러 방법 시도)
  let mp4Button = null;
  try {
    mp4Button = page.locator('.format-btn').filter({ hasText: 'MP4' }).first();
    await mp4Button.waitFor({ timeout: 5000 });
    console.log('✅ 6. Found MP4 button by text');
  } catch (e) {
    console.log('⚠️  Could not find MP4 button by text, trying data attribute...');
    mp4Button = page.locator('[data-format="mp4"]').first();
    await mp4Button.waitFor({ timeout: 5000 });
    console.log('✅ 6. Found MP4 button by data attribute');
  }
  
  await mp4Button.click();
  await page.waitForTimeout(500);
  
  console.log('✅ 7. Taking screenshot after format selection...');
  await page.screenshot({ path: 'step-3-format-selected.png' });
  
  console.log('✅ 8. Starting conversion...');
  const convertButton = page.locator('button').filter({ hasText: '변환 시작' }).first();
  await convertButton.click();
  
  console.log('✅ 9. Waiting for API request (10 seconds)...');
  await page.waitForTimeout(10000);
  
  console.log('✅ 10. Taking final screenshot...');
  await page.screenshot({ path: 'step-4-conversion-started.png', fullPage: true });
  
  await browser.close();
  console.log('\n✅ Test completed! Check:');
  console.log('   - Screenshots: step-*.png files');
  console.log('   - Server logs above for [CORS] debug messages');
})();
