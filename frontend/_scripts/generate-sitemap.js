/**
 * Sitemap Generator - SEO를 위한 sitemap.xml 생성
 *
 * Google Search Console에 제출할 sitemap.xml 자동 생성
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const conversionsPath = path.join(__dirname, 'conversions.json');
const outputPath = path.join(__dirname, '..', 'sitemap.xml');

// 도메인 설정
const DOMAIN = 'https://hqmx.net';

// 지원 언어
const LANGUAGES = ['kr', 'en', 'ja', 'zh-CN', 'es', 'fr', 'de'];

// 변환 조합 로드
const conversions = JSON.parse(fs.readFileSync(conversionsPath, 'utf-8'));

// 우선순위 계산 (priority: 10 = 1.0, 1 = 0.1)
function calculatePriority(priority) {
  return (priority / 10).toFixed(1);
}

// 현재 날짜 (YYYY-MM-DD)
function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

// Sitemap XML 생성
function generateSitemap() {
  const lastmod = getCurrentDate();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">

  <!-- 메인 페이지 -->
  <url>
    <loc>${DOMAIN}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>

`;

  // 다국어 변환 페이지 추가
  conversions.forEach(conv => {
    const priority = calculatePriority(conv.priority);

    // 각 언어별로 URL 추가
    LANGUAGES.forEach(lang => {
      const url = `${DOMAIN}/${lang}/convert/${conv.from}-to-${conv.to}.html`;

      xml += `  <!-- ${conv.from.toUpperCase()} to ${conv.to.toUpperCase()} (${lang}) -->
  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
    <xhtml:link rel="alternate" hreflang="${lang}" href="${url}" />
  </url>

`;
    });
  });

  xml += `</urlset>`;

  return xml;
}

// 실행
try {
  console.log('🗺️  Sitemap 생성 시작...\n');

  const sitemap = generateSitemap();
  fs.writeFileSync(outputPath, sitemap, 'utf-8');

  const totalUrls = conversions.length * LANGUAGES.length + 1;
  console.log(`✅ Sitemap 생성 완료: ${outputPath}`);
  console.log(`📊 총 ${totalUrls}개 URL 등록 (메인 페이지 + ${conversions.length}개 변환 × ${LANGUAGES.length}개 언어)`);
  console.log(`🌐 지원 언어: ${LANGUAGES.join(', ')}`);
  console.log(`\n🔗 Google Search Console에 제출: ${DOMAIN}/sitemap.xml`);

} catch (err) {
  console.error('❌ Sitemap 생성 실패:', err.message);
  process.exit(1);
}
