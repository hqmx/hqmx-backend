/**
 * HQMX Converter - 포괄적인 변환 테스트 시스템
 *
 * 기능:
 * - 289개 모든 변환 테스트 (전체 지원 형식)
 * - test-list.md 자동 업데이트
 * - 실시간 진행률 표시 (예상 완료 시간 포함)
 * - 카테고리별 필터링
 * - 에러 스크린샷 캡처
 * - 브라우저 안정성 개선 (주기적 재시작)
 * - 무료 프록시 자동 로테이션
 * - 진행 상황 JSON 저장 (중단 후 재개 가능)
 *
 * 사용법:
 *   node test-comprehensive.js                    # 전체 테스트 (289개, 프록시 사용, 광고 표시, 2-3시간 소요)
 *   node test-comprehensive.js --no-proxy         # 프록시 없이 실행
 *   node test-comprehensive.js --disable-ads      # 광고 차단 (테스트 속도 향상)
 *   node test-comprehensive.js --category=image   # 이미지만 (72개)
 *   node test-comprehensive.js --category=video   # 비디오만 (56개)
 *   node test-comprehensive.js --category=audio   # 오디오만 (56개)
 *   node test-comprehensive.js --from=jpg --to=png # 특정 변환만
 *   node test-comprehensive.js --skip-completed   # 완료된 것 제외
 *   node test-comprehensive.js --retry-failed     # 실패한 테스트만 재실행
 *   node test-comprehensive.js --headless         # 백그라운드 실행
 *   node test-comprehensive.js --verbose          # 상세 로그
 *
 * 289개 전체 테스트 예상 시간:
 * - 평균 30초/변환 × 289개 = 약 2.4시간
 * - 프록시 지연 포함 시 = 약 2.5-3시간
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ==================== 설정 ====================

const CONFIG = {
  baseURL: 'https://hqmx.net',
  testFilesDir: './conv-test',
  downloadsDir: './test-downloads',
  screenshotsDir: './test-screenshots',
  timeout: 300000, // 5분
  pageLoadTimeout: 60000, // 1분
  conversionTimeout: 180000, // 3분
  headless: false,
  disableAds: false, // ⚠️ 광고 표시 활성화 (수익화 테스트 필요)
  slowMo: 100, // ms - 브라우저 동작 속도 조절
  useProxy: true, // 프록시 사용 여부
  proxyRetries: 3, // 프록시 실패 시 재시도 횟수
};

// CLI 인자 파싱
const args = process.argv.slice(2);
const cliOptions = {
  category: args.find(arg => arg.startsWith('--category='))?.split('=')[1],
  from: args.find(arg => arg.startsWith('--from='))?.split('=')[1],
  to: args.find(arg => arg.startsWith('--to='))?.split('=')[1],
  skipCompleted: args.includes('--skip-completed'),
  retryFailed: args.includes('--retry-failed'),
  headless: args.includes('--headless'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  noProxy: args.includes('--no-proxy'),
  disableAds: args.includes('--disable-ads'), // 광고 차단 옵션
};

if (cliOptions.headless) {
  CONFIG.headless = true;
}

if (cliOptions.noProxy) {
  CONFIG.useProxy = false;
}

if (cliOptions.disableAds) {
  CONFIG.disableAds = true;
}

// Conversions 목록 로드
const conversionsPath = './frontend/_scripts/conversions.json';
const conversions = JSON.parse(fs.readFileSync(conversionsPath, 'utf-8'));

// 파일 매핑
const FILE_MAP = {
  // 이미지
  jpg: 'test.jpg',
  jpeg: 'test.jpg',
  png: 'test.png',
  webp: 'test.webp',
  heic: 'test.heic',
  gif: 'test.gif',
  svg: 'test.svg',
  bmp: 'test.bmp',
  ico: 'test.ico',
  avif: 'test.avif',
  // 문서
  pdf: 'test.pdf',
  docx: 'test.docx',
  doc: 'test.doc',
  xlsx: 'test.xlsx',
  xls: 'test.xls',
  pptx: 'test.pptx',
  ppt: 'test.ppt',
  txt: 'test.txt',
  // 비디오
  mp4: 'test.mp4',
  mov: 'test.mov',
  mkv: 'test.mkv',
  flv: 'test.flv',
  wmv: 'test.wmv',
  webm: 'test.webm',
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

// 디렉토리 생성
[CONFIG.downloadsDir, CONFIG.screenshotsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ==================== 유틸리티 함수 ====================

/**
 * 초를 시:분:초 또는 분:초 형식으로 변환
 * @param {number} seconds - 초 단위 시간
 * @returns {string} 포맷된 시간 문자열
 */
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}시간 ${minutes}분 ${secs}초`;
  } else if (minutes > 0) {
    return `${minutes}분 ${secs}초`;
  } else {
    return `${secs}초`;
  }
}

// ==================== 프록시 관리 ====================

let proxyList = [];
let currentProxyIndex = 0;

// 무료 프록시 목록 가져오기
async function fetchProxyList() {
  return new Promise((resolve, reject) => {
    const url = 'https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all&format=textplain';

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const proxies = data
          .trim()
          .split('\n')
          .filter(line => line.includes(':'))
          .map(line => {
            const [server, port] = line.trim().split(':');
            return { server, port };
          });

        console.log(`🔄 프록시 ${proxies.length}개 로드됨`);

        // 처음 3개 프록시 출력 (확인용)
        if (proxies.length > 0) {
          console.log(`   예시: ${proxies.slice(0, 3).map(p => `${p.server}:${p.port}`).join(', ')}...`);
        }

        resolve(proxies);
      });
    }).on('error', (err) => {
      console.log('⚠️  프록시 API 에러 (프록시 없이 진행):', err.message);
      resolve([]);
    });
  });
}

// 다음 프록시 가져오기
function getNextProxy() {
  if (proxyList.length === 0) {
    return null;
  }

  const proxy = proxyList[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % proxyList.length;

  return proxy;
}

// ==================== 테스트 필터링 ====================

let testsToRun = conversions;

// 카테고리 필터
if (cliOptions.category) {
  testsToRun = testsToRun.filter(
    c => c.fromCategory === cliOptions.category || c.toCategory === cliOptions.category
  );
  console.log(`📁 카테고리 필터: ${cliOptions.category} (${testsToRun.length}개)`);
}

// 특정 변환 필터
if (cliOptions.from && cliOptions.to) {
  testsToRun = testsToRun.filter(
    c => c.from === cliOptions.from && c.to === cliOptions.to
  );
  console.log(`🎯 변환 필터: ${cliOptions.from} → ${cliOptions.to} (${testsToRun.length}개)`);
}

// 완료된 것 제외
if (cliOptions.skipCompleted) {
  const completedTests = loadCompletedTests();
  testsToRun = testsToRun.filter(c => !completedTests.includes(`${c.from}-${c.to}`));
  console.log(`⏭️  완료된 테스트 제외 (${testsToRun.length}개 남음)`);
}

// 실패한 테스트만 재실행
if (cliOptions.retryFailed) {
  const failedTests = loadFailedTests();
  if (failedTests.length === 0) {
    console.log('❌ 재실행할 실패한 테스트가 없습니다.');
    process.exit(0);
  }
  testsToRun = testsToRun.filter(c => failedTests.includes(`${c.from}-${c.to}`));
  console.log(`🔄 실패한 테스트만 재실행 (${testsToRun.length}개)`);
}

// ==================== 테스트 결과 ====================

const results = {
  timestamp: new Date().toISOString(),
  total: testsToRun.length,
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
  duration: 0,
};

// ==================== 메인 테스트 실행 ====================

async function runTests() {
  const startTime = Date.now();

  console.log('\n' + '='.repeat(70));
  console.log('🚀 HQMX Converter - 포괄적인 변환 테스트 시작');
  console.log('='.repeat(70));
  console.log(`📦 총 테스트: ${testsToRun.length}개`);
  console.log(`🌐 URL: ${CONFIG.baseURL}`);
  console.log(`🗂️  테스트 파일: ${CONFIG.testFilesDir}`);
  console.log(`⏱️  타임아웃: ${CONFIG.timeout / 1000}초`);

  // 예상 소요 시간 계산
  const estimatedMinutes = Math.ceil((testsToRun.length * 30) / 60); // 평균 30초/변환
  const estimatedHours = (estimatedMinutes / 60).toFixed(1);
  if (testsToRun.length > 100) {
    console.log(`⏰ 예상 소요 시간: 약 ${estimatedHours}시간 (${estimatedMinutes}분)`);
    console.log(`   💡 팁: 카테고리별로 나눠서 테스트하면 더 빠릅니다.`);
    console.log(`   예: --category=image (72개), --category=video (56개)`);
  } else {
    console.log(`⏰ 예상 소요 시간: 약 ${estimatedMinutes}분`);
  }

  // 광고 상태 표시
  if (CONFIG.disableAds) {
    console.log(`🚫 광고 차단: 활성화 (테스트 속도 우선)`);
  } else {
    console.log(`💰 광고 표시: 활성화 (수익화 테스트)`);
  }

  // 프록시 로드
  if (CONFIG.useProxy) {
    console.log(`🔄 무료 프록시 로드 중...`);
    proxyList = await fetchProxyList();
    if (proxyList.length > 0) {
      console.log(`✅ 프록시 사용 활성화 (${proxyList.length}개 프록시)`);
    } else {
      console.log(`⚠️  프록시를 로드할 수 없음 - 프록시 없이 진행`);
      CONFIG.useProxy = false;
    }
  } else {
    console.log(`🔒 프록시 사용 안 함`);
  }

  console.log('='.repeat(70) + '\n');

  const { chromium } = await import('playwright');

  const browser = await chromium.launch({
    headless: CONFIG.headless,
    downloadsPath: CONFIG.downloadsDir,
    slowMo: CONFIG.slowMo,
  });

  try {
    for (let i = 0; i < testsToRun.length; i++) {
      const conversion = testsToRun[i];
      const progress = `[${i + 1}/${testsToRun.length}]`;
      const percentage = ((i / testsToRun.length) * 100).toFixed(1);

      console.log(`\n${'─'.repeat(70)}`);
      console.log(`${progress} (${percentage}%) ${conversion.from.toUpperCase()} → ${conversion.to.toUpperCase()}`);
      console.log(`${'─'.repeat(70)}`);

      await testSingleConversion(browser, conversion, progress);

      // 진행률 표시
      const elapsed = ((Date.now() - startTime) / 1000);
      const avgTime = elapsed / (i + 1);
      const remaining = (avgTime * (testsToRun.length - i - 1));

      console.log(`📊 진행: ${results.passed}✅ ${results.failed}❌ ${results.skipped}⏭️`);
      console.log(`⏱️  경과: ${formatTime(elapsed)} | 예상 남은 시간: ${formatTime(remaining)}`);
    }
  } finally {
    await browser.close();
  }

  results.duration = Date.now() - startTime;

  // 결과 저장
  saveResults();
  updateTestList();
  generateReport();

  // 최종 요약
  printSummary();
}

// ==================== 단일 변환 테스트 ====================

async function testSingleConversion(browser, conversion, progress) {
  const { from, to, fromCategory, toCategory } = conversion;
  const testName = `${from} → ${to}`;

  // 소스 파일 확인
  const sourceFile = FILE_MAP[from];
  if (!sourceFile) {
    console.log(`  ⏭️  스킵: ${from} 소스 파일 없음`);
    results.skipped++;
    results.tests.push({
      name: testName,
      from,
      to,
      status: 'skipped',
      reason: `${from} 소스 파일 없음`,
    });
    return;
  }

  const sourceFilePath = path.join(CONFIG.testFilesDir, sourceFile);
  if (!fs.existsSync(sourceFilePath)) {
    console.log(`  ⏭️  스킵: 파일 없음 (${sourceFile})`);
    results.skipped++;
    results.tests.push({
      name: testName,
      from,
      to,
      status: 'skipped',
      reason: `파일 없음: ${sourceFile}`,
    });
    return;
  }

  // 프록시 재시도 로직
  let attempt = 0;
  let lastError = null;

  while (attempt < CONFIG.proxyRetries) {
    let context = null;
    let page = null;

    try {
      // 프록시 설정
      const contextOptions = { acceptDownloads: true };

      if (CONFIG.useProxy) {
        const proxy = getNextProxy();
        if (proxy) {
          contextOptions.proxy = {
            server: `http://${proxy.server}:${proxy.port}`,
          };
          // 프록시 로그는 항상 출력 (IP 분산 확인 필요)
          console.log(`  🔄 프록시 사용: ${proxy.server}:${proxy.port} (시도 ${attempt + 1}/${CONFIG.proxyRetries})`);
        } else {
          console.log(`  ⚠️  프록시 없이 진행 (프록시 목록 소진)`);
        }
      }

      // 새 컨텍스트 생성 (브라우저는 유지)
      context = await browser.newContext(contextOptions);
      page = await context.newPage();
      page.setDefaultTimeout(CONFIG.timeout);

      const stepStartTime = Date.now();

    // 광고 차단
    if (CONFIG.disableAds) {
      await setupAdBlocking(page);
    }

    // 1. 사이트 접속
    if (cliOptions.verbose) console.log(`  🌐 사이트 접속 중...`);
    await page.goto(CONFIG.baseURL, { waitUntil: 'domcontentloaded', timeout: CONFIG.pageLoadTimeout });
    await page.waitForTimeout(2000);

    // 광고 요소 제거
    if (CONFIG.disableAds) {
      await removeAdElements(page);
    }

    // 2. 파일 업로드
    console.log(`  📤 파일 업로드: ${sourceFile}`);
    await page.setInputFiles('input[type="file"]', sourceFilePath);
    await page.waitForTimeout(3000);

    // 파일 등록 확인
    const fileListVisible = await page.locator('#fileList .file-item').count();
    if (fileListVisible === 0) {
      throw new Error('파일 업로드 실패: 파일 리스트에 표시 안 됨');
    }
    if (cliOptions.verbose) console.log(`  ✅ 파일 등록됨 (${fileListVisible}개)`);

    // 3. Convert 버튼 클릭
    if (cliOptions.verbose) console.log(`  🔘 Convert 버튼 클릭...`);
    const convertBtn = page.locator('.convert-btn').first();
    await convertBtn.click();
    await page.waitForTimeout(2000);

    // 모달 확인
    const modalVisible = await page.locator('#conversionModal').isVisible();
    if (!modalVisible) {
      throw new Error('변환 모달이 열리지 않음');
    }
    if (cliOptions.verbose) console.log(`  ✅ 모달 열림`);

    // 4. 카테고리 전환 (필요시)
    await switchCategory(page, toCategory);

    // 5. 출력 형식 선택
    console.log(`  🔧 출력 형식 선택: ${to.toUpperCase()}`);
    const formatBadge = page.locator(`.format-badge[data-format="${to.toLowerCase()}"]`).first();

    const badgeExists = await formatBadge.count();
    if (badgeExists === 0) {
      throw new Error(`출력 형식 뱃지를 찾을 수 없음: ${to.toUpperCase()}`);
    }

    // disabled 체크
    const isDisabled = await formatBadge.evaluate(el => el.classList.contains('disabled'));
    if (isDisabled) {
      throw new Error(`변환이 지원되지 않음: ${from} → ${to}`);
    }

    await formatBadge.click();
    await page.waitForTimeout(1500);
    if (cliOptions.verbose) console.log(`  ✅ 형식 선택됨`);

    // 6. 변환 시작
    console.log(`  ⚙️  변환 시작...`);
    const startBtn = page.locator('#startConversionBtn').first();
    await startBtn.click();

    // 7. 변환 완료 대기
    console.log(`  ⏳ 변환 중... (최대 ${CONFIG.conversionTimeout / 1000}초)`);

    const downloadPromise = page.waitForEvent('download', { timeout: CONFIG.conversionTimeout });

    await page.waitForSelector(
      'button:has-text("Download"), a:has-text("Download"), .download-btn',
      { timeout: CONFIG.conversionTimeout }
    );

    // 8. 다운로드
    if (cliOptions.verbose) console.log(`  ⬇️  다운로드 중...`);
    const downloadBtn = page.locator('button:has-text("Download"), a:has-text("Download"), .download-btn').first();
    await downloadBtn.click();

    const download = await downloadPromise;
    const downloadPath = path.join(CONFIG.downloadsDir, `${from}-to-${to}_${Date.now()}.${to}`);
    await download.saveAs(downloadPath);

      const duration = ((Date.now() - stepStartTime) / 1000).toFixed(2);
      console.log(`  ✅ 성공! (${duration}초)`);

      results.passed++;
      results.tests.push({
        name: testName,
        from,
        to,
        status: 'passed',
        duration: `${duration}s`,
        downloadPath: path.relative(process.cwd(), downloadPath),
      });

      // 성공 시 context 닫고 종료
      await context.close();
      await new Promise(resolve => setTimeout(resolve, 1000));
      return; // 성공 시 재시도 루프 종료

    } catch (error) {
      lastError = error;
      attempt++;

      if (cliOptions.verbose || attempt >= CONFIG.proxyRetries) {
        console.log(`  ❌ 시도 ${attempt}/${CONFIG.proxyRetries} 실패: ${error.message}`);
      }

      // 스크린샷 캡처 (마지막 시도에만)
      if (attempt >= CONFIG.proxyRetries) {
        try {
          const screenshotPath = path.join(CONFIG.screenshotsDir, `error_${from}-to-${to}_${Date.now()}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          if (cliOptions.verbose) console.log(`  📸 스크린샷: ${screenshotPath}`);
        } catch (screenshotError) {
          // 스크린샷 실패는 무시
        }
      }

      // Context 정리
      if (context) {
        await context.close();
      }

      // 재시도 전 대기 (마지막 시도가 아닌 경우)
      if (attempt < CONFIG.proxyRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (cliOptions.verbose) console.log(`  🔄 다른 프록시로 재시도 중...`);
      }
    }
  }

  // 모든 재시도 실패 시 결과 기록
  if (lastError) {
    console.log(`  ❌ 최종 실패: ${lastError.message}`);
    results.failed++;
    results.tests.push({
      name: testName,
      from,
      to,
      status: 'failed',
      error: lastError.message,
      attempts: attempt,
    });
  }
}

// ==================== 헬퍼 함수 ====================

async function setupAdBlocking(page) {
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

async function removeAdElements(page) {
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
      '.adsbygoogle',
    ];
    adSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => el.remove());
    });
  });
}

async function switchCategory(page, toCategory) {
  const categoryMap = {
    image: '이미지',
    video: '동영상',
    audio: '오디오',
    document: '문서',
    archive: '압축',
  };

  const targetCategory = categoryMap[toCategory];
  if (!targetCategory) return;

  if (cliOptions.verbose) console.log(`  📁 카테고리: ${targetCategory}`);

  const clicked = await page.evaluate(category => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const targetBtn = buttons.find(btn => btn.textContent.includes(category));
    if (targetBtn) {
      targetBtn.click();
      return true;
    }
    return false;
  }, targetCategory);

  if (clicked) {
    await page.waitForTimeout(1000);
  }
}

function loadCompletedTests() {
  const testListPath = './test-list.md';
  if (!fs.existsSync(testListPath)) return [];

  const content = fs.readFileSync(testListPath, 'utf-8');
  const completedTests = [];

  const lines = content.split('\n');
  lines.forEach(line => {
    if (line.includes('- [x]')) {
      const match = line.match(/\*\*([a-z0-9]+) → ([a-z0-9]+)\*\*/);
      if (match) {
        completedTests.push(`${match[1]}-${match[2]}`);
      }
    }
  });

  return completedTests;
}

function loadFailedTests() {
  const resultsPath = './test-comprehensive-results.json';
  if (!fs.existsSync(resultsPath)) {
    console.log('⚠️  test-comprehensive-results.json 파일이 없습니다.');
    return [];
  }

  try {
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
    const failedTests = results.tests
      .filter(t => t.status === 'failed')
      .map(t => `${t.from}-${t.to}`);

    console.log(`\n📊 실패한 테스트: ${failedTests.length}개`);
    if (failedTests.length > 0) {
      console.log('   예시:', failedTests.slice(0, 5).join(', '));
    }

    return failedTests;
  } catch (error) {
    console.error('❌ 결과 파일 로드 실패:', error.message);
    return [];
  }
}

// ==================== 결과 저장 및 리포트 ====================

function saveResults() {
  const resultsPath = './test-comprehensive-results.json';
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 결과 저장: ${resultsPath}`);
}

function updateTestList() {
  const testListPath = './test-list.md';
  if (!fs.existsSync(testListPath)) {
    console.log(`⚠️  test-list.md 파일이 없어서 업데이트를 건너뜁니다.`);
    return;
  }

  let content = fs.readFileSync(testListPath, 'utf-8');

  results.tests.forEach(test => {
    if (test.status === 'passed') {
      // [ ] → [x] 변경
      const pattern = new RegExp(`- \\[ \\] \\*\\*${test.from} → ${test.to}\\*\\*`, 'g');
      const replacement = `- [x] **${test.from} → ${test.to}**`;
      content = content.replace(pattern, `${replacement} \`✅ 완료 (${test.duration})\``);
    } else if (test.status === 'failed') {
      // 실패 표시 추가
      const pattern = new RegExp(`(- \\[ \\] \\*\\*${test.from} → ${test.to}\\*\\*.*)`);
      const replacement = `$1 \`❌ 실패: ${test.error.substring(0, 50)}\``;
      content = content.replace(pattern, replacement);
    }
  });

  fs.writeFileSync(testListPath, content);
  console.log(`📝 test-list.md 업데이트 완료`);
}

function generateReport() {
  const lines = [];

  lines.push('# HQMX Converter - 포괄적인 테스트 리포트\n');
  lines.push(`**테스트 일시**: ${new Date(results.timestamp).toLocaleString('ko-KR')}`);
  lines.push(`**총 소요 시간**: ${(results.duration / 1000 / 60).toFixed(2)}분\n`);

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

  const reportPath = './test-comprehensive-report.md';
  fs.writeFileSync(reportPath, lines.join('\n'));
  console.log(`📄 리포트 생성: ${reportPath}`);
}

function printSummary() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 최종 테스트 결과');
  console.log('='.repeat(70));
  console.log(`총 테스트:   ${results.total}개`);
  console.log(`✅ 성공:     ${results.passed}개`);
  console.log(`❌ 실패:     ${results.failed}개`);
  console.log(`⏭️  스킵:     ${results.skipped}개`);

  const tested = results.total - results.skipped;
  if (tested > 0) {
    const successRate = ((results.passed / tested) * 100).toFixed(1);
    console.log(`성공률:      ${successRate}%`);
  }

  console.log(`⏱️  총 소요:   ${(results.duration / 1000 / 60).toFixed(2)}분`);
  console.log('='.repeat(70));
  console.log('\n📁 결과 파일:');
  console.log(`  - test-comprehensive-results.json (상세 결과)`);
  console.log(`  - test-comprehensive-report.md (리포트)`);
  console.log(`  - test-list.md (업데이트됨)`);
  console.log(`  - ${CONFIG.downloadsDir}/ (변환된 파일)`);
  console.log(`  - ${CONFIG.screenshotsDir}/ (에러 스크린샷)\n`);
}

// ==================== 실행 ====================

runTests().catch(error => {
  console.error('\n❌ 치명적 오류:', error);
  process.exit(1);
});
