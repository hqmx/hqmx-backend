/**
 * HQMX Converter - 테스트 파일 온라인 다운로드
 *
 * 누락된 테스트 파일들을 온라인에서 다운로드합니다:
 * - HEIC, AVIF (이미지)
 * - DOCX, DOC, XLS, PPTX, PPT (문서)
 *
 * 사용법:
 *   node download-test-files.js
 *   node download-test-files.js --force  # 기존 파일 덮어쓰기
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const TEST_FILES_DIR = './conv-test';
const args = process.argv.slice(2);
const forceDownload = args.includes('--force');

// 다운로드할 파일 목록과 URL
const DOWNLOAD_LIST = [
  {
    format: 'heic',
    filename: 'test.heic',
    url: 'https://raw.githubusercontent.com/nokiatech/heif/gh-pages/content/images/autumn_1440x960.heic',
    description: 'HEIC 이미지 (iPhone 포맷)',
  },
  {
    format: 'avif',
    filename: 'test.avif',
    url: 'https://raw.githubusercontent.com/AOMediaCodec/av1-avif/master/testFiles/Microsoft/Chimera_10bit_cropped_to_1920x1008.avif',
    description: 'AVIF 이미지 (최신 포맷)',
  },
  {
    format: 'docx',
    filename: 'test.docx',
    url: 'https://file-examples.com/storage/fe783367f1adfa48b993ea8/2017/02/file-sample_100kB.docx',
    description: 'DOCX 문서 (Word)',
  },
  {
    format: 'doc',
    filename: 'test.doc',
    url: 'https://file-examples.com/storage/fe783367f1adfa48b993ea8/2017/02/file-sample_100kB.doc',
    description: 'DOC 문서 (구버전 Word)',
  },
  {
    format: 'xlsx',
    filename: 'test.xlsx',
    url: 'https://file-examples.com/storage/fe783367f1adfa48b993ea8/2017/02/file_example_XLSX_10.xlsx',
    description: 'XLSX 스프레드시트 (Excel)',
  },
  {
    format: 'xls',
    filename: 'test.xls',
    url: 'https://file-examples.com/storage/fe783367f1adfa48b993ea8/2017/02/file_example_XLS_10.xls',
    description: 'XLS 스프레드시트 (구버전 Excel)',
  },
  {
    format: 'pptx',
    filename: 'test.pptx',
    url: 'https://file-examples.com/storage/fe783367f1adfa48b993ea8/2017/08/file_example_PPT_250kB.pptx',
    description: 'PPTX 프레젠테이션 (PowerPoint)',
  },
  {
    format: 'ppt',
    filename: 'test.ppt',
    url: 'https://file-examples.com/storage/fe783367f1adfa48b993ea8/2017/08/file_example_PPT_250kB.ppt',
    description: 'PPT 프레젠테이션 (구버전 PowerPoint)',
  },
];

// 디렉토리 생성
if (!fs.existsSync(TEST_FILES_DIR)) {
  fs.mkdirSync(TEST_FILES_DIR, { recursive: true });
}

// 다운로드 함수
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, { timeout: 30000 }, response => {
      // 리다이렉트 처리
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        console.log(`  ↪️  리다이렉트: ${redirectUrl}`);
        return downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      const file = fs.createWriteStream(destPath);
      let downloadedBytes = 0;
      const totalBytes = parseInt(response.headers['content-length'], 10);

      response.on('data', chunk => {
        downloadedBytes += chunk.length;
        if (totalBytes) {
          const progress = ((downloadedBytes / totalBytes) * 100).toFixed(1);
          process.stdout.write(`\r  📥 다운로드 중: ${progress}% (${(downloadedBytes / 1024).toFixed(0)} KB)`);
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        process.stdout.write('\r');
        resolve({ size: downloadedBytes });
      });

      file.on('error', err => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });

    request.on('error', err => {
      reject(err);
    });

    request.on('timeout', () => {
      request.destroy();
      reject(new Error('다운로드 타임아웃 (30초)'));
    });
  });
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🌐 HQMX Converter - 테스트 파일 다운로드');
  console.log('='.repeat(70) + '\n');

  console.log(`📁 다운로드 위치: ${TEST_FILES_DIR}`);
  console.log(`📦 다운로드할 파일: ${DOWNLOAD_LIST.length}개\n`);

  const results = {
    total: DOWNLOAD_LIST.length,
    downloaded: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  for (let i = 0; i < DOWNLOAD_LIST.length; i++) {
    const item = DOWNLOAD_LIST[i];
    const destPath = path.join(TEST_FILES_DIR, item.filename);
    const progress = `[${i + 1}/${DOWNLOAD_LIST.length}]`;

    console.log(`${progress} ${item.format.toUpperCase()}: ${item.description}`);

    // 기존 파일 확인
    if (fs.existsSync(destPath) && !forceDownload) {
      const stats = fs.statSync(destPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`  ✅ 이미 존재함 (${sizeKB} KB) - 스킵\n`);
      results.skipped++;
      results.details.push({
        format: item.format,
        status: 'skipped',
        reason: '이미 존재',
      });
      continue;
    }

    // 다운로드
    try {
      console.log(`  🔗 URL: ${item.url}`);
      const { size } = await downloadFile(item.url, destPath);
      const sizeKB = (size / 1024).toFixed(2);
      console.log(`  ✅ 다운로드 완료 (${sizeKB} KB)\n`);
      results.downloaded++;
      results.details.push({
        format: item.format,
        status: 'success',
        size: `${sizeKB} KB`,
      });
    } catch (error) {
      console.log(`  ❌ 실패: ${error.message}\n`);
      results.failed++;
      results.details.push({
        format: item.format,
        status: 'failed',
        error: error.message,
      });
    }

    // 요청 간 딜레이 (서버 부담 감소)
    if (i < DOWNLOAD_LIST.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // 결과 요약
  console.log('='.repeat(70));
  console.log('📊 다운로드 결과\n');
  console.log(`  총 파일:     ${results.total}개`);
  console.log(`  ✅ 다운로드: ${results.downloaded}개`);
  console.log(`  ⏭️  스킵:     ${results.skipped}개`);
  console.log(`  ❌ 실패:     ${results.failed}개`);
  console.log('='.repeat(70) + '\n');

  // 상세 결과
  if (results.downloaded > 0) {
    console.log('✅ 다운로드 성공:\n');
    results.details
      .filter(d => d.status === 'success')
      .forEach(d => {
        console.log(`  ${d.format.padEnd(10)} → ${d.size}`);
      });
    console.log();
  }

  if (results.failed > 0) {
    console.log('❌ 다운로드 실패:\n');
    results.details
      .filter(d => d.status === 'failed')
      .forEach(d => {
        console.log(`  ${d.format.padEnd(10)} → ${d.error}`);
      });
    console.log();
  }

  // 다음 단계 안내
  if (results.downloaded > 0 || results.skipped > 0) {
    console.log('🎯 다음 단계:\n');
    console.log('  1. 파일 상태 확인:');
    console.log('     node generate-dummy-files.js\n');
    console.log('  2. 전체 테스트 실행:');
    console.log('     node test-comprehensive.js\n');
  }

  // FILE_MAP 업데이트 안내
  if (results.downloaded > 0) {
    console.log('⚠️  중요: test-comprehensive.js의 FILE_MAP을 업데이트해야 합니다!\n');
    console.log('다음 항목들을 null에서 파일명으로 변경하세요:');
    results.details
      .filter(d => d.status === 'success')
      .forEach(d => {
        const item = DOWNLOAD_LIST.find(i => i.format === d.format);
        console.log(`  ${d.format}: null → '${item.filename}'`);
      });
    console.log();
  }

  // 종료 코드
  process.exit(results.failed > 0 ? 1 : 0);
}

// 실행
main().catch(error => {
  console.error('\n❌ 치명적 오류:', error);
  process.exit(1);
});
