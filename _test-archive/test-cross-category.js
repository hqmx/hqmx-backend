/**
 * 크로스 카테고리 변환 테스트 - JPG → PDF
 * 카테고리 버튼 클릭 로직 검증
 */

async function testCrossCategoryConversion() {
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
    // 1. JPG 파일 업로드
    console.log('📤 JPG 파일 업로드 중...');
    const filePath = './conv-test/sc_04.07.18.09.08.2025.jpg';
    await page.setInputFiles('input[type="file"]', filePath);
    await page.waitForTimeout(3000);

    const fileItems = await page.locator('#fileList .file-item').count();
    console.log(`✅ 파일 업로드 완료: ${fileItems}개 파일\n`);

    // 2. Convert 버튼 클릭
    console.log('🔘 Convert 버튼 클릭 중...');
    const convertBtn = page.locator('.convert-btn').first();
    await convertBtn.click();
    await page.waitForTimeout(1500);

    const modalVisible = await page.locator('#conversionModal').isVisible();
    console.log(`✅ 모달 열림: ${modalVisible}\n`);

    // 3. 초기 카테고리 확인 (이미지여야 함)
    console.log('🔍 초기 카테고리 확인...');
    const imageBadges = await page.locator('.format-badge[data-format="png"], .format-badge[data-format="jpg"]').count();
    console.log(`  - 이미지 형식 뱃지: ${imageBadges}개`);

    const pdfBadgeInitial = await page.locator('.format-badge[data-format="pdf"]').count();
    console.log(`  - PDF 형식 뱃지 (초기): ${pdfBadgeInitial}개\n`);

    // 4. "문서" 카테고리 버튼 클릭
    console.log('📁 "문서" 카테고리 버튼 클릭...');
    const docCategoryBtn = page.locator('button:has-text("문서")').first();
    const docBtnExists = await docCategoryBtn.count() > 0;
    console.log(`  - 문서 버튼 존재: ${docBtnExists}`);

    if (docBtnExists) {
      await docCategoryBtn.click();
      await page.waitForTimeout(1000);
      console.log('✅ 문서 카테고리로 전환 완료\n');
    }

    // 5. PDF 형식 확인
    console.log('🔍 PDF 형식 뱃지 확인...');
    const pdfBadgeAfter = await page.locator('.format-badge[data-format="pdf"]').count();
    console.log(`  - PDF 형식 뱃지 (전환 후): ${pdfBadgeAfter}개`);

    if (pdfBadgeAfter > 0) {
      console.log('✅ PDF 형식 찾음!\n');

      // 6. PDF 선택
      console.log('🔧 PDF 형식 선택 중...');
      const pdfBadge = page.locator('.format-badge[data-format="pdf"]').first();
      await pdfBadge.click();
      await page.waitForTimeout(1000);
      console.log('✅ PDF 선택 완료\n');

      // 7. 변환 시작
      console.log('⚙️  변환 시작...');
      const startBtn = page.locator('#startConversionBtn').first();
      await startBtn.click();

      // 8. 변환 완료 대기
      console.log('⏳ 변환 완료 대기 중 (최대 60초)...\n');
      const downloadPromise = page.waitForEvent('download', { timeout: 60000 });

      await page.waitForSelector(
        'button:has-text("Download"), a:has-text("Download"), .download-btn',
        { timeout: 60000 }
      );

      console.log('✅ 변환 완료!\n');

      // 다운로드
      console.log('⬇️  다운로드 시작...');
      const downloadBtn = page.locator('button:has-text("Download"), a:has-text("Download"), .download-btn').first();
      await downloadBtn.click();

      const download = await downloadPromise;
      const downloadPath = `./test-downloads/${download.suggestedFilename()}`;

      await download.saveAs(downloadPath);
      console.log(`✅ 다운로드 완료: ${downloadPath}\n`);

      // 성공!
      console.log('🎉 크로스 카테고리 변환 테스트 성공!');
      console.log('   - 파일: JPG → PDF');
      console.log('   - 카테고리 전환: 이미지 → 문서');
      console.log('   - 변환 및 다운로드: ✅');
    } else {
      console.log('❌ 문서 카테고리로 전환했지만 PDF 형식을 찾을 수 없음');
      await page.screenshot({ path: 'cross-category-error.png', fullPage: true });
    }

  } catch (error) {
    console.error(`\n❌ 테스트 실패: ${error.message}`);
    await page.screenshot({ path: 'cross-category-error.png', fullPage: true });
    console.log('📸 에러 스크린샷 저장: cross-category-error.png');
  } finally {
    console.log('\n⏸️  5초 후 브라우저 종료...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

testCrossCategoryConversion().catch(error => {
  console.error('❌ 최종 오류:', error);
  process.exit(1);
});
