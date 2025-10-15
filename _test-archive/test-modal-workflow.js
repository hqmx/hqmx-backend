/**
 * 모달 워크플로우 테스트 - Convert 버튼 클릭 후 모달 구조 확인
 */

async function testModalWorkflow() {
  const { chromium } = await import('playwright');

  const browser = await chromium.launch({
    headless: false,
  });

  const page = await browser.newPage();

  console.log('🌐 https://hqmx.net 접속 중...');
  await page.goto('https://hqmx.net', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  console.log('✅ 사이트 로드 완료\n');

  // 1. 파일 업로드
  console.log('📤 JPG 파일 업로드 중...');
  const filePath = './conv-test/sc_04.07.18.09.08.2025.jpg';
  await page.setInputFiles('input[type="file"]', filePath);
  await page.waitForTimeout(3000);

  const fileItems = await page.locator('#fileList .file-item').count();
  console.log(`✅ 파일 업로드 완료: ${fileItems}개 파일\n`);

  // 2. Convert 버튼 찾기 및 클릭
  console.log('🔍 Convert 버튼 찾는 중...');

  // 여러 가능한 셀렉터 시도
  const possibleSelectors = [
    '.convert-btn',
    'button.convert-btn',
    '#fileList .convert-btn',
    '#fileList button:has-text("Convert")',
    '.file-item button:has-text("Convert")',
    'button:has-text("변환")',
  ];

  let convertBtn = null;
  for (const selector of possibleSelectors) {
    const count = await page.locator(selector).count();
    console.log(`  - ${selector}: ${count}개`);
    if (count > 0 && !convertBtn) {
      convertBtn = page.locator(selector).first();
    }
  }

  if (!convertBtn) {
    console.log('❌ Convert 버튼을 찾을 수 없습니다!');
    await page.screenshot({ path: 'modal-test-no-button.png', fullPage: true });
    await browser.close();
    return;
  }

  console.log('\n🔘 Convert 버튼 클릭...');
  await convertBtn.click();
  await page.waitForTimeout(2000);

  // 3. 모달 확인
  console.log('\n🔍 모달 상태 확인 중...');

  const modalSelectors = [
    '#conversionModal',
    '.conversion-modal',
    '.modal',
    '[role="dialog"]',
    '.modal-overlay',
  ];

  for (const selector of modalSelectors) {
    const count = await page.locator(selector).count();
    const visible = count > 0 ? await page.locator(selector).first().isVisible() : false;
    console.log(`  - ${selector}: ${count}개, 보임: ${visible}`);
  }

  // 4. 모달 내부 구조 분석
  console.log('\n🔍 모달 내부 포맷 선택 요소 찾기...');

  const formatSelectors = [
    '.format-badge',
    '.format-btn',
    '.format-option',
    'button[data-format]',
    '.format-badge[data-format]',
    '[data-format]',
    '.modal button',
    '.modal .format',
  ];

  for (const selector of formatSelectors) {
    const count = await page.locator(selector).count();
    console.log(`  - ${selector}: ${count}개`);

    if (count > 0 && count < 20) {
      // 처음 몇 개의 텍스트 확인
      const elements = await page.locator(selector).all();
      for (let i = 0; i < Math.min(elements.length, 5); i++) {
        const text = await elements[i].textContent();
        const dataFormat = await elements[i].getAttribute('data-format');
        console.log(`    [${i}] 텍스트: "${text?.trim()}", data-format: "${dataFormat}"`);
      }
    }
  }

  // 5. JavaScript 상태 확인
  console.log('\n🔍 JavaScript 상태 확인...');
  const jsState = await page.evaluate(() => {
    // 전역 변수 확인
    const globalVars = {
      hasConverterEngine: typeof window.converterEngine !== 'undefined',
      hasFFmpeg: typeof window.ffmpeg !== 'undefined',
      hasDOMElements: {
        conversionModal: !!document.getElementById('conversionModal'),
        formatOptions: !!document.getElementById('formatOptions'),
        startConversionBtn: !!document.getElementById('startConversionBtn'),
      },
    };

    // 모달 관련 DOM 요소 확인
    const modal = document.querySelector('#conversionModal, .conversion-modal, .modal');
    if (modal) {
      const modalInfo = {
        visible: modal.style.display !== 'none',
        classes: modal.className,
        id: modal.id,
        innerHTML: modal.innerHTML.substring(0, 500), // 처음 500자
      };
      globalVars.modalInfo = modalInfo;
    }

    return globalVars;
  });

  console.log('JavaScript 상태:', JSON.stringify(jsState, null, 2));

  // 6. 스크린샷 저장
  await page.screenshot({ path: 'modal-test-after-click.png', fullPage: true });
  console.log('\n📸 스크린샷 저장: modal-test-after-click.png');

  // 7. 10초간 브라우저 열어두기
  console.log('\n⏸️  10초간 브라우저 열어둠 (수동 확인 가능)...');
  await page.waitForTimeout(10000);

  await browser.close();
  console.log('\n✅ 테스트 완료!');
}

testModalWorkflow().catch(error => {
  console.error('❌ 오류:', error);
  process.exit(1);
});
