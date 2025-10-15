/**
 * HQMX Converter - E2E 전체 변환 테스트
 *
 * 이 스크립트는 conversions.json의 모든 변환을 hqmx.net에서 테스트합니다.
 *
 * 사용법:
 *   node test-all-conversions.js
 *
 * 결과:
 *   - test-results.json: 테스트 결과 상세 정보
 *   - test-report.md: 사람이 읽을 수 있는 리포트
 *   - downloads/: 변환된 파일들
 */

const fs = require('fs');
const path = require('path');

// Conversions 목록 로드
const conversionsPath = './frontend/_scripts/conversions.json';
const conversions = JSON.parse(fs.readFileSync(conversionsPath, 'utf-8'));

// 테스트 설정
const CONFIG = {
  baseURL: 'https://hqmx.net',
  testFilesDir: './conv-test',
  downloadsDir: './test-downloads',
  timeout: 300000, // 5분 (대용량 파일 변환 시간 포함)
  headless: false, // 디버깅을 위해 브라우저 표시
  disableAds: true, // 광고 비활성화
};

// 파일 매핑 (소스 파일명)
const FILE_MAP = {
  // 이미지
  jpg: 'sc_04.07.18.09.08.2025.jpg',
  jpeg: 'sc_04.07.18.09.08.2025.jpg',
  png: 'test.png',
  webp: 'test.webp',
  heic: null, // 없음 - 스킵
  gif: 'test.gif',
  svg: 'test.svg',
  bmp: 'test.bmp',
  tiff: 'test.tiff',
  ico: 'test.ico',
  avif: null, // 없음 - 스킵

  // 문서
  pdf: 'test.pdf',
  docx: null, // 없음 - 스킵
  doc: null, // 없음 - 스킵
  xlsx: '스마트스토어_추천키워드_20250804152506477.xlsx',
  xls: null, // 없음 - xlsx로 대체
  pptx: null, // 없음 - 스킵
  ppt: null, // 없음 - 스킵
  txt: 'altube_email_guide.txt',

  // 비디오
  mp4: 'mobbg.mp4',
  mov: 'test.mov',
  mkv: 'test.mkv',
  flv: 'test.flv',
  wmv: 'test.wmv',
  webm: 'heromob.webm',
  avi: 'test.avi',
  m4v: 'test.m4v',

  // 오디오
  mp3: 'test.mp3',
  m4a: 'test.m4a',
  flac: 'test.flac',
  ogg: 'test.ogg',
  aac: 'test.aac',
  wma: 'test.wma',
  wav: 'test.wav',
  opus: 'test.opus',
};

// 다운로드 폴더 생성
if (!fs.existsSync(CONFIG.downloadsDir)) {
  fs.mkdirSync(CONFIG.downloadsDir, { recursive: true });
}

// 테스트 결과 저장
const results = {
  timestamp: new Date().toISOString(),
  total: conversions.length,
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
};

async function runTests() {
  console.log('🚀 HQMX Converter E2E 테스트 시작');
  console.log(`📦 총 ${conversions.length}개 변환 테스트\n`);

  // Playwright 동적 import (ES Module)
  const { chromium } = await import('playwright');

  const browser = await chromium.launch({
    headless: CONFIG.headless,
    downloadsPath: CONFIG.downloadsDir,
  });

  const context = await browser.newContext({
    acceptDownloads: true,
  });

  const page = await context.newPage();
  page.setDefaultTimeout(CONFIG.timeout);

  // 광고 차단 (강화)
  if (CONFIG.disableAds) {
    await page.route('**/*', route => {
      const url = route.request().url();
      if (
        url.includes('adsterra') ||
        url.includes('propellerads') ||
        url.includes('google-analytics') ||
        url.includes('googletagmanager') ||
        url.includes('dcbbwymp1bhlf.cloudfront.net') ||
        url.includes('rashcolonizeexpand.com') ||
        url.includes('highperformanceformat.com') ||
        url.includes('effectivegatecpm.com') ||
        url.includes('outskirtsgrey.com') ||
        url.includes('admarven') ||
        url.includes('/ads/') ||
        url.includes('doubleclick.net')
      ) {
        route.abort();
      } else {
        route.continue();
      }
    });
  }

  // 사이트 접속
  console.log(`🌐 ${CONFIG.baseURL} 접속 중...`);
  await page.goto(CONFIG.baseURL, { waitUntil: 'domcontentloaded' });

  // 광고 요소 제거 (JavaScript 실행)
  if (CONFIG.disableAds) {
    await page.evaluate(() => {
      // 광고 관련 요소 제거
      const adSelectors = [
        '[data-cfasync]',
        '#lkx4l',
        '#ubsgxo2',
        '[href*="rashcolonizeexpand.com"]',
        '[href*="effectivegatecpm.com"]',
        '[href*="outskirtsgrey.com"]',
        'script[src*="adsterra"]',
        'script[src*="propellerads"]',
        'script[src*="dcbbwymp1bhlf"]',
        '.ad',
        '.ads',
        '.adsbygoogle'
      ];

      adSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.remove());
      });
    });
  }

  await page.waitForTimeout(1000); // 1초 대기
  console.log('✅ 사이트 로드 완료\n');

  // 각 변환 테스트
  for (let i = 0; i < conversions.length; i++) {
    const conversion = conversions[i];
    const { from, to, fromCategory, toCategory } = conversion;
    const testName = `${from} → ${to}`;

    console.log(`[${i + 1}/${conversions.length}] 테스트: ${testName}`);

    // 소스 파일 확인
    const sourceFile = FILE_MAP[from];
    if (!sourceFile) {
      console.log(`  ⏭️  스킵: ${from} 소스 파일 없음\n`);
      results.skipped++;
      results.tests.push({
        name: testName,
        from,
        to,
        status: 'skipped',
        reason: `${from} 소스 파일 없음`,
      });
      continue;
    }

    const sourceFilePath = path.join(CONFIG.testFilesDir, sourceFile);
    if (!fs.existsSync(sourceFilePath)) {
      console.log(`  ⏭️  스킵: 파일 없음 (${sourceFilePath})\n`);
      results.skipped++;
      results.tests.push({
        name: testName,
        from,
        to,
        status: 'skipped',
        reason: `파일 없음: ${sourceFilePath}`,
      });
      continue;
    }

    try {
      const startTime = Date.now();

      // 1. 파일 업로드
      console.log(`  📤 파일 업로드: ${sourceFile}`);
      await page.setInputFiles('input[type="file"]', sourceFilePath);
      await page.waitForTimeout(3000);

      // 파일 등록 확인
      const fileListVisible = await page.locator('#fileList .file-item').count();
      if (fileListVisible === 0) {
        throw new Error('파일 업로드 실패: 파일 리스트에 파일이 표시되지 않음');
      }

      // 2. Convert 버튼 클릭하여 모달 열기
      const convertBtn = page.locator('.convert-btn').first();
      await convertBtn.click();
      await page.waitForTimeout(1500);

      // 모달 확인
      const modalVisible = await page.locator('#conversionModal').isVisible();
      if (!modalVisible) {
        throw new Error('변환 모달이 열리지 않음');
      }

      // 3. 카테고리 버튼 클릭 (크로스 카테고리 변환 지원 - JavaScript 강제 실행)
      const categoryMap = {
        image: '이미지',
        video: '동영상',
        audio: '오디오',
        document: '문서',
        archive: '압축',
      };

      const targetCategory = categoryMap[toCategory];
      if (targetCategory) {
        console.log(`  📁 카테고리 전환: ${targetCategory}`);

        // JavaScript로 직접 클릭 (광고 우회)
        const clicked = await page.evaluate((category) => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const targetBtn = buttons.find(btn => btn.textContent.includes(category));
          if (targetBtn) {
            targetBtn.click();
            return true;
          }
          return false;
        }, targetCategory);

        if (clicked) {
          await page.waitForTimeout(800); // 카테고리 전환 대기
        }
      }

      // 4. 형식 선택
      const toLower = to.toLowerCase();
      console.log(`  🔧 출력 형식 선택: ${to.toUpperCase()}`);

      const formatBadge = page.locator(`.format-badge[data-format="${toLower}"]`).first();
      const badgeExists = await formatBadge.count() > 0;
      if (!badgeExists) {
        throw new Error(`출력 형식 뱃지를 찾을 수 없음: ${to.toUpperCase()}`);
      }

      await formatBadge.click();
      await page.waitForTimeout(1000);

      // 5. 변환 시작
      console.log(`  ⚙️  변환 시작...`);
      const startBtn = page.locator('#startConversionBtn').first();
      await startBtn.click();

      // 6. 변환 완료 대기 및 다운로드
      console.log(`  ⏳ 변환 완료 대기...`);

      // 다운로드 이벤트 대기 시작
      const downloadPromise = page.waitForEvent('download', { timeout: CONFIG.timeout });

      // 완료 신호 대기
      await page.waitForSelector(
        'button:has-text("Download"), a:has-text("Download"), .download-btn',
        { timeout: CONFIG.timeout }
      );

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      // 다운로드 실행
      console.log(`  ⬇️  다운로드 중...`);
      const downloadBtn = page.locator('button:has-text("Download"), a:has-text("Download"), .download-btn').first();
      await downloadBtn.click();

      const download = await downloadPromise;
      const downloadPath = path.join(CONFIG.downloadsDir, `${from}-to-${to}_${Date.now()}.${to}`);
      await download.saveAs(downloadPath);

      console.log(`  ✅ 성공! (${duration}초)\n`);

      results.passed++;
      results.tests.push({
        name: testName,
        from,
        to,
        status: 'passed',
        duration: `${duration}s`,
        downloadPath: path.relative(process.cwd(), downloadPath),
      });

      // 다음 테스트를 위해 페이지 새로고침
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

    } catch (error) {
      console.log(`  ❌ 실패: ${error.message}\n`);

      results.failed++;
      results.tests.push({
        name: testName,
        from,
        to,
        status: 'failed',
        error: error.message,
      });

      // 다음 테스트를 위해 페이지 새로고침
      try {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
      } catch (reloadError) {
        console.log(`  ⚠️  페이지 새로고침 실패, 계속 진행...`);
      }
    }
  }

  await browser.close();

  // 결과 저장
  fs.writeFileSync('./test-results.json', JSON.stringify(results, null, 2));

  // 리포트 생성
  generateReport(results);

  console.log('\n' + '='.repeat(60));
  console.log('📊 테스트 결과 요약');
  console.log('='.repeat(60));
  console.log(`총 테스트:   ${results.total}개`);
  console.log(`✅ 성공:     ${results.passed}개`);
  console.log(`❌ 실패:     ${results.failed}개`);
  console.log(`⏭️  스킵:     ${results.skipped}개`);
  console.log(`성공률:      ${((results.passed / (results.total - results.skipped)) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));
  console.log('\n📄 상세 결과: test-results.json');
  console.log('📄 리포트: test-report.md');
  console.log(`📂 다운로드: ${CONFIG.downloadsDir}/\n`);
}

function generateReport(results) {
  const lines = [];

  lines.push('# HQMX Converter E2E 테스트 리포트\n');
  lines.push(`**테스트 일시**: ${new Date(results.timestamp).toLocaleString('ko-KR')}\n`);
  lines.push('## 📊 요약\n');
  lines.push('| 항목 | 수량 | 비율 |');
  lines.push('|------|------|------|');
  lines.push(`| 총 테스트 | ${results.total} | 100% |`);
  lines.push(`| ✅ 성공 | ${results.passed} | ${((results.passed / results.total) * 100).toFixed(1)}% |`);
  lines.push(`| ❌ 실패 | ${results.failed} | ${((results.failed / results.total) * 100).toFixed(1)}% |`);
  lines.push(`| ⏭️ 스킵 | ${results.skipped} | ${((results.skipped / results.total) * 100).toFixed(1)}% |`);

  const tested = results.total - results.skipped;
  if (tested > 0) {
    lines.push(`| **성공률** | **${results.passed}/${tested}** | **${((results.passed / tested) * 100).toFixed(1)}%** |`);
  }

  lines.push('\n## ✅ 성공한 변환\n');
  const passed = results.tests.filter(t => t.status === 'passed');
  if (passed.length > 0) {
    passed.forEach(test => {
      lines.push(`- **${test.name}** (${test.duration})`);
    });
  } else {
    lines.push('_없음_');
  }

  lines.push('\n## ❌ 실패한 변환\n');
  const failed = results.tests.filter(t => t.status === 'failed');
  if (failed.length > 0) {
    failed.forEach(test => {
      lines.push(`- **${test.name}**`);
      lines.push(`  - 오류: ${test.error}`);
    });
  } else {
    lines.push('_없음_');
  }

  lines.push('\n## ⏭️ 스킵된 변환\n');
  const skipped = results.tests.filter(t => t.status === 'skipped');
  if (skipped.length > 0) {
    skipped.forEach(test => {
      lines.push(`- **${test.name}** - ${test.reason}`);
    });
  } else {
    lines.push('_없음_');
  }

  lines.push('\n## 📋 상세 결과\n');
  lines.push('| # | 변환 | 상태 | 시간 | 비고 |');
  lines.push('|---|------|------|------|------|');
  results.tests.forEach((test, index) => {
    const statusEmoji = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️';
    const duration = test.duration || '-';
    const note = test.error || test.reason || test.downloadPath || '-';
    lines.push(`| ${index + 1} | ${test.name} | ${statusEmoji} ${test.status} | ${duration} | ${note} |`);
  });

  fs.writeFileSync('./test-report.md', lines.join('\n'));
}

// 실행
runTests().catch(error => {
  console.error('❌ 치명적 오류:', error);
  process.exit(1);
});
