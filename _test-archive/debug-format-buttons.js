/**
 * HQMX Converter - 포맷 버튼 문제 심층 디버깅 스크립트
 *
 * 목적: 파일 업로드 후 포맷 선택 버튼이 나타나지 않는 간헐적 문제 원인 파악
 */

const fs = require('fs');
const path = require('path');

async function debugFormatButtons() {
  const { chromium } = await import('playwright');

  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // 콘솔 로그 수집
  const consoleLogs = [];
  page.on('console', msg => {
    const log = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(log);
    console.log(`📋 Console: ${log}`);
  });

  // 에러 수집
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`❌ Page Error: ${error.message}`);
  });

  console.log('🌐 https://hqmx.net 접속 중...');
  await page.goto('https://hqmx.net', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  console.log('✅ 사이트 로드 완료\n');

  // 테스트할 파일 목록 (다양한 형식)
  const testFiles = [
    { name: 'sc_04.07.18.09.08.2025.jpg', type: 'image', category: 'image' },
    { name: 'test.png', type: 'image', category: 'image' },
    { name: 'test.gif', type: 'image', category: 'video' }, // GIF는 비디오로도 변환 가능
    { name: 'mobbg.mp4', type: 'video', category: 'video' },
    { name: 'test.mp3', type: 'audio', category: 'audio' },
    { name: 'test.pdf', type: 'document', category: 'document' },
  ];

  const results = [];

  for (const testFile of testFiles) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 테스트 파일: ${testFile.name} (${testFile.category})`);
    console.log('='.repeat(60));

    const filePath = path.join('./conv-test', testFile.name);

    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  파일 없음: ${filePath}`);
      continue;
    }

    try {
      // 페이지 새로고침
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // 파일 업로드
      console.log(`\n📤 파일 업로드: ${testFile.name}`);
      const fileInput = await page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(filePath);

      // 다양한 대기 시간 테스트
      const waitTimes = [1000, 3000, 5000, 10000];

      for (const waitTime of waitTimes) {
        console.log(`\n⏳ ${waitTime / 1000}초 대기 후 분석...`);
        await page.waitForTimeout(waitTime);

        // 1. JavaScript 상태 확인
        console.log('\n🔍 JavaScript 상태 확인:');
        const jsState = await page.evaluate(() => {
          return {
            hasConverterState: typeof window.converterState !== 'undefined',
            hasConverterEngine: typeof window.converterEngine !== 'undefined',
            hasFFmpeg: typeof window.ffmpeg !== 'undefined',
            files: window.converterState?.files || [],
            currentFile: window.converterState?.currentFile || null,
          };
        });
        console.log(`  - converterState: ${jsState.hasConverterState ? '✅ 존재' : '❌ 없음'}`);
        console.log(`  - converterEngine: ${jsState.hasConverterEngine ? '✅ 존재' : '❌ 없음'}`);
        console.log(`  - FFmpeg: ${jsState.hasFFmpeg ? '✅ 로드됨' : '❌ 없음'}`);
        console.log(`  - 업로드된 파일 수: ${jsState.files.length}개`);
        if (jsState.currentFile) {
          console.log(`  - 현재 파일: ${jsState.currentFile.name} (${jsState.currentFile.type})`);
        }

        // 2. 로딩 인디케이터 확인
        console.log('\n⏳ 로딩 상태 확인:');
        const loadingElements = await page.locator('.loading, [class*="loading"], .spinner, [class*="spinner"]').count();
        console.log(`  - 로딩 요소: ${loadingElements}개`);

        // 3. 포맷 버튼 상세 분석
        console.log('\n🔘 포맷 버튼 분석:');
        const allButtons = await page.locator('button').all();
        console.log(`  - 전체 버튼 수: ${allButtons.length}개`);

        const formatButtons = [];
        const imageFormats = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF', 'BMP', 'TIFF', 'SVG', 'HEIC', 'AVIF', 'ICO'];
        const videoFormats = ['MP4', 'AVI', 'MOV', 'MKV', 'FLV', 'WMV', 'WEBM', 'M4V'];
        const audioFormats = ['MP3', 'WAV', 'FLAC', 'M4A', 'OGG', 'AAC', 'WMA', 'OPUS'];
        const documentFormats = ['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX', 'TXT'];

        for (let i = 0; i < allButtons.length; i++) {
          const btn = allButtons[i];
          const text = await btn.textContent();
          const className = await btn.getAttribute('class');
          const isVisible = await btn.isVisible();
          const isEnabled = await btn.isEnabled();
          const isHidden = await btn.isHidden();

          const cleanText = text?.trim().toUpperCase() || '';
          const isFormatButton =
            imageFormats.some(fmt => cleanText.includes(fmt)) ||
            videoFormats.some(fmt => cleanText.includes(fmt)) ||
            audioFormats.some(fmt => cleanText.includes(fmt)) ||
            documentFormats.some(fmt => cleanText.includes(fmt));

          if (isFormatButton) {
            const category =
              imageFormats.some(fmt => cleanText.includes(fmt)) ? 'image' :
              videoFormats.some(fmt => cleanText.includes(fmt)) ? 'video' :
              audioFormats.some(fmt => cleanText.includes(fmt)) ? 'audio' : 'document';

            formatButtons.push({
              index: i,
              text: cleanText,
              className,
              category,
              visible: isVisible,
              enabled: isEnabled,
              hidden: isHidden,
            });

            const status = isVisible ? '✅ 보임' : isHidden ? '🚫 숨김' : '❓ 미확인';
            const enabledStatus = isEnabled ? '활성' : '비활성';
            console.log(`    [${i}] ${cleanText} (${category}) - ${status}, ${enabledStatus}`);
            console.log(`        class="${className}"`);
          }
        }

        console.log(`\n  📊 포맷 버튼 통계 (${waitTime / 1000}초):`);
        console.log(`    - 이미지: ${formatButtons.filter(b => b.category === 'image').length}개`);
        console.log(`    - 비디오: ${formatButtons.filter(b => b.category === 'video').length}개`);
        console.log(`    - 오디오: ${formatButtons.filter(b => b.category === 'audio').length}개`);
        console.log(`    - 문서: ${formatButtons.filter(b => b.category === 'document').length}개`);
        console.log(`    - 보이는 버튼: ${formatButtons.filter(b => b.visible).length}개`);
        console.log(`    - 숨겨진 버튼: ${formatButtons.filter(b => b.hidden).length}개`);

        // 4. DOM 구조 확인
        if (waitTime === 5000) { // 5초 대기 시에만 상세 분석
          console.log('\n🏗️  DOM 구조 분석:');

          // format-selection 컨테이너 확인
          const formatContainer = await page.locator('#formatSelection, .format-selection, [class*="format-selection"]').count();
          console.log(`  - format-selection 컨테이너: ${formatContainer}개`);

          if (formatContainer > 0) {
            const containerHTML = await page.locator('#formatSelection, .format-selection, [class*="format-selection"]').first().innerHTML();
            console.log(`  - 컨테이너 HTML (첫 100자):\n    ${containerHTML.substring(0, 100)}...`);
          }

          // 변환 버튼 확인
          const convertButtons = await page.locator('button.convert-btn, button#startConversionBtn, button:has-text("Convert")').count();
          console.log(`  - 변환 시작 버튼: ${convertButtons}개`);
        }

        // 결과 저장
        if (waitTime === 10000) { // 최종 결과만 저장
          results.push({
            file: testFile.name,
            category: testFile.category,
            formatButtons: formatButtons.length,
            visibleButtons: formatButtons.filter(b => b.visible).length,
            imageButtons: formatButtons.filter(b => b.category === 'image').length,
            videoButtons: formatButtons.filter(b => b.category === 'video').length,
            audioButtons: formatButtons.filter(b => b.category === 'audio').length,
            documentButtons: formatButtons.filter(b => b.category === 'document').length,
            jsState,
            errors: errors.length,
          });
        }
      }

      // 스크린샷 저장
      const screenshotName = `debug-${testFile.name.replace(/\./g, '_')}.png`;
      await page.screenshot({ path: screenshotName, fullPage: true });
      console.log(`\n📸 스크린샷 저장: ${screenshotName}`);

    } catch (error) {
      console.error(`\n❌ 오류 발생: ${error.message}`);
      results.push({
        file: testFile.name,
        category: testFile.category,
        error: error.message,
      });
    }
  }

  // 최종 결과 요약
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 최종 결과 요약');
  console.log('='.repeat(60));

  const summary = {
    timestamp: new Date().toISOString(),
    results,
    consoleLogs,
    errors,
  };

  // 결과 저장
  fs.writeFileSync('debug-results.json', JSON.stringify(summary, null, 2));
  console.log('\n✅ 결과 저장: debug-results.json');

  // 요약 출력
  console.log('\n📋 파일별 포맷 버튼 출현 현황:');
  results.forEach(result => {
    if (result.error) {
      console.log(`  ❌ ${result.file}: 오류 - ${result.error}`);
    } else {
      console.log(`  ${result.visibleButtons > 0 ? '✅' : '❌'} ${result.file}:`);
      console.log(`      전체: ${result.formatButtons}개, 보이는 버튼: ${result.visibleButtons}개`);
      console.log(`      이미지: ${result.imageButtons}개, 비디오: ${result.videoButtons}개, 오디오: ${result.audioButtons}개, 문서: ${result.documentButtons}개`);
    }
  });

  console.log('\n⏸️  브라우저를 30초간 열어둡니다. 수동으로 확인해보세요...');
  await page.waitForTimeout(30000);

  await browser.close();
  console.log('\n✅ 디버깅 완료!');
}

debugFormatButtons().catch(error => {
  console.error('❌ 치명적 오류:', error);
  process.exit(1);
});
