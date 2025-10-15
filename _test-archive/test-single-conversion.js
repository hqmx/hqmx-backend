/**
 * 단일 변환 완전 테스트 - jpg → png
 * 파일 업로드 → 모달 열기 → 형식 선택 → 변환 시작 → 다운로드
 */

async function testSingleConversion() {
  const { chromium } = await import('playwright');

  const browser = await chromium.launch({
    headless: false,
  });

  const page = await browser.newPage();

  console.log('🌐 https://hqmx.net 접속 중...');
  await page.goto('https://hqmx.net', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  console.log('✅ 사이트 로드 완료\n');

  try {
    // 1. 파일 업로드
    console.log('📤 JPG 파일 업로드 중...');
    const filePath = './conv-test/sc_04.07.18.09.08.2025.jpg';
    await page.setInputFiles('input[type="file"]', filePath);
    await page.waitForTimeout(3000);

    const fileItems = await page.locator('#fileList .file-item').count();
    console.log(`✅ 파일 업로드 완료: ${fileItems}개 파일\n`);

    if (fileItems === 0) {
      throw new Error('파일이 업로드되지 않았습니다');
    }

    // 2. Convert 버튼 클릭
    console.log('🔘 Convert 버튼 클릭 중...');
    const convertBtn = page.locator('.convert-btn').first();
    await convertBtn.click();
    await page.waitForTimeout(1500);

    // 3. 모달 확인
    const modalVisible = await page.locator('#conversionModal').isVisible();
    console.log(`✅ 모달 열림: ${modalVisible}\n`);

    if (!modalVisible) {
      throw new Error('모달이 열리지 않았습니다');
    }

    // 4. PNG 형식 뱃지 클릭
    console.log('🔧 PNG 형식 선택 중...');
    const formatBadge = page.locator('.format-badge[data-format="png"]').first();
    const badgeCount = await formatBadge.count();
    console.log(`  - PNG 뱃지 찾음: ${badgeCount}개`);

    if (badgeCount === 0) {
      throw new Error('PNG 형식 뱃지를 찾을 수 없습니다');
    }

    await formatBadge.click();
    await page.waitForTimeout(1000);
    console.log('✅ PNG 형식 선택 완료\n');

    // 5. Start Conversion 버튼 찾기 및 클릭
    console.log('⚙️  변환 시작 버튼 찾는 중...');

    const startBtnSelectors = [
      '#startConversionBtn',
      'button:has-text("Start Conversion")',
      'button:has-text("변환 시작")',
      '.modal-footer button.primary',
      '.modal button.primary',
    ];

    let startBtn = null;
    for (const selector of startBtnSelectors) {
      const count = await page.locator(selector).count();
      console.log(`  - ${selector}: ${count}개`);
      if (count > 0 && !startBtn) {
        startBtn = page.locator(selector).first();
      }
    }

    if (!startBtn) {
      throw new Error('변환 시작 버튼을 찾을 수 없습니다');
    }

    console.log('🚀 변환 시작 버튼 클릭...\n');
    await startBtn.click();

    // 6. 변환 완료 대기
    console.log('⏳ 변환 완료 대기 중 (최대 60초)...');

    try {
      // 다운로드 이벤트 감지
      const downloadPromise = page.waitForEvent('download', { timeout: 60000 });

      // 변환 완료 신호 대기
      await page.waitForSelector(
        'button:has-text("Download"), a:has-text("Download"), .download-btn, .success',
        { timeout: 60000 }
      );

      console.log('✅ 변환 완료!\n');

      // 다운로드 시작
      console.log('⬇️  다운로드 시작...');
      const downloadBtn = page.locator('button:has-text("Download"), a:has-text("Download"), .download-btn').first();
      await downloadBtn.click();

      const download = await downloadPromise;
      const downloadPath = `./test-downloads/${download.suggestedFilename()}`;

      await download.saveAs(downloadPath);
      console.log(`✅ 다운로드 완료: ${downloadPath}`);

      // 성공!
      console.log('\n🎉 테스트 성공!');
      console.log('   - 파일 업로드: ✅');
      console.log('   - 모달 열기: ✅');
      console.log('   - 형식 선택: ✅');
      console.log('   - 변환 실행: ✅');
      console.log('   - 다운로드: ✅');

    } catch (error) {
      console.log(`⚠️  변환 또는 다운로드 타임아웃: ${error.message}`);
      throw error;
    }

  } catch (error) {
    console.error(`\n❌ 테스트 실패: ${error.message}`);
    await page.screenshot({ path: 'test-single-error.png', fullPage: true });
    console.log('📸 에러 스크린샷 저장: test-single-error.png');
    throw error;
  } finally {
    console.log('\n⏸️  5초 후 브라우저 종료...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

testSingleConversion().catch(error => {
  console.error('❌ 최종 오류:', error);
  process.exit(1);
});
