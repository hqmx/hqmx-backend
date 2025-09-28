# 유니버설 파일 변환기 프로젝트

## 프로젝트 개요
- **도메인**: converter.hqmx.net
- **핵심 컨셉**: 하나의 유니버설 변환기로 100개 이상 파일 형식 지원
- **SEO 전략**: 동적 라우팅으로 각 변환별 고유 URL 생성 (예: /jpg-to-pdf)

## 아키텍처 요구사항

### 1. 단일 변환 엔진
- 모든 파일 변환을 처리하는 하나의 통합 엔진
- 100개 이상 형식 간 변환 지원
- 자동 파일 형식 감지

### 2. 동적 SEO 라우팅
- URL 패턴: converter.hqmx.net/[source]-to-[target]
- 예시: /jpg-to-pdf, /pdf-to-word, /mp4-to-mp3
- 각 URL은 SEO 최적화된 메타데이터 제공
- 실제로는 모두 같은 유니버설 변환기 컴포넌트 사용

### 3. 우선순위 파일 형식 (검색량 기준)
1. PDF ↔ Word (월 800만 검색)
2. YouTube → MP3 (월 600만 검색)  
3. JPG ↔ PDF (월 500만 검색)
4. WEBP ↔ PNG/JPG (월 400만 검색)
5. Excel ↔ PDF (월 300만 검색)

## 기술 스택 제안
- **프론트엔드**: Next.js 14 (App Router)
- **변환 처리**: 
  - 클라이언트: WebAssembly (ffmpeg.wasm, pdf-lib 등)
  - 서버: Sharp, FFmpeg, LibreOffice API
- **배포**: Vercel 또는 Cloudflare Pages
- **CDN**: Cloudflare

## 핵심 구현 파일 구조
converter.hqmx.net/
├── app/
│   ├── page.tsx                 // 메인 페이지
│   ├── [conversion]/page.tsx    // 동적 라우팅 (jpg-to-pdf 등)
│   └── api/
│       └── convert/route.ts     // 변환 API (필요시)
├── components/
│   └── UniversalConverter.tsx   // 유니버설 변환기 컴포넌트
├── lib/
│   ├── converter-engine.ts      // 변환 로직
│   ├── format-detector.ts       // 파일 형식 자동 감지
│   └── seo-metadata.ts          // SEO 메타데이터 생성
└── middleware.ts                 // 동적 라우팅 처리

## 주요 기능 구현 요청

### 1. 동적 라우팅 시스템
```typescript
// 요청: jpg-to-pdf URL로 접속 시
// 1. SEO 메타데이터 동적 생성 (타이틀: "JPG to PDF 변환")
// 2. 유니버설 변환기 표시 (JPG→PDF 기본 선택)
// 3. 사용자는 다른 형식도 선택 가능

// 요구사항:
// - 드래그 앤 드롭 파일 업로드
// - 자동 파일 형식 감지
// - 가능한 변환 옵션 자동 표시
// - 변환 진행률 표시
// - 다운로드 기능

// 각 변환 페이지마다:
// - 고유 메타 타이틀/설명
// - 구조화된 데이터 (Schema.org)
// - 자동 사이트맵 생성
// - 캐노니컬 URL 설정

성능 요구사항

변환 시간: 5초 이내 (대부분 파일)
Core Web Vitals: 90점 이상
모바일 최적화 필수 (검색의 60%가 모바일)

수익 모델 구현

무료: 파일당 최대 100MB, 하루 10회
프리미엄: 무제한 크기/횟수, 일괄 변환
광고: Google AdSense 통합 (무료 사용자)

참고할 경쟁 사이트

cloudconvert.com (99.99% 자연 트래픽)
convertio.co
smallpdf.com

이 프로젝트의 핵심은 "하나의 변환 엔진으로 모든 형식 지원 + SEO를 위한 동적 URL"입니다.

---

### Cursor에서 사용할 추가 프롬프트
```markdown
# 첫 구현 단계

1단계: Next.js 프로젝트 설정과 동적 라우팅 시스템 구축
- /[conversion]/page.tsx 생성
- jpg-to-pdf 형식 URL 파싱
- SEO 메타데이터 동적 생성

2단계: 유니버설 변환기 컴포넌트 개발
- 파일 업로드 인터페이스
- 형식 선택 드롭다운
- 변환 로직 통합

3단계: 상위 20개 변환 형식 우선 구현
- PDF 관련 변환
- 이미지 형식 변환
- 비디오/오디오 변환

코드를 작성할 때 다음을 명심해주세요:
- TypeScript 사용
- 모든 변환 로직은 하나의 엔진에서 처리
- SEO를 위한 서버사이드 렌더링 필수
- 모바일 우선 반응형 디자인

