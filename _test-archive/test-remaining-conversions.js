/**
 * HQMX Converter - 남은 변환만 테스트
 *
 * 이미 완료된 변환은 제외하고 나머지만 테스트합니다.
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
  timeout: 300000,
  headless: false,
  disableAds: true,
};

// 이미 완료된 변환 (test-output.log 기준)
const COMPLETED_CONVERSIONS = [
  'jpg-png',
  'png-jpg',
  'webp-jpg',
  'webp-png',
  'png-webp',
  'jpg-webp',
  'heic-jpg',    // 스킵됨
  'heic-png',    // 스킵됨
  'jpg-pdf',
  'png-pdf',
  'pdf-jpg',
  'pdf-png',
];

// 파일 매핑
const FILE_MAP = {
  jpg: 'sc_04.07.18.09.08.2025.jpg',
  jpeg: 'sc_04.07.18.09.08.2025.jpg',
  png: 'test.png',
  webp: 'test.webp',
  heic: null,
  gif: 'test.gif',
  svg: 'test.svg',
  bmp: 'test.bmp',
  ico: 'test.ico',
  avif: null,
  pdf: 'test.pdf',
  docx: null,
  doc: null,
  xlsx: '스마트스토어_추천키워드_20250804152506477.xlsx',
  xls: null,
  pptx: null,
  ppt: null,
  txt: 'altube_email_guide.txt',
  mp4: 'mobbg.mp4',
  mov: 'test.mov',
  mkv: 'test.mkv',
  flv: 'test.flv',
  wmv: 'test.wmv',
  webm: 'heromob.webm',
  avi: 'test.avi',
  m4v: 'test.m4v',
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

// 남은 변환만 필터링
const remainingConversions = conversions.filter(conv => {
  const key = `${conv.from}-${conv.to}`;
  return !COMPLETED_CONVERSIONS.includes(key);
});

// 테스트 결과 저장
const results = {
  timestamp: new Date().toISOString(),
  total: remainingConversions.length,
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
};

async function runTests() {
  console.log('🚀 HQMX Converter - 남은 변환 테스트 시작');
  console.log(`📦 총 ${remainingConversions.length}개 변환 테스트 (이미 완료: ${COMPLETED_CONVERSIONS.length}개)\n`);

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

  // 광고 차단
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

  // 광고 요소 제거
  if (CONFIG.disableAds) {
    await page.evaluate(() => {
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

  await page.waitForTimeout(1000);
  console.log('✅ 사이트 로드 완료\n');

  // 각 변환 테스트
  for (let i = 0; i < remainingConversions.length; i++) {
    const conversion = remainingConversions[i];
    const { from, to, fromCategory, toCategory } = conversion;
    const testName = `${from} → ${to}`;

    const originalIndex = conversions.findIndex(c => c.from === from && c.to === to);
    console.log(`[${originalIndex + 1}/${conversions.length}] 테스트: ${testName}`);

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

      // 2. Convert 버튼 클릭
      const convertBtn = page.locator('.convert-btn').first();
      await convertBtn.click();
      await page.waitForTimeout(1500);

      // 모달 확인
      const modalVisible = await page.locator('#conversionModal').isVisible();
      if (!modalVisible) {
        throw new Error('변환 모달이 열리지 않음');
      }

      // 3. 카테고리 버튼 클릭
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
          await page.waitForTimeout(800);
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

      const downloadPromise = page.waitForEvent('download', { timeout: CONFIG.timeout });

      await page.waitForSelector(
        'button:has-text("Download"), a:has-text("Download"), .download-btn',
        { timeout: CONFIG.timeout }
      );

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

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

      // 페이지 새로고침
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

      // 페이지 새로고침
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
  fs.writeFileSync('./test-remaining-results.json', JSON.stringify(results, null, 2));

  // 리포트 생성
  generateReport(results);

  console.log('\n' + '='.repeat(60));
  console.log('📊 남은 테스트 결과 요약');
  console.log('='.repeat(60));
  console.log(`총 테스트:   ${results.total}개`);
  console.log(`✅ 성공:     ${results.passed}개`);
  console.log(`❌ 실패:     ${results.failed}개`);
  console.log(`⏭️  스킵:     ${results.skipped}개`);
  const tested = results.total - results.skipped;
  if (tested > 0) {
    console.log(`성공률:      ${((results.passed / tested) * 100).toFixed(1)}%`);
  }
  console.log('='.repeat(60));
  console.log('\n📄 상세 결과: test-remaining-results.json');
  console.log('📄 리포트: test-remaining-report.md');
  console.log(`📂 다운로드: ${CONFIG.downloadsDir}/\n`);
}

function generateReport(results) {
  const lines = [];

  lines.push('# HQMX Converter - 남은 변환 테스트 리포트\n');
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

  fs.writeFileSync('./test-remaining-report.md', lines.join('\n'));
}

// 실행
runTests().catch(error => {
  console.error('❌ 치명적 오류:', error);
  process.exit(1);
});
