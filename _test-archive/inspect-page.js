/**
 * HQMX Converter - 페이지 구조 확인 스크립트
 *
 * 실제 페이지의 HTML 구조를 확인하여 올바른 selector를 찾습니다.
 */

const fs = require('fs');

async function inspectPage() {
  const { chromium } = await import('playwright');

  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('🌐 https://hqmx.net 접속 중...');
  await page.goto('https://hqmx.net', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  console.log('✅ 사이트 로드 완료');

  // 파일 업로드
  console.log('\n📤 JPG 파일 업로드 중...');
  const fileInput = await page.locator('input[type="file"]').first();
  await fileInput.setInputFiles('./conv-test/sc_04.07.18.09.08.2025.jpg');
  console.log('⏳ 파일 처리 대기 (5초)...');
  await page.waitForTimeout(5000); // 파일 처리를 위해 충분히 대기
  console.log('✅ 파일 업로드 및 처리 완료');

  // 스크린샷 저장
  console.log('\n📸 스크린샷 저장 중...');
  await page.screenshot({ path: 'page-after-upload.png', fullPage: true });
  console.log('✅ 스크린샷 저장: page-after-upload.png');

  // 페이지 HTML 구조 확인
  console.log('\n🔍 페이지 구조 분석 중...');

  // 1. Select 요소 확인
  const selects = await page.locator('select').all();
  console.log(`\nSelect 요소: ${selects.length}개 발견`);
  for (let i = 0; i < selects.length; i++) {
    const select = selects[i];
    const id = await select.getAttribute('id');
    const name = await select.getAttribute('name');
    const className = await select.getAttribute('class');
    console.log(`  [${i}] id="${id}" name="${name}" class="${className}"`);

    // 옵션 확인
    const options = await select.locator('option').all();
    console.log(`      옵션 ${options.length}개:`);
    for (let j = 0; j < Math.min(options.length, 10); j++) {
      const option = options[j];
      const value = await option.getAttribute('value');
      const text = await option.textContent();
      console.log(`        - value="${value}" text="${text}"`);
    }
  }

  // 2. 버튼 확인 (형식 선택 버튼)
  const formatButtons = await page.locator('button').all();
  console.log(`\n모든 버튼: ${formatButtons.length}개 발견`);

  const imageFormatButtons = [];
  for (let i = 0; i < formatButtons.length; i++) {
    const btn = formatButtons[i];
    const text = await btn.textContent();
    const className = await btn.getAttribute('class');
    const id = await btn.getAttribute('id');

    // 이미지 형식으로 보이는 버튼만 필터링
    const imageFormats = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF', 'BMP', 'TIFF', 'SVG', 'PDF'];
    const cleanText = text?.trim().toUpperCase() || '';

    if (imageFormats.some(fmt => cleanText.includes(fmt))) {
      imageFormatButtons.push({ index: i, text: cleanText, className, id });
      console.log(`  [${i}] 형식 버튼: text="${cleanText}" class="${className}" id="${id}"`);
    }
  }

  console.log(`\n이미지 형식 버튼: ${imageFormatButtons.length}개 발견`);

  // 3. 변환 시작 버튼 확인
  const convertButtons = await page.locator('button:has-text("Start"), button:has-text("Convert"), button:has-text("변환")').all();
  console.log(`\n변환 시작 버튼: ${convertButtons.length}개 발견`);
  for (let i = 0; i < convertButtons.length; i++) {
    const btn = convertButtons[i];
    const id = await btn.getAttribute('id');
    const className = await btn.getAttribute('class');
    const text = await btn.textContent();
    console.log(`  [${i}] id="${id}" class="${className}" text="${text}"`);
  }

  // 4. 전체 페이지 HTML 저장 (디버깅용)
  const html = await page.content();
  fs.writeFileSync('page-structure.html', html);
  console.log('\n✅ HTML 구조 저장: page-structure.html');

  console.log('\n⏸️  브라우저를 30초간 열어둡니다. 수동으로 확인해보세요...');
  await page.waitForTimeout(30000);

  await browser.close();
  console.log('\n✅ 완료!');
}

inspectPage().catch(error => {
  console.error('❌ 오류:', error);
  process.exit(1);
});
