# Google 검색 노출 등록 가이드

## 🎯 목표
"jpg to png converter" 검색 시 `https://converter.hqmx.net/` 또는 `https://hqmx.net/` 노출

## 📋 준비사항
1. 도메인 소유권 확인
2. 사이트 콘텐츠 최적화
3. sitemap.xml 및 robots.txt 준비

---

## 1️⃣ Google Search Console 등록

### 1.1 Search Console 접속
1. https://search.google.com/search-console 접속
2. Google 계정으로 로그인

### 1.2 속성 추가
1. 좌측 상단 "속성 추가" 클릭
2. **도메인** 또는 **URL 접두어** 선택
   - **권장**: URL 접두어 → `https://hqmx.net`
   - 대안: 도메인 → `hqmx.net` (모든 하위 도메인 포함)

### 1.3 소유권 확인 방법 (5가지 중 선택)

#### 방법 1: HTML 파일 업로드 (가장 간단)
```bash
# Google이 제공한 HTML 파일 다운로드 (예: google1234567890abcdef.html)
# 파일 내용: google-site-verification: google1234567890abcdef.html

# 서버의 public root에 업로드
scp -i hqmx-ec2.pem google1234567890abcdef.html ubuntu@23.22.45.186:/tmp/
ssh -i hqmx-ec2.pem ubuntu@23.22.45.186 \
  'sudo cp /tmp/google1234567890abcdef.html /var/www/html/ && \
   sudo chown www-data:www-data /var/www/html/google1234567890abcdef.html'

# 확인: https://converter.hqmx.net/google1234567890abcdef.html
```

#### 방법 2: HTML 태그 (현재 권장)
`frontend/index.html`의 `<head>` 섹션에 추가:
```html
<head>
    <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />
    <!-- 기존 meta 태그들... -->
</head>
```

#### 방법 3: DNS TXT 레코드
Cloudflare 또는 도메인 DNS 설정에 추가:
```
Type: TXT
Name: @ (또는 converter)
Content: google-site-verification=YOUR_VERIFICATION_CODE
```

#### 방법 4: Google Analytics
이미 GA4가 설정되어 있다면 자동 확인 가능

#### 방법 5: Google Tag Manager
GTM이 설정되어 있다면 자동 확인 가능

---

## 2️⃣ sitemap.xml 생성 및 제출

### 2.1 sitemap.xml 생성
`frontend/sitemap.xml` 파일 생성:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- 메인 페이지 -->
  <url>
    <loc>https://converter.hqmx.net/</loc>
    <lastmod>2025-10-10</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- 약관 페이지 -->
  <url>
    <loc>https://converter.hqmx.net/terms.html</loc>
    <lastmod>2025-10-10</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>

  <!-- 개인정보처리방침 -->
  <url>
    <loc>https://converter.hqmx.net/privacy.html</loc>
    <lastmod>2025-10-10</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>
```

### 2.2 sitemap.xml 업로드
```bash
scp -i hqmx-ec2.pem frontend/sitemap.xml ubuntu@23.22.45.186:/tmp/
ssh -i hqmx-ec2.pem ubuntu@23.22.45.186 \
  'sudo cp /tmp/sitemap.xml /var/www/html/ && \
   sudo chown www-data:www-data /var/www/html/sitemap.xml'

# 확인: https://converter.hqmx.net/sitemap.xml
```

### 2.3 Search Console에 sitemap 제출
1. Google Search Console → "Sitemaps" 메뉴
2. "새 사이트맵 추가" 클릭
3. `sitemap.xml` 입력 후 제출
4. 상태가 "성공"으로 변경되는지 확인 (24시간 이내)

---

## 3️⃣ robots.txt 설정

### 3.1 robots.txt 생성
`frontend/robots.txt` 파일 생성:

```txt
# HQMX Converter - Robots.txt
User-agent: *
Allow: /

# 특정 파일 제외
Disallow: /assets/
Disallow: /*.js$
Disallow: /*.css$

# Sitemap 위치
Sitemap: https://converter.hqmx.net/sitemap.xml
```

### 3.2 robots.txt 업로드
```bash
scp -i hqmx-ec2.pem frontend/robots.txt ubuntu@23.22.45.186:/tmp/
ssh -i hqmx-ec2.pem ubuntu@23.22.45.186 \
  'sudo cp /tmp/robots.txt /var/www/html/ && \
   sudo chown www-data:www-data /var/www/html/robots.txt'

# 확인: https://converter.hqmx.net/robots.txt
```

---

## 4️⃣ SEO 최적화 (index.html)

### 4.1 메타 태그 최적화
`frontend/index.html`의 `<head>` 섹션 확인 및 개선:

```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- 🎯 핵심 SEO 메타 태그 -->
    <title>Free JPG to PNG Converter | HQMX Converter</title>
    <meta name="description" content="Convert JPG to PNG, PNG to JPG, WebP, HEIC, and 300+ file formats online. Free, fast, and secure file converter with no upload required.">
    <meta name="keywords" content="jpg to png, png to jpg, image converter, webp converter, heic to jpg, file converter, online converter">

    <!-- Open Graph (Facebook, LinkedIn) -->
    <meta property="og:title" content="Free JPG to PNG Converter | HQMX Converter">
    <meta property="og:description" content="Convert any file format online - images, videos, audio, documents. 100% free and secure.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://converter.hqmx.net/">
    <meta property="og:image" content="https://converter.hqmx.net/assets/og-image.jpg">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Free JPG to PNG Converter | HQMX Converter">
    <meta name="twitter:description" content="Convert any file format online - images, videos, audio, documents.">
    <meta name="twitter:image" content="https://converter.hqmx.net/assets/twitter-card.jpg">

    <!-- Canonical URL -->
    <link rel="canonical" href="https://converter.hqmx.net/">
</head>
```

### 4.2 구조화된 데이터 (JSON-LD)
`</head>` 태그 직전에 추가:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "HQMX Converter",
  "description": "Free online file converter supporting 300+ formats",
  "url": "https://converter.hqmx.net",
  "applicationCategory": "MultimediaApplication",
  "operatingSystem": "Web browser",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "featureList": [
    "JPG to PNG conversion",
    "PNG to JPG conversion",
    "WebP converter",
    "HEIC to JPG",
    "Video converter",
    "Audio converter",
    "No file upload required",
    "Client-side processing"
  ],
  "softwareVersion": "1.0",
  "author": {
    "@type": "Organization",
    "name": "HQMX",
    "url": "https://hqmx.net"
  }
}
</script>
```

---

## 5️⃣ 콘텐츠 최적화

### 5.1 주요 키워드 타겟팅
메인 페이지 콘텐츠에 다음 키워드 자연스럽게 포함:

**1순위 키워드**:
- "jpg to png converter"
- "png to jpg"
- "image converter online"
- "free file converter"

**2순위 키워드**:
- "webp to jpg"
- "heic to jpg"
- "convert jpg to pdf"
- "online converter no upload"

### 5.2 제목 태그 (H1, H2, H3) 최적화
```html
<h1>Free JPG to PNG Converter Online</h1>
<h2>Convert Images, Videos, Audio Files Online</h2>
<h3>No Upload Required - 100% Secure Conversion</h3>
```

### 5.3 텍스트 콘텐츠 추가
메인 페이지 하단에 설명 섹션 추가:

```html
<section class="seo-content">
  <h2>Why Use HQMX Converter?</h2>
  <p>
    HQMX Converter is a free online tool that converts <strong>JPG to PNG</strong>,
    <strong>PNG to JPG</strong>, and 300+ other file formats directly in your browser.
    Unlike other converters, we don't upload your files to any server—all conversion
    happens on your device, ensuring complete privacy and security.
  </p>

  <h3>Supported Conversions</h3>
  <ul>
    <li><strong>Image Conversions</strong>: JPG, PNG, WebP, HEIC, AVIF, SVG, GIF, TIFF</li>
    <li><strong>Video Conversions</strong>: MP4, AVI, MOV, WebM, MKV, FLV</li>
    <li><strong>Audio Conversions</strong>: MP3, WAV, FLAC, AAC, OGG, M4A</li>
    <li><strong>Document Conversions</strong>: PDF, DOCX, PPTX, EPUB, TXT</li>
  </ul>

  <h3>How to Convert JPG to PNG</h3>
  <ol>
    <li>Drop your JPG file or click "Select Files"</li>
    <li>Choose PNG as output format</li>
    <li>Click "Convert" and download your PNG file</li>
  </ol>
</section>
```

---

## 6️⃣ URL 구조 최적화 (선택사항)

### 6.1 해시 라우팅 활용
현재 메인 페이지에서 해시 라우팅으로 변환 타입 구분:

```
https://converter.hqmx.net/#jpg-to-png
https://converter.hqmx.net/#png-to-jpg
https://converter.hqmx.net/#webp-to-jpg
```

### 6.2 URL 파라미터 활용
쿼리 파라미터로 변환 타입 지정:

```
https://converter.hqmx.net/?from=jpg&to=png
https://converter.hqmx.net/?from=png&to=jpg
```

`frontend/script.js`에서 URL 파라미터 파싱:

```javascript
// URL 파라미터 읽기
const urlParams = new URLSearchParams(window.location.search);
const fromFormat = urlParams.get('from');
const toFormat = urlParams.get('to');

if (fromFormat && toFormat) {
    // 자동으로 입력/출력 형식 선택
    console.log(`Converting ${fromFormat} to ${toFormat}`);
}
```

---

## 7️⃣ 색인 요청 및 모니터링

### 7.1 URL 검사 도구로 즉시 색인 요청
1. Google Search Console → "URL 검사" 메뉴
2. `https://converter.hqmx.net/` 입력
3. "색인 생성 요청" 클릭
4. Google이 즉시 크롤링 시작 (24-48시간 소요)

### 7.2 성능 모니터링
**Search Console 메뉴**:
- **실적**: 클릭수, 노출수, CTR, 평균 순위
- **색인 생성 범위**: 색인된 페이지 수
- **사이트맵**: sitemap.xml 상태
- **모바일 사용성**: 모바일 친화성 문제
- **Core Web Vitals**: 페이지 속도 및 성능

### 7.3 주요 검색어 모니터링
- "jpg to png converter"
- "png to jpg"
- "online image converter"
- "free file converter"

---

## 8️⃣ 추가 SEO 전략

### 8.1 백링크 구축
- Reddit, Quora, Stack Overflow 등에서 자연스럽게 도구 소개
- ProductHunt, BetaList 등 런칭 플랫폼 활용
- 블로그 포스팅 (Medium, Dev.to)

### 8.2 소셜 미디어 공유
- Twitter/X, Facebook, LinkedIn에 공유
- 해시태그: #fileconverter #jpgtopng #webtools

### 8.3 성능 최적화
- 페이지 로딩 속도 개선 (Core Web Vitals)
- 이미지 최적화 (WebP 사용)
- CDN 활용 (Cloudflare)

---

## 📊 예상 타임라인

| 단계 | 소요 시간 | 상태 |
|------|-----------|------|
| Search Console 등록 | 1일 | ⏳ 대기 |
| Sitemap 제출 | 1일 | ⏳ 대기 |
| 첫 색인 생성 | 3-7일 | ⏳ 대기 |
| 검색 결과 노출 | 2-4주 | ⏳ 대기 |
| 순위 상승 | 2-3개월 | ⏳ 대기 |

---

## ✅ 체크리스트

- [ ] Google Search Console 등록
- [ ] 소유권 확인 (HTML 태그 또는 파일)
- [ ] sitemap.xml 생성 및 제출
- [ ] robots.txt 생성 및 업로드
- [ ] SEO 메타 태그 최적화
- [ ] 구조화된 데이터 추가 (JSON-LD)
- [ ] 콘텐츠 키워드 최적화
- [ ] URL 검사 및 색인 요청
- [ ] 성능 모니터링 설정

---

## 🔗 유용한 링크

- [Google Search Console](https://search.google.com/search-console)
- [Google Search Central](https://developers.google.com/search)
- [Schema.org 문서](https://schema.org/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Structured Data Testing Tool](https://search.google.com/test/rich-results)

---

## 📞 문제 해결

### Q1: 색인이 안 됩니다
**A**:
1. robots.txt에서 Disallow 설정 확인
2. sitemap.xml URL이 정확한지 확인
3. 소유권 확인이 완료되었는지 확인
4. URL 검사 도구로 수동 색인 요청

### Q2: 검색 결과에 나타나지 않습니다
**A**:
1. 경쟁이 매우 높은 키워드는 시간이 오래 걸림
2. 콘텐츠 품질 개선 필요
3. 백링크 구축 필요
4. 2-3개월 정도 기다려보기

### Q3: 순위가 낮습니다
**A**:
1. 페이지 속도 최적화 (Core Web Vitals)
2. 콘텐츠 추가 및 개선
3. 내부 링크 구조 개선
4. 백링크 품질 향상
