const fs = require('fs');
const path = require('path');

// 경로 설정
const scriptsDir = __dirname;
const frontendDir = path.join(scriptsDir, '..');
const templatePath = path.join(frontendDir, '_templates', 'conversion-page.html');
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

// 템플릿 로드
let template;
try {
    template = fs.readFileSync(templatePath, 'utf8');
} catch (error) {
    console.error('❌ 템플릿 파일 로드 실패:', error.message);
    process.exit(1);
}

/**
 * Related Conversions HTML 생성
 * @param {string} from - 변환 원본 형식
 * @param {string} to - 변환 대상 형식
 * @param {string} category - 카테고리
 * @returns {string} HTML 문자열
 */
function generateRelatedConversions(from, to, category) {
    const related = [];

    // 1. 역방향 변환 (항상 첫 번째)
    related.push(`<a href="/${to}-to-${from}.html" class="related-conversion-card">
        <span class="conversion-path">${to.toUpperCase()} → ${from.toUpperCase()}</span>
    </a>`);

    // 2. 같은 카테고리 내 인기 변환 2개
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

console.log('🚀 SEO 페이지 생성 시작...\n');

conversions.forEach(({ from, to, fromCategory, toCategory, priority }) => {
    try {
        const fromMeta = metadata[from];
        const toMeta = metadata[to];

        if (!fromMeta || !toMeta) {
            console.warn(`⚠️  건너뜀: ${from}-to-${to} (메타데이터 없음)`);
            failCount++;
            return;
        }

        // 플레이스홀더 치환
        let html = template
            .replace(/\{\{FROM_UPPER\}\}/g, from.toUpperCase())
            .replace(/\{\{TO_UPPER\}\}/g, to.toUpperCase())
            .replace(/\{\{FROM_LOWER\}\}/g, from.toLowerCase())
            .replace(/\{\{TO_LOWER\}\}/g, to.toLowerCase())
            .replace(/\{\{FROM_EXT\}\}/g, fromMeta.extensions[0])
            .replace(/\{\{TO_EXT\}\}/g, toMeta.extensions[0])
            .replace(/\{\{FROM_CATEGORY\}\}/g, fromCategory)
            .replace(/\{\{TO_CATEGORY\}\}/g, toCategory);

        // Related Conversions 생성
        const relatedHtml = generateRelatedConversions(from, to, fromCategory);
        html = html.replace('{{RELATED_CONVERSIONS}}', relatedHtml);

        // 파일 저장
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

if (failCount > 0) {
    console.warn(`\n⚠️  ${failCount}개의 페이지 생성에 실패했습니다.`);
    process.exit(1);
}
