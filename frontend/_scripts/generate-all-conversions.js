/**
 * HQMX Converter - 전체 변환 조합 자동 생성
 *
 * 총 289개의 가능한 변환 조합을 자동으로 생성합니다.
 *
 * 사용법:
 *   node generate-all-conversions.js
 */

const fs = require('fs');
const path = require('path');

// 지원 형식 정의
const FORMATS = {
  image: ['jpg', 'png', 'webp', 'heic', 'gif', 'svg', 'bmp', 'ico', 'avif'],
  video: ['mp4', 'mov', 'mkv', 'flv', 'wmv', 'webm', 'avi', 'm4v'],
  audio: ['mp3', 'm4a', 'flac', 'ogg', 'aac', 'wma', 'wav', 'opus'],
  document: ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'txt']
};

// 인기 변환 조합 (우선순위 9-10)
const POPULAR_CONVERSIONS = {
  'jpg→png': 10,
  'png→jpg': 10,
  'webp→jpg': 9,
  'webp→png': 9,
  'heic→jpg': 9,
  'heic→png': 9,
  'mp4→avi': 9,
  'avi→mp4': 9,
  'mov→mp4': 9,
  'mp4→webm': 8,
  'mp3→wav': 8,
  'wav→mp3': 8,
  'm4a→mp3': 9,
  'flac→mp3': 9,
  'mp4→mp3': 10, // 비디오 → 오디오 (매우 인기)
  'jpg→pdf': 9,
  'png→pdf': 9,
  'pdf→jpg': 9,
  'pdf→png': 8
};

// 카테고리별 기본 우선순위
const CATEGORY_PRIORITY = {
  'image→image': 7,
  'video→video': 7,
  'audio→audio': 6,
  'video→audio': 8, // 비디오에서 오디오 추출은 인기 많음
  'document→document': 6,
  'image→document': 8,
  'document→image': 8,
  'video→image': 7,
  'image→video': 6
};

function generateConversions() {
  const conversions = [];
  let popularCount = 0;

  console.log('🔄 전체 변환 조합 생성 중...\n');

  // 1. 이미지 → 이미지 (72개)
  console.log('📸 이미지 → 이미지 변환 생성...');
  for (const from of FORMATS.image) {
    for (const to of FORMATS.image) {
      if (from === to) continue;

      const key = `${from}→${to}`;
      const priority = POPULAR_CONVERSIONS[key] || CATEGORY_PRIORITY['image→image'];
      const popular = priority >= 9;

      conversions.push({
        from,
        to,
        fromCategory: 'image',
        toCategory: 'image',
        priority,
        popular
      });

      if (popular) popularCount++;
    }
  }
  console.log(`  ✅ ${conversions.length}개 생성 (인기: ${popularCount}개)\n`);

  // 2. 비디오 → 비디오 (56개)
  console.log('🎬 비디오 → 비디오 변환 생성...');
  const beforeVideo = conversions.length;
  let videoPopular = 0;
  for (const from of FORMATS.video) {
    for (const to of FORMATS.video) {
      if (from === to) continue;

      const key = `${from}→${to}`;
      const priority = POPULAR_CONVERSIONS[key] || CATEGORY_PRIORITY['video→video'];
      const popular = priority >= 9;

      conversions.push({
        from,
        to,
        fromCategory: 'video',
        toCategory: 'video',
        priority,
        popular
      });

      if (popular) videoPopular++;
    }
  }
  console.log(`  ✅ ${conversions.length - beforeVideo}개 생성 (인기: ${videoPopular}개)\n`);

  // 3. 오디오 → 오디오 (56개)
  console.log('🎵 오디오 → 오디오 변환 생성...');
  const beforeAudio = conversions.length;
  let audioPopular = 0;
  for (const from of FORMATS.audio) {
    for (const to of FORMATS.audio) {
      if (from === to) continue;

      const key = `${from}→${to}`;
      const priority = POPULAR_CONVERSIONS[key] || CATEGORY_PRIORITY['audio→audio'];
      const popular = priority >= 9;

      conversions.push({
        from,
        to,
        fromCategory: 'audio',
        toCategory: 'audio',
        priority,
        popular
      });

      if (popular) audioPopular++;
    }
  }
  console.log(`  ✅ ${conversions.length - beforeAudio}개 생성 (인기: ${audioPopular}개)\n`);

  // 4. 비디오 → 오디오 (64개) - 매우 인기 있는 변환
  console.log('🎬→🎵 비디오 → 오디오 변환 생성...');
  const beforeVideoAudio = conversions.length;
  let vaPopular = 0;
  for (const from of FORMATS.video) {
    for (const to of FORMATS.audio) {
      const key = `${from}→${to}`;
      const priority = POPULAR_CONVERSIONS[key] || CATEGORY_PRIORITY['video→audio'];
      const popular = priority >= 9;

      conversions.push({
        from,
        to,
        fromCategory: 'video',
        toCategory: 'audio',
        priority,
        popular
      });

      if (popular) vaPopular++;
    }
  }
  console.log(`  ✅ ${conversions.length - beforeVideoAudio}개 생성 (인기: ${vaPopular}개)\n`);

  // 5. 문서 → PDF (7개)
  console.log('📄 문서 → PDF 변환 생성...');
  const beforeDoc = conversions.length;
  let docPopular = 0;
  for (const from of FORMATS.document) {
    if (from === 'pdf') continue;

    const key = `${from}→pdf`;
    const priority = POPULAR_CONVERSIONS[key] || 7;
    const popular = priority >= 9;

    conversions.push({
      from,
      to: 'pdf',
      fromCategory: 'document',
      toCategory: 'document',
      priority,
      popular
    });

    if (popular) docPopular++;
  }
  console.log(`  ✅ ${conversions.length - beforeDoc}개 생성 (인기: ${docPopular}개)\n`);

  // 6. 이미지 → PDF (9개)
  console.log('📸→📄 이미지 → PDF 변환 생성...');
  const beforeImgDoc = conversions.length;
  let imgDocPopular = 0;
  for (const from of FORMATS.image) {
    const key = `${from}→pdf`;
    const priority = POPULAR_CONVERSIONS[key] || CATEGORY_PRIORITY['image→document'];
    const popular = priority >= 9;

    conversions.push({
      from,
      to: 'pdf',
      fromCategory: 'image',
      toCategory: 'document',
      priority,
      popular
    });

    if (popular) imgDocPopular++;
  }
  console.log(`  ✅ ${conversions.length - beforeImgDoc}개 생성 (인기: ${imgDocPopular}개)\n`);

  // 7. PDF → 이미지 (9개)
  console.log('📄→📸 PDF → 이미지 변환 생성...');
  const beforeDocImg = conversions.length;
  let docImgPopular = 0;
  for (const to of FORMATS.image) {
    const key = `pdf→${to}`;
    const priority = POPULAR_CONVERSIONS[key] || CATEGORY_PRIORITY['document→image'];
    const popular = priority >= 9;

    conversions.push({
      from: 'pdf',
      to,
      fromCategory: 'document',
      toCategory: 'image',
      priority,
      popular
    });

    if (popular) docImgPopular++;
  }
  console.log(`  ✅ ${conversions.length - beforeDocImg}개 생성 (인기: ${docImgPopular}개)\n`);

  // 8. 비디오 → GIF (8개)
  console.log('🎬→🖼️  비디오 → GIF 변환 생성...');
  const beforeVidGif = conversions.length;
  let vidGifPopular = 0;
  for (const from of FORMATS.video) {
    const key = `${from}→gif`;
    const priority = POPULAR_CONVERSIONS[key] || CATEGORY_PRIORITY['video→image'];
    const popular = priority >= 9;

    conversions.push({
      from,
      to: 'gif',
      fromCategory: 'video',
      toCategory: 'image',
      priority,
      popular
    });

    if (popular) vidGifPopular++;
  }
  console.log(`  ✅ ${conversions.length - beforeVidGif}개 생성 (인기: ${vidGifPopular}개)\n`);

  // 9. GIF → 비디오 (8개)
  console.log('🖼️→🎬 GIF → 비디오 변환 생성...');
  const beforeGifVid = conversions.length;
  let gifVidPopular = 0;
  for (const to of FORMATS.video) {
    const key = `gif→${to}`;
    const priority = POPULAR_CONVERSIONS[key] || CATEGORY_PRIORITY['image→video'];
    const popular = priority >= 9;

    conversions.push({
      from: 'gif',
      to,
      fromCategory: 'image',
      toCategory: 'video',
      priority,
      popular
    });

    if (popular) gifVidPopular++;
  }
  console.log(`  ✅ ${conversions.length - beforeGifVid}개 생성 (인기: ${gifVidPopular}개)\n`);

  return conversions;
}

function main() {
  console.log('=' .repeat(70));
  console.log('🚀 HQMX Converter - 전체 변환 조합 생성');
  console.log('='.repeat(70) + '\n');

  // 변환 조합 생성
  const conversions = generateConversions();

  // 통계
  const totalPopular = conversions.filter(c => c.popular).length;
  const priorityDistribution = conversions.reduce((acc, c) => {
    acc[c.priority] = (acc[c.priority] || 0) + 1;
    return acc;
  }, {});

  console.log('='.repeat(70));
  console.log('📊 생성 완료\n');
  console.log(`  총 변환 수:     ${conversions.length}개`);
  console.log(`  인기 변환:      ${totalPopular}개 (우선순위 9-10)`);
  console.log(`  일반 변환:      ${conversions.length - totalPopular}개 (우선순위 5-8)`);
  console.log('\n  우선순위 분포:');
  Object.keys(priorityDistribution)
    .sort((a, b) => b - a)
    .forEach(priority => {
      console.log(`    ${priority}점: ${priorityDistribution[priority]}개`);
    });
  console.log('='.repeat(70) + '\n');

  // 파일 저장
  const outputPath = path.join(__dirname, 'conversions.json');
  fs.writeFileSync(outputPath, JSON.stringify(conversions, null, 2), 'utf-8');

  console.log(`✅ 저장 완료: ${outputPath}\n`);
  console.log('🎯 다음 단계:\n');
  console.log('  1. SEO 페이지 생성:');
  console.log('     node generate-pages.js\n');
  console.log('  2. 전체 변환 테스트 (선택):');
  console.log('     cd ../.. && node test-comprehensive.js\n');
  console.log('  3. 서버 배포:');
  console.log('     ./deploy-to-ec2.sh\n');
}

main();
