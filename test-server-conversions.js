/**
 * HQMX Converter - 서버 사이드 변환 테스트 시스템
 *
 * 목적:
 * - 백엔드 API를 통한 변환 테스트
 * - 모든 변환기 (ImageConverter, VideoConverter, AudioConverter, LibreOffice, ImageMagick) 검증
 * - 더미 파일로 빠른 테스트 (실제 변환 품질 확인)
 * - 진행률 추적 및 에러 로깅
 *
 * 사용법:
 *   node test-server-conversions.js                    # 전체 테스트 (289개)
 *   node test-server-conversions.js --category=image   # 이미지만 (72개)
 *   node test-server-conversions.js --category=video   # 비디오만 (56개)
 *   node test-server-conversions.js --category=audio   # 오디오만 (56개)
 *   node test-server-conversions.js --from=jpg --to=png # 특정 변환만
 *   node test-server-conversions.js --skip-completed   # 완료된 것 제외
 *   node test-server-conversions.js --retry-failed     # 실패만 재실행
 *   node test-server-conversions.js --verbose          # 상세 로그
 *
 * 예상 시간:
 * - 이미지 변환: ~5초/변환 × 72개 = 6분
 * - 비디오 변환: ~15초/변환 × 56개 = 14분
 * - 오디오 변환: ~10초/변환 × 56개 = 9.3분
 * - 문서 변환: ~8초/변환 × 24개 = 3.2분
 * - 크로스 변환: ~12초/변환 × 81개 = 16.2분
 * - **전체**: 약 48.7분 (약 50분)
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// ==================== 설정 ====================

const CONFIG = {
  apiURL: 'https://hqmx.net/api',  // 프로덕션 서버
  // apiURL: 'http://localhost:3001/api',  // 로컬 테스트
  testFilesDir: './conv-test',
  downloadsDir: './test-downloads-server',
  resultsFile: './test-server-results.json',
  timeout: 300000, // 5분
  pollInterval: 1000, // 1초마다 진행률 체크
  maxRetries: 3,
};

// CLI 인자 파싱
const args = process.argv.slice(2);
const cliOptions = {
  category: args.find(arg => arg.startsWith('--category='))?.split('=')[1],
  from: args.find(arg => arg.startsWith('--from='))?.split('=')[1],
  to: args.find(arg => arg.startsWith('--to='))?.split('=')[1],
  skipCompleted: args.includes('--skip-completed'),
  retryFailed: args.includes('--retry-failed'),
  verbose: args.includes('--verbose') || args.includes('-v'),
};

// Conversions 목록 로드
const conversionsPath = './frontend/_scripts/conversions.json';
const conversions = JSON.parse(fs.readFileSync(conversionsPath, 'utf-8'));

// 파일 매핑 (더미 파일)
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
  avi: 'test.avi',
  mov: 'test.mov',
  mkv: 'test.mkv',
  webm: 'test.webm',
  flv: 'test.flv',
  wmv: 'test.wmv',
  m4v: 'test.m4v',
  // 오디오
  mp3: 'test.mp3',
  wav: 'test.wav',
  flac: 'test.flac',
  aac: 'test.aac',
  ogg: 'test.ogg',
  m4a: 'test.m4a',
  wma: 'test.wma',
  opus: 'test.opus',
};

// ==================== 유틸리티 ====================

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = {
    INFO: '📘',
    SUCCESS: '✅',
    ERROR: '❌',
    WARN: '⚠️',
    DEBUG: '🔍',
  }[level] || 'ℹ️';

  console.log(`${prefix} [${timestamp}] ${message}`);
}

function verbose(message) {
  if (cliOptions.verbose) {
    log(message, 'DEBUG');
  }
}

// 디렉토리 생성
if (!fs.existsSync(CONFIG.downloadsDir)) {
  fs.mkdirSync(CONFIG.downloadsDir, { recursive: true });
}

// ==================== API 함수 ====================

/**
 * 서버로 파일 업로드 및 변환 요청
 * @param {string} filePath - 업로드할 파일 경로
 * @param {string} outputFormat - 출력 형식
 * @returns {Promise<Object>} jobId 및 변환 정보
 */
async function uploadAndConvert(filePath, outputFormat) {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  formData.append('outputFormat', outputFormat);

  verbose(`업로드 요청: ${filePath} → ${outputFormat}`);

  const response = await axios.post(`${CONFIG.apiURL}/convert`, formData, {
    headers: formData.getHeaders(),
    timeout: CONFIG.timeout,
  });

  verbose(`업로드 응답: ${JSON.stringify(response.data)}`);

  return response.data;
}

/**
 * 변환 진행률 확인
 * @param {string} jobId - 작업 ID
 * @returns {Promise<Object>} 진행률 정보
 */
async function checkProgress(jobId) {
  const response = await axios.get(`${CONFIG.apiURL}/progress/${jobId}`, {
    timeout: 10000, // 10초
  });

  return response.data;
}

/**
 * 변환 완료 후 파일 다운로드
 * @param {string} jobId - 작업 ID
 * @param {string} outputPath - 저장할 경로
 * @returns {Promise<void>}
 */
async function downloadFile(jobId, outputPath) {
  const response = await axios.get(`${CONFIG.apiURL}/download/${jobId}`, {
    responseType: 'stream',
    timeout: CONFIG.timeout,
  });

  const writer = fs.createWriteStream(outputPath);

  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

/**
 * 변환 완료까지 대기 (폴링)
 * @param {string} jobId - 작업 ID
 * @param {Function} onProgress - 진행률 콜백
 * @returns {Promise<Object>} 최종 상태
 */
async function waitForCompletion(jobId, onProgress) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let pollTimer = null;

    const poll = async () => {
      try {
        const data = await checkProgress(jobId);

        if (onProgress) {
          onProgress(data);
        }

        if (data.status === 'completed') {
          if (pollTimer) clearTimeout(pollTimer);
          resolve(data);
        } else if (data.status === 'failed' || data.error) {
          if (pollTimer) clearTimeout(pollTimer);
          reject(new Error(data.error || data.message || 'Conversion failed'));
        } else if (Date.now() - startTime > CONFIG.timeout) {
          if (pollTimer) clearTimeout(pollTimer);
          reject(new Error('Timeout'));
        } else {
          // 다음 폴링 예약
          pollTimer = setTimeout(poll, CONFIG.pollInterval);
        }
      } catch (err) {
        // 일시적 네트워크 에러는 무시하고 계속 폴링
        verbose(`폴링 에러 (무시): ${err.message}`);
        pollTimer = setTimeout(poll, CONFIG.pollInterval);
      }
    };

    // 첫 폴링 시작
    poll();
  });
}

// ==================== 테스트 실행 ====================

/**
 * 단일 변환 테스트
 * @param {Object} conversion - 변환 정보 { from, to, fromCategory, toCategory }
 * @returns {Promise<Object>} 테스트 결과
 */
async function testConversion(conversion) {
  const { from, to, fromCategory, toCategory } = conversion;
  const testName = `${from}-to-${to}`;

  log(`테스트 시작: ${testName} (${fromCategory} → ${toCategory})`);

  const result = {
    testName,
    from,
    to,
    fromCategory,
    toCategory,
    status: 'pending',
    startTime: Date.now(),
    endTime: null,
    duration: null,
    error: null,
    jobId: null,
  };

  try {
    // 1. 테스트 파일 경로
    const inputFile = FILE_MAP[from];
    if (!inputFile) {
      throw new Error(`테스트 파일 없음: ${from}`);
    }

    const inputPath = path.join(CONFIG.testFilesDir, inputFile);
    if (!fs.existsSync(inputPath)) {
      throw new Error(`파일이 존재하지 않음: ${inputPath}`);
    }

    // 2. 업로드 및 변환 요청
    verbose(`파일 업로드: ${inputPath}`);
    const uploadResult = await uploadAndConvert(inputPath, to);
    result.jobId = uploadResult.jobId;

    log(`작업 생성됨: ${uploadResult.jobId}`);

    // 3. 변환 완료 대기
    let lastProgress = 0;
    await waitForCompletion(uploadResult.jobId, (data) => {
      if (data.progress && data.progress !== lastProgress) {
        lastProgress = data.progress;
        verbose(`진행률: ${data.progress}% - ${data.message || ''}`);
      }
    });

    // 4. 파일 다운로드
    const outputFileName = `${testName}_${Date.now()}.${to}`;
    const outputPath = path.join(CONFIG.downloadsDir, outputFileName);

    verbose(`파일 다운로드: ${outputPath}`);
    await downloadFile(uploadResult.jobId, outputPath);

    // 5. 파일 검증
    const stats = fs.statSync(outputPath);
    if (stats.size === 0) {
      throw new Error('출력 파일이 비어있음');
    }

    result.status = 'success';
    result.endTime = Date.now();
    result.duration = result.endTime - result.startTime;
    result.outputFile = outputPath;
    result.outputSize = stats.size;

    log(`✅ 성공: ${testName} (${(result.duration / 1000).toFixed(1)}초, ${(stats.size / 1024).toFixed(1)} KB)`, 'SUCCESS');

  } catch (err) {
    result.status = 'failed';
    result.endTime = Date.now();
    result.duration = result.endTime - result.startTime;
    result.error = err.message || String(err);

    log(`❌ 실패: ${testName} - ${err.message || err}`, 'ERROR');

    if (cliOptions.verbose && err.stack) {
      verbose(`스택 트레이스:\n${err.stack}`);
    }
  }

  return result;
}

/**
 * 전체 테스트 실행
 */
async function runTests() {
  log('🚀 서버 사이드 변환 테스트 시작');

  // 필터링
  let testList = conversions;

  if (cliOptions.category) {
    testList = testList.filter(c => c.fromCategory === cliOptions.category || c.toCategory === cliOptions.category);
    log(`카테고리 필터: ${cliOptions.category} (${testList.length}개)`);
  }

  if (cliOptions.from) {
    testList = testList.filter(c => c.from === cliOptions.from);
    log(`From 필터: ${cliOptions.from} (${testList.length}개)`);
  }

  if (cliOptions.to) {
    testList = testList.filter(c => c.to === cliOptions.to);
    log(`To 필터: ${cliOptions.to} (${testList.length}개)`);
  }

  // 기존 결과 로드 (skip/retry 옵션)
  let previousResults = {};
  if (fs.existsSync(CONFIG.resultsFile)) {
    const data = JSON.parse(fs.readFileSync(CONFIG.resultsFile, 'utf-8'));
    previousResults = Object.fromEntries(data.results.map(r => [r.testName, r]));
    log(`기존 결과 로드: ${Object.keys(previousResults).length}개`);
  }

  if (cliOptions.skipCompleted) {
    testList = testList.filter(c => {
      const testName = `${c.from}-to-${c.to}`;
      return !previousResults[testName] || previousResults[testName].status !== 'success';
    });
    log(`완료된 테스트 제외: ${testList.length}개 남음`);
  }

  if (cliOptions.retryFailed) {
    testList = testList.filter(c => {
      const testName = `${c.from}-to-${c.to}`;
      return previousResults[testName] && previousResults[testName].status === 'failed';
    });
    log(`실패한 테스트만: ${testList.length}개`);
  }

  log(`총 테스트 수: ${testList.length}개`);

  // 테스트 실행
  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < testList.length; i++) {
    const conversion = testList[i];
    log(`\n[${i + 1}/${testList.length}] ${conversion.from} → ${conversion.to}`);

    const result = await testConversion(conversion);
    results.push(result);

    if (result.status === 'success') {
      successCount++;
    } else {
      failCount++;
    }

    // 진행 상황 저장
    const summary = {
      totalTests: testList.length,
      completedTests: i + 1,
      successCount,
      failCount,
      results,
    };

    fs.writeFileSync(CONFIG.resultsFile, JSON.stringify(summary, null, 2));

    // 서버 부하 방지 (0.5초 대기)
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 최종 결과
  log('\n' + '='.repeat(60));
  log('📊 테스트 완료!', 'SUCCESS');
  log(`총 테스트: ${testList.length}개`);
  log(`✅ 성공: ${successCount}개`);
  log(`❌ 실패: ${failCount}개`);
  log(`성공률: ${((successCount / testList.length) * 100).toFixed(1)}%`);
  log('='.repeat(60));

  // 실패 목록
  if (failCount > 0) {
    log('\n❌ 실패한 테스트:');
    results.filter(r => r.status === 'failed').forEach(r => {
      log(`  - ${r.testName}: ${r.error}`);
    });
  }

  log(`\n결과 저장: ${CONFIG.resultsFile}`);
}

// ==================== 실행 ====================

runTests().catch(err => {
  log(`치명적 에러: ${err.message}`, 'ERROR');
  console.error(err);
  process.exit(1);
});
