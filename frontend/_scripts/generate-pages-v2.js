const fs = require('fs');
const path = require('path');

// 경로 설정
const scriptsDir = __dirname;
const frontendDir = path.join(scriptsDir, '..');
const indexPath = path.join(frontendDir, 'index.html');
const conversionsPath = path.join(scriptsDir, 'conversions.json');
const metadataPath = path.join(scriptsDir, 'format-metadata.json');

// 설정 파일 로드
let conversions, metadata;
try {
    conversions = JSON.parse(fs.readFileSync(conversionsPath, 'utf8'));
    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
} catch (error) {
    console.error('❌ 설정 파일 로드 실패:', error.message);
    process.exit(1);
}

// index.html 로드 (원본 그대로)
let indexHtml;
try {
    indexHtml = fs.readFileSync(indexPath, 'utf8');
} catch (error) {
    console.error('❌ index.html 로드 실패:', error.message);
    process.exit(1);
}

/**
 * Related Conversions HTML 생성
 */
function generateRelatedConversions(from, to, category) {
    const related = [];

    // 1. 역방향 변환
    related.push(`<a href="/${to}-to-${from}.html" class="related-conversion-card">
        <span class="conversion-path">${to.toUpperCase()} → ${from.toUpperCase()}</span>
    </a>`);

    // 2. 같은 카테고리 인기 변환 2개
    const sameCategory = conversions
        .filter(c =>
            c.fromCategory === category &&
            c.from !== from &&
            c.to !== to &&
            c.from !== to &&
            c.to !== from
        )
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))
        .slice(0, 2);

    sameCategory.forEach(conv => {
        related.push(`<a href="/${conv.from}-to-${conv.to}.html" class="related-conversion-card">
            <span class="conversion-path">${conv.from.toUpperCase()} → ${conv.to.toUpperCase()}</span>
        </a>`);
    });

    return related.join('\n                    ');
}

// 각 변환 조합에 대해 페이지 생성
let successCount = 0;
let failCount = 0;

console.log('🚀 SEO 페이지 생성 시작 (V2 - Index.html 복사 방식)...\n');

conversions.forEach(({ from, to, fromCategory, toCategory, priority }) => {
    try {
        const fromMeta = metadata[from];
        const toMeta = metadata[to];

        if (!fromMeta || !toMeta) {
            console.warn(`⚠️  건너뜀: ${from}-to-${to} (메타데이터 없음)`);
            failCount++;
            return;
        }

        // 1. index.html 그대로 복사
        let html = indexHtml;

        // 2. <title> 태그 교체 (SEO)
        const originalTitle = '<title>HQMX Converter - Universal File Converter</title>';
        const newTitle = `<title>Convert ${from.toUpperCase()} to ${to.toUpperCase()} - Free Online Converter | HQMX</title>`;
        html = html.replace(originalTitle, newTitle);

        // 3. <meta description> 교체
        const originalDesc = /<meta name="description" content="[^"]*">/;
        const newDesc = `<meta name="description" content="Convert ${from.toUpperCase()} images to ${to.toUpperCase()} format online for free. High quality, fast conversion with transparency support. No registration required.">`;
        html = html.replace(originalDesc, newDesc);

        // 4. Open Graph 태그 추가/교체
        const ogTags = `
    <!-- Open Graph for ${from.toUpperCase()} to ${to.toUpperCase()} -->
    <meta property="og:title" content="Convert ${from.toUpperCase()} to ${to.toUpperCase()} - Free Online Converter">
    <meta property="og:description" content="Convert ${from.toUpperCase()} to ${to.toUpperCase()} online for free. High quality, fast conversion.">
    <meta property="og:url" content="https://converter.hqmx.net/${from}-to-${to}">
    <meta property="og:image" content="https://converter.hqmx.net/assets/og-${from}-to-${to}.jpg">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Convert ${from.toUpperCase()} to ${to.toUpperCase()} - Free Online Converter">`;

        // Open Graph가 이미 있다면 교체, 없다면 <link rel="stylesheet"> 앞에 삽입
        if (html.includes('<!-- Open Graph -->')) {
            html = html.replace(/<!-- Open Graph -->[\s\S]*?<meta name="twitter:title"[^>]*>/, ogTags);
        } else {
            html = html.replace('<link rel="stylesheet"', ogTags + '\n\n    <link rel="stylesheet"');
        }

        // 5. </head> 직전에 CONVERSION_CONFIG 삽입
        const conversionConfig = `
    <!-- Conversion Config -->
    <script>
        window.CONVERSION_CONFIG = {
            from: '${from.toUpperCase()}',
            to: '${to.toUpperCase()}',
            fromFormat: '${from.toLowerCase()}',
            toFormat: '${to.toLowerCase()}'
        };
    </script>
</head>`;
        html = html.replace('</head>', conversionConfig);

        // 6. tagline 교체 (선택적 - SEO에는 영향 없음, 사용자 경험용)
        const originalTagline = '<p class="tagline" data-i18n-key="tagline">Universal File Converter</p>';
        const newTagline = `<p class="tagline">${from.toUpperCase()} to ${to.toUpperCase()} Converter</p>`;
        html = html.replace(originalTagline, newTagline);

        // 7. 파일 저장
        const filename = `${from}-to-${to}.html`;
        const filepath = path.join(frontendDir, filename);
        fs.writeFileSync(filepath, html, 'utf8');

        console.log(`✓ ${filename}`);
        successCount++;

    } catch (error) {
        console.error(`❌ ${from}-to-${to} 생성 실패:`, error.message);
        failCount++;
    }
});

console.log(`\n📊 완료: ${successCount}개 성공, ${failCount}개 실패`);
console.log(`🎉 총 ${successCount}개의 SEO 페이지가 생성되었습니다!`);
console.log(`\n💡 index.html이 변경되면 자동으로 반영됩니다!`);

if (failCount > 0) {
    console.warn(`\n⚠️  ${failCount}개의 페이지 생성에 실패했습니다.`);
    process.exit(1);
}
