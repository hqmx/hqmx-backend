/**
 * 빠른 단일 파일 테스트 - 파일 업로드가 제대로 작동하는지 확인
 */

async function quickTest() {
  const { chromium } = await import('playwright');

  const browser = await chromium.launch({
    headless: false,
  });

  const page = await browser.newPage();

  console.log('🌐 https://hqmx.net 접속 중...');
  await page.goto('https://hqmx.net', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  console.log('✅ 사이트 로드 완료');

  console.log('\n📤 JPG 파일 업로드 시도...');
  const filePath = './conv-test/sc_04.07.18.09.08.2025.jpg';

  // page.setInputFiles 사용 (이벤트 자동 발생)
  await page.setInputFiles('input[type="file"]', filePath);

  console.log('⏳ 3초 대기...');
  await page.waitForTimeout(3000);

  // 파일 리스트 확인
  const fileItems = await page.locator('#fileList .file-item').count();
  console.log(`📋 파일 리스트 항목: ${fileItems}개`);

  // 포맷 버튼 확인
  const formatButtons = await page.locator('button.format-btn').all();
  console.log(`🔘 포맷 버튼: ${formatButtons.length}개`);

  if (formatButtons.length > 0) {
    for (let i = 0; i < Math.min(formatButtons.length, 10); i++) {
      const btn = formatButtons[i];
      const text = await btn.textContent();
      const visible = await btn.isVisible();
      console.log(`  [${i}] ${text.trim()} - ${visible ? '보임' : '숨김'}`);
    }
  }

  // 스크린샷
  await page.screenshot({ path: 'quick-test-screenshot.png', fullPage: true });
  console.log('\n📸 스크린샷 저장: quick-test-screenshot.png');

  console.log('\n⏸️  10초간 브라우저 열어둠...');
  await page.waitForTimeout(10000);

  await browser.close();
  console.log('\n✅ 테스트 완료!');
}

quickTest().catch(error => {
  console.error('❌ 오류:', error);
  process.exit(1);
});
