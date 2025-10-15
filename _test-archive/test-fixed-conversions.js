/**
 * 수정된 변환만 빠르게 테스트
 * - gif → mp4 (CROSS_CATEGORY_COMPATIBILITY 수정)
 * - jpg → avif (FORMATS 추가)
 * - png → avif (FORMATS 추가)
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  baseURL: 'https://hqmx.net',
  testFilesDir: './conv-test',
  downloadsDir: './test-downloads',
  timeout: 60000, // 1분 (Canvas+MediaRecorder는 빠름)
  headless: false,
};

// 테스트할 변환들
const TESTS = [
  { from: 'gif', to: 'mp4', file: 'test.gif' },
  { from: 'jpg', to: 'avif', file: 'sc_04.07.18.09.08.2025.jpg' },
  { from: 'png', to: 'avif', file: 'test.png' },
];

// 다운로드 폴더 생성
if (!fs.existsSync(CONFIG.downloadsDir)) {
  fs.mkdirSync(CONFIG.downloadsDir, { recursive: true });
}

async function runTests() {
  console.log('🚀 수정된 변환 테스트 시작\n');

  const { chromium } = await import('playwright');

  const browser = await chromium.launch({
    headless: CONFIG.headless,
    downloadsPath: CONFIG.downloadsDir,
  });

  // 캐시 비활성화
  const context = await browser.newContext({
    acceptDownloads: true,
    bypassCSP: true,
  });

  const page = await context.newPage();
  page.setDefaultTimeout(CONFIG.timeout);

  // 사이트 접속
  console.log(`🌐 ${CONFIG.baseURL} 접속 중...`);

  // 캐시 우회를 위한 랜덤 쿼리 파라미터
  const cacheBuster = `?_=${Date.now()}`;
  await page.goto(CONFIG.baseURL + cacheBuster, { waitUntil: 'domcontentloaded' });

  await page.waitForTimeout(2000);
  console.log('✅ 사이트 로드 완료\n');

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < TESTS.length; i++) {
    const test = TESTS[i];
    const testName = `${test.from} → ${test.to}`;

    console.log(`[${i + 1}/${TESTS.length}] 테스트: ${testName}`);

    const sourceFilePath = path.join(CONFIG.testFilesDir, test.file);
    if (!fs.existsSync(sourceFilePath)) {
      console.log(`  ⏭️  스킵: 파일 없음 (${test.file})\n`);
      continue;
    }

    try {
      const startTime = Date.now();

      // 1. 파일 업로드
      console.log(`  📤 파일 업로드: ${test.file}`);
      await page.setInputFiles('input[type="file"]', sourceFilePath);
      await page.waitForTimeout(3000);

      // 2. Convert 버튼 클릭
      console.log(`  🔧 Convert 버튼 클릭`);
      const convertBtn = page.locator('.convert-btn').first();
      await convertBtn.click();
      await page.waitForTimeout(1500);

      // 3. 카테고리 전환 (gif → mp4는 동영상 카테고리로)
      if (test.from === 'gif' && test.to === 'mp4') {
        console.log(`  📁 카테고리 전환: 동영상`);
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const videoBtn = buttons.find(btn => btn.textContent.includes('동영상'));
          if (videoBtn) videoBtn.click();
        });
        await page.waitForTimeout(800);
      }

      // 4. 형식 선택
      const toLower = test.to.toLowerCase();
      console.log(`  🔧 출력 형식 선택: ${test.to.toUpperCase()}`);

      const formatBadge = page.locator(`.format-badge[data-format="${toLower}"]`).first();

      // 뱃지 존재 확인
      const badgeCount = await formatBadge.count();
      if (badgeCount === 0) {
        throw new Error(`❌ 형식 뱃지를 찾을 수 없음: ${test.to.toUpperCase()}`);
      }

      // disabled 상태 확인
      const isDisabled = await formatBadge.evaluate(el => el.classList.contains('disabled'));
      if (isDisabled) {
        throw new Error(`❌ 형식이 disabled 상태: ${test.to.toUpperCase()}`);
      }

      console.log(`  ✅ 형식 뱃지 활성화 확인!`);

      await formatBadge.click();
      await page.waitForTimeout(1000);

      // 5. 변환 시작
      console.log(`  ⚙️  변환 시작...`);
      const startBtn = page.locator('#startConversionBtn').first();
      await startBtn.click();

      // 6. 변환 완료 대기
      console.log(`  ⏳ 변환 완료 대기...`);
      const downloadPromise = page.waitForEvent('download', { timeout: CONFIG.timeout });

      await page.waitForSelector(
        'button:has-text("Download"), a:has-text("Download"), .download-btn',
        { timeout: CONFIG.timeout }
      );

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      // 7. 다운로드
      console.log(`  ⬇️  다운로드 중...`);
      const downloadBtn = page.locator('button:has-text("Download"), a:has-text("Download"), .download-btn').first();
      await downloadBtn.click();

      const download = await downloadPromise;
      const downloadPath = path.join(CONFIG.downloadsDir, `${test.from}-to-${test.to}_${Date.now()}.${test.to}`);
      await download.saveAs(downloadPath);

      console.log(`  ✅ 성공! (${duration}초)\n`);
      passed++;

      // 페이지 새로고침
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

    } catch (error) {
      console.log(`  ❌ 실패: ${error.message}\n`);
      failed++;

      // 페이지 새로고침
      try {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
      } catch (e) {
        console.log(`  ⚠️  페이지 새로고침 실패`);
      }
    }
  }

  await browser.close();

  console.log('\n' + '='.repeat(60));
  console.log('📊 수정된 변환 테스트 결과');
  console.log('='.repeat(60));
  console.log(`총 테스트:   ${TESTS.length}개`);
  console.log(`✅ 성공:     ${passed}개`);
  console.log(`❌ 실패:     ${failed}개`);
  console.log('='.repeat(60) + '\n');

  if (passed === TESTS.length) {
    console.log('🎉 모든 수정사항이 성공적으로 반영되었습니다!');
  } else {
    console.log('⚠️  일부 변환이 실패했습니다. 위 로그를 확인해주세요.');
  }
}

runTests().catch(error => {
  console.error('❌ 치명적 오류:', error);
  process.exit(1);
});
