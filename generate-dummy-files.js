/**
 * HQMX Converter - 더미 파일 생성 및 파일 상태 체크
 *
 * 기능:
 * - 테스트에 필요한 파일 존재 여부 확인
 * - 간단한 더미 파일 생성 (텍스트 기반)
 * - 누락된 파일 리포트
 *
 * 사용법:
 *   node generate-dummy-files.js          # 파일 상태 체크
 *   node generate-dummy-files.js --create # 더미 파일 생성
 */

const fs = require('fs');
const path = require('path');

const TEST_FILES_DIR = './conv-test';

// 파일 매핑 (test-comprehensive.js와 동일)
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

// 더미 파일 생성 템플릿
const DUMMY_TEMPLATES = {
  txt: () => `HQMX Converter Test File
Generated: ${new Date().toISOString()}
Type: Plain Text
Purpose: Testing text file conversion

Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Test content for file conversion testing.`,

  csv: () => `Name,Age,City
Alice,25,Seoul
Bob,30,Busan
Charlie,35,Incheon`,

  json: () => JSON.stringify({
    test: true,
    timestamp: new Date().toISOString(),
    purpose: 'HQMX Converter Test File',
    data: [1, 2, 3, 4, 5],
  }, null, 2),

  xml: () => `<?xml version="1.0" encoding="UTF-8"?>
<test>
  <timestamp>${new Date().toISOString()}</timestamp>
  <purpose>HQMX Converter Test File</purpose>
  <data>
    <item>1</item>
    <item>2</item>
    <item>3</item>
  </data>
</test>`,

  html: () => `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>HQMX Converter Test</title>
</head>
<body>
  <h1>Test File</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  <p>Purpose: Testing HTML file conversion</p>
</body>
</html>`,

  md: () => `# HQMX Converter Test File

**Generated**: ${new Date().toISOString()}
**Purpose**: Testing Markdown file conversion

## Test Content

- Item 1
- Item 2
- Item 3

### Code Block

\`\`\`javascript
console.log('Hello, HQMX Converter!');
\`\`\`
`,

  svg: () => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="#f0f0f0"/>
  <circle cx="100" cy="100" r="50" fill="#3498db"/>
  <text x="100" y="110" font-family="Arial" font-size="16" fill="white" text-anchor="middle">TEST</text>
</svg>`,
};

// CLI 옵션
const args = process.argv.slice(2);
const shouldCreate = args.includes('--create');

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('📁 HQMX Converter - 파일 상태 체크');
  console.log('='.repeat(70) + '\n');

  // 디렉토리 확인
  if (!fs.existsSync(TEST_FILES_DIR)) {
    console.log(`⚠️  테스트 파일 디렉토리가 없습니다: ${TEST_FILES_DIR}`);
    console.log(`   디렉토리를 생성합니다...\n`);
    fs.mkdirSync(TEST_FILES_DIR, { recursive: true });
  }

  // 파일 상태 체크
  const fileStatus = checkFileStatus();

  // 리포트 출력
  printReport(fileStatus);

  // 더미 파일 생성
  if (shouldCreate) {
    console.log('\n' + '─'.repeat(70));
    console.log('🛠️  더미 파일 생성 시작\n');
    await createDummyFiles(fileStatus);
  } else {
    console.log('\n💡 팁: 더미 파일을 생성하려면 --create 옵션을 사용하세요:');
    console.log('   node generate-dummy-files.js --create\n');
  }
}

function checkFileStatus() {
  const status = {
    total: 0,
    exists: 0,
    missing: 0,
    skipped: 0,
    details: {},
  };

  Object.entries(FILE_MAP).forEach(([format, filename]) => {
    status.total++;

    if (!filename) {
      status.skipped++;
      status.details[format] = { status: 'skip', reason: '의도적 스킵 (특수 포맷)' };
      return;
    }

    const filePath = path.join(TEST_FILES_DIR, filename);
    const exists = fs.existsSync(filePath);

    if (exists) {
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      status.exists++;
      status.details[format] = {
        status: 'exists',
        filename,
        path: filePath,
        size: `${sizeKB} KB`,
      };
    } else {
      status.missing++;
      status.details[format] = {
        status: 'missing',
        filename,
        path: filePath,
      };
    }
  });

  return status;
}

function printReport(status) {
  console.log('📊 파일 상태 요약\n');
  console.log(`  총 형식:     ${status.total}개`);
  console.log(`  ✅ 존재:     ${status.exists}개`);
  console.log(`  ❌ 누락:     ${status.missing}개`);
  console.log(`  ⏭️  스킵:     ${status.skipped}개\n`);

  if (status.exists > 0) {
    console.log('✅ 존재하는 파일:\n');
    Object.entries(status.details)
      .filter(([_, info]) => info.status === 'exists')
      .forEach(([format, info]) => {
        console.log(`  ${format.padEnd(10)} → ${info.filename.padEnd(40)} (${info.size})`);
      });
    console.log();
  }

  if (status.missing > 0) {
    console.log('❌ 누락된 파일:\n');
    Object.entries(status.details)
      .filter(([_, info]) => info.status === 'missing')
      .forEach(([format, info]) => {
        const canCreate = DUMMY_TEMPLATES[format] ? '✅ 생성 가능' : '⚠️  수동 필요';
        console.log(`  ${format.padEnd(10)} → ${info.filename.padEnd(40)} ${canCreate}`);
      });
    console.log();
  }

  if (status.skipped > 0) {
    console.log('⏭️  스킵된 파일:\n');
    Object.entries(status.details)
      .filter(([_, info]) => info.status === 'skip')
      .forEach(([format, info]) => {
        console.log(`  ${format.padEnd(10)} → ${info.reason}`);
      });
    console.log();
  }
}

async function createDummyFiles(status) {
  const missingFiles = Object.entries(status.details)
    .filter(([_, info]) => info.status === 'missing');

  if (missingFiles.length === 0) {
    console.log('  ✅ 모든 필요한 파일이 이미 존재합니다!\n');
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const [format, info] of missingFiles) {
    const template = DUMMY_TEMPLATES[format];

    if (!template) {
      console.log(`  ⏭️  ${format}: 더미 생성 불가 (수동으로 파일 준비 필요)`);
      skipped++;
      continue;
    }

    try {
      const content = template();
      fs.writeFileSync(info.path, content, 'utf-8');
      const sizeKB = (Buffer.byteLength(content, 'utf-8') / 1024).toFixed(2);
      console.log(`  ✅ ${format}: ${info.filename} 생성 (${sizeKB} KB)`);
      created++;
    } catch (error) {
      console.log(`  ❌ ${format}: 생성 실패 - ${error.message}`);
      skipped++;
    }
  }

  console.log('\n' + '─'.repeat(70));
  console.log(`✅ ${created}개 파일 생성 완료`);
  if (skipped > 0) {
    console.log(`⏭️  ${skipped}개 파일 스킵 (수동 준비 필요)`);
  }
  console.log('');
}

// 실행
main().catch(error => {
  console.error('\n❌ 오류:', error);
  process.exit(1);
});
