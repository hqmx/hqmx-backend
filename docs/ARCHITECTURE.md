# HQMX Converter - 시스템 아키텍처 문서

## 📐 전체 아키텍처

### 🎯 4-Tier 스마트 라우팅 전략 (289개 변환)

**핵심 원칙**: 스마트 라우팅 - 업로드 시간을 고려한 동적 최적화

**핵심 전략**: **성능 최적화 우선** - 사용자 대기 시간 최소화
→ **서버 우선 활용** (t3.medium 무제한 모드로 빠른 변환) + 서버 부하 시 클라이언트로 자동 분산

```
┌─────────────────────────────────────────────────────────┐
│ Tier 1: 서버 우선 (184개 - 64%)                          │
│ - 비디오/오디오 변환 (모든 크기)                         │
│ - 예: MP4→AVI, MP3→WAV, 비디오→GIF                       │
│ - 이유: 서버가 3배+ 빠름 (무제한 모드 + FFmpeg 네이티브) │
│   예) 100MB MP4→AVI: 서버 1분 vs 클라이언트 3분 (67% 빠름)│
│ - 동시 처리: MAX_CONCURRENCY=4 (큐 대기 시 클라이언트)   │
├─────────────────────────────────────────────────────────┤
│ Tier 2: 파일 크기 기반 동적 라우팅 (81개 - 28%)          │
│ - 이미지 변환 (크기에 따라)                              │
│ - 작은 이미지 (<10MB): 클라이언트 (업로드 시간 없음)     │
│ - 대형 이미지 (>10MB): 서버 (Sharp 고성능)               │
│ - 예: JPG→PNG (1MB: 클라이언트, 50MB: 서버)              │
├─────────────────────────────────────────────────────────┤
│ Tier 3: 항상 서버 (24개 - 8%)                            │
│ - 문서 변환 (LibreOffice 필요)                           │
│ - 예: DOC/XLS→PDF, PDF→이미지                            │
│ - 이유: 클라이언트 불가능 (전문 소프트웨어 필요)         │
├─────────────────────────────────────────────────────────┤
│ Tier 4: 서버 부하 시 클라이언트 폴백                     │
│ - 서버 큐 대기 시간 > 30초: 자동 클라이언트 전환         │
│ - 사용자 선택 존중: "서버에서 변환" 체크박스 제공        │
│ - 프라이버시 우선 사용자: 항상 클라이언트 선택 가능      │
└─────────────────────────────────────────────────────────┘
```

**동적 라우팅 로직** (성능 우선):
```javascript
// 1단계: 형식 및 파일 크기 체크
if (isVideoOrAudio(format) || fileSize > 10MB) {
  // 비디오/오디오 또는 대형 파일: 서버 우선
  if (serverQueueTime < 30초 && serverAvailable) {
    서버_사용(); // 빠른 변환 (3배 빠름)
  } else {
    클라이언트_폴백(); // 큐 대기 시 클라이언트
  }
} else if (isDocument(format)) {
  // 문서 변환: 항상 서버 (LibreOffice 필요)
  서버_사용();
} else {
  // 작은 이미지: 클라이언트 (업로드 시간 절약)
  클라이언트_사용();
}

// 2단계: 사용자 선택 존중
if (user_preference === "always_client") {
  클라이언트_사용(); // 프라이버시 우선 사용자
}
```

**상세 문서**: `docs/conversion-routing-strategy.md`, `docs/conversion-tier-mapping.json`

---

## 🖥️ 프론트엔드 아키텍처

### 메인 프론트엔드 (`/frontend`) ✅ 완성된 앱

**아키텍처**: 순수 HTML/JS/CSS + WebAssembly

**핵심 파일**:
- `script.js` (5000+ 라인): 상태 관리, UI 제어, 이벤트 처리
- `converter-engine.js`: FFmpeg.wasm 래핑, 진행률 파싱
- `i18n.js`: 21개 언어 지원, 동적 번역
- `feature-flags.js`: 기능 토글 시스템

**변환 엔진**:
1. **FFmpeg.wasm 0.12.x (자체 호스팅)**:
   - **위치**: `/lib/ffmpeg/` (로컬 서버에서 제공)
   - **파일**:
     - `ffmpeg.js` (3.4KB)
     - `814.ffmpeg.js` (2.7KB)
     - `ffmpeg-core.js` (112KB)
     - `ffmpeg-core.wasm` (31MB)
   - **SharedArrayBuffer**: 멀티스레드 지원
   - **CORS 헤더**: nginx에서 COOP, COEP, CORP 헤더 제공
   - **API**: 0.12.x 버전 (writeFile, readFile, exec, deleteFile)
   - **진행률**: FFmpeg progress 이벤트 파싱

2. **Canvas API**: 이미지 변환
   - 브라우저 네이티브 API
   - JPG/PNG/WebP 변환
   - 품질/크기 조절

3. **자동 라우팅**: converter-engine.js
   - 형식별 엔진 자동 선택
   - 에러 처리 및 폴백

**주요 기능**:
- ✅ 실시간 진행률 추적
- ✅ 배치 변환 (여러 파일 동시)
- ✅ 21개 언어 지원
- ✅ 다크/라이트 테마
- ✅ 드래그&드롭 업로드
- ✅ 300+ 파일 형식
- ✅ SEO 최적화 (개별 변환 페이지)

### 핵심 아키텍처 패턴

#### 상태 관리 시스템 (`frontend/script.js`)
- **중앙화된 상태**: `state` 객체로 모든 파일, 변환 상태 관리
- **Map 기반 추적**: `conversions`, `eventSources`로 비동기 작업 추적
- **배치 처리 지원**: `batchFiles`로 다중 파일 처리

#### 변환 엔진 아키텍처 (`frontend/converter-engine.js`)
- **ConverterEngine 클래스**: FFmpeg.wasm과 Canvas API 통합 관리
- **지연 로딩**: FFmpeg 라이브러리를 필요시에만 동적 로드
- **진행률 파싱**: FFmpeg 출력을 실시간 진행률로 변환
- **메모리 관리**: 변환 완료 후 WASM 파일시스템 자동 정리

#### 다국어 시스템 (`frontend/i18n.js`)
- **I18n 클래스**: 번역 로딩 및 동적 적용
- **RTL 지원**: 아랍어, 히브리어 등 우측-좌측 언어 지원
- **브라우저 언어 감지**: 자동 언어 감지 및 localStorage 저장
- **동적 번역**: `data-i18n-key` 속성 기반 실시간 번역 적용

### 프론트엔드 파일 구조
```
frontend/
├── index.html              # 메인 페이지 (단 하나!)
├── script.js               # 메인 애플리케이션 로직 (5000+ 라인)
├── converter-engine.js     # FFmpeg.wasm 변환 엔진
├── i18n.js                 # 다국어 동적 로딩 시스템
├── feature-flags.js        # 기능 플래그 설정
├── style.css               # 스타일링 및 테마
├── locales/                # 다국어 번역 파일 (21개 언어)
│   ├── en.json
│   ├── es.json
│   ├── ko.json
│   └── ... (총 21개)
├── assets/                 # 정적 파일 (아이콘, 이미지)
├── _scripts/               # 빌드 스크립트
│   ├── generate-pages.js       # 변환 페이지 생성
│   └── generate-sitemap.js     # sitemap.xml 생성
├── _templates/             # 페이지 템플릿
│   └── conversion-page.html    # 변환 페이지 템플릿
└── (생성된 변환 페이지들)
    ├── jpg-to-png.html
    ├── mp4-to-avi.html
    └── ...
```

---

## ⚙️ 백엔드 아키텍처

### 백엔드 (EC2 기반) - 대용량 파일 전용 ⚠️

**플랫폼**: AWS EC2 (t3.medium spot instance)

**구성**:
- **nginx**: 정적 파일 서빙 + 리버스 프록시
- **FFmpeg**: 서버 사이드 변환 (fluent-ffmpeg)
- **Sharp**: 고성능 이미지 변환 (libvips)
- **pm2**: Node.js API 프로세스 관리

**역할**:
- 100-2500MB 대용량 파일 변환 (전체 트래픽의 5%)
- 스트리밍 방식 처리 (메모리 효율)
- 1시간 임시 파일 자동 삭제

**제한사항**:
- 2.5GB 하드 제한 (nginx body size)
- 동시 변환 4개 (메모리 제약)

### 인스턴스 사양 (2025-10-17 기준)
- **타입**: AWS EC2 t3.medium (Spot Instance - 70% 할인)
- **IP (Elastic IP)**: 23.21.183.81 ⚠️ 변경됨 (이전: 54.242.63.16)
- **CPU**: 2 vCPU (무제한 모드 활성화 - CPU 크레딧 제약 없음)
- **메모리**: 4GB RAM
- **디스크**: 20GB EBS gp3
- **동시 처리**: MAX_CONCURRENCY=4 (메모리 기준: 4GB / ~1GB per job)
- **처리 용량**:
  - 대형 비디오 (100-500MB): 동시 2-3개
  - 중형 비디오 (10-100MB): 동시 4-5개
  - 오디오/이미지: 동시 5-10개

### 백엔드 변환 엔진

#### 1. ImageConverter (Sharp 기반) ✅
**파일**: `backend/src/utils/converters/image-converter.js`

**기술 스택**:
- **Sharp v0.33.0**: libvips 기반 고성능 이미지 처리
- **지원 형식**: JPG, PNG, GIF, WebP, BMP, AVIF, HEIC, SVG

**주요 기능**:
- 파일 경로 기반 처리
- 실시간 진행률 업데이트
- 리사이즈 처리 (optional)
- 형식별 품질 설정

#### 2. VideoConverter (fluent-ffmpeg 기반) ✅
**파일**: `backend/src/utils/converters/video-converter.js`

**기술 스택**:
- **fluent-ffmpeg v2.1.3**: FFmpeg 래퍼
- **시스템 FFmpeg v6.1.1**: EC2에 설치됨

**지원 형식**: MP4, AVI, MOV, MKV, WebM, FLV, WMV, M4V

**품질 옵션**:
- high: CRF 18 (최고 품질, 큰 파일)
- medium: CRF 23 (기본값, 균형)
- low: CRF 28 (낮은 품질, 작은 파일)

#### 3. AudioConverter (fluent-ffmpeg 기반) ✅
**파일**: `backend/src/utils/converters/audio-converter.js`

**지원 형식**: MP3, WAV, FLAC, AAC, OGG, M4A, WMA, Opus

**설정 옵션**:
- quality: high (q=0), medium (q=2), low (q=4)
- bitrate: 32-320 kbps
- sampleRate: 44100, 48000, 96000
- channels: mono, stereo

---

## 🌍 SEO 최적화 시스템

### 개별 변환 페이지 시스템 (generate-pages.js)

**목적**: `/jpg-to-png.html`, `/mp4-to-avi.html` 등 **289개 전체** 개별 SEO 페이지 자동 생성

**파일 구조**:
```
frontend/
├── _templates/
│   └── conversion-page.html      # 마스터 템플릿 (플레이스홀더 포함)
├── _scripts/
│   ├── generate-pages.js         # 변환 페이지 빌드 스크립트
│   ├── generate-all-conversions.js  # conversions.json 자동 생성 (289개)
│   ├── conversions.json          # 변환 조합 목록 (289개 - 전체 생성)
│   └── format-metadata.json      # 형식별 상세 정보 (extensions, mimeType 등)
└── (생성된 HTML 파일들)
    ├── jpg-to-png.html
    ├── png-to-jpg.html
    └── ... (총 289개 - 전체)
```

### 플레이스홀더 규칙
템플릿에서 사용되는 플레이스홀더와 치환 예시:
- `{{FROM_UPPER}}` → JPG
- `{{TO_UPPER}}` → PNG
- `{{FROM_LOWER}}` → jpg
- `{{TO_LOWER}}` → png
- `{{FROM_EXT}}` → .jpg
- `{{TO_EXT}}` → .png
- `{{FROM_CATEGORY}}` → image
- `{{TO_CATEGORY}}` → image
- `{{RELATED_CONVERSIONS}}` → 동적 생성 HTML (역방향 변환 + 같은 카테고리 인기 변환 2개)

### 템플릿 적용 위치
1. **SEO 메타 태그**: title, description, Open Graph, Twitter Card
2. **변환 설정**: `window.CONVERSION_CONFIG` 객체
3. **헤더 tagline**: "JPG to PNG Converter"
4. **Upload Section**: h4 제목, conversion-indicator 뱃지, upload-text, file accept 속성
5. **Features Section**: 설명 텍스트
6. **Related Conversions Section**: 동적 생성되는 관련 변환 링크

---

## 🌐 다국어 시스템 (nginx + i18n.js)

### 아키텍처: 동적 로딩 방식 (파일 중복 없음)

**핵심 원리**: 단 하나의 `index.html` + nginx URL rewrite + 동적 번역 로딩

```
사용자 요청: /es/
    ↓
nginx rewrite: /index.html?lang=es
    ↓
i18n.js: URL에서 ?lang=es 감지
    ↓
/locales/es.json 동적 로드
    ↓
페이지 번역 적용 (DOM 조작)
```

### nginx 설정 (이미 적용됨)

```nginx
# 언어코드만 있는 경우 (홈페이지)
location ~ ^/(en|de|es|fr|ko|ja|...)/?$ {
    rewrite ^/([^/]+)/?$ /index.html?lang=$1 last;
}

# 언어 + 변환 경로
location ~ ^/(en|de|es|fr|ko|ja|...)/([a-z0-9]+)-to-([a-z0-9]+)/?$ {
    rewrite ^/([^/]+)/([^/]+)-to-([^/]+)/?$ /index.html?lang=$1&from=$2&to=$3 last;
}
```

### i18n.js 동적 로딩

```javascript
// 1. URL에서 언어 감지
getLanguageFromURL() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('lang')) {
        return params.get('lang');  // ?lang=es
    }
    // pathname에서도 파싱 가능 (/es/)
}

// 2. 번역 파일 동적 로드
async loadTranslations(lang) {
    const response = await fetch(`/locales/${lang}.json`);
    this.translations = await response.json();
}

// 3. DOM에 번역 적용
applyTranslations() {
    document.querySelectorAll('[data-i18n-key]').forEach(el => {
        const key = el.getAttribute('data-i18n-key');
        el.textContent = this.translations[key];
    });
}
```

### 파일 구조 (간결함!)

```
frontend/
├── index.html              # 단 하나의 메인 페이지
├── i18n.js                 # 다국어 동적 로딩 시스템
└── locales/                # 번역 파일만 (21개)
    ├── en.json
    ├── es.json
    ├── ko.json
    └── ... (총 21개)
```

**이점**:
- ✅ **파일 중복 제거**: 21개 `index.html` → 1개 `index.html`
- ✅ **유지보수 간편**: 수정 시 한 곳만 변경
- ✅ **Git 히스토리 깔끔**: 불필요한 커밋 없음
- ✅ **배포 속도 향상**: 업로드할 파일 최소화
- ✅ **SEO 완벽 지원**: nginx가 각 언어 URL을 별도 페이지로 인식

### 지원 언어 (21개)

```
en, ko, ja, de, es, fr, zh-CN, zh-TW, pt, it, ru, ar,
hi, id, th, vi, tr, my, ms, bn, fil
```

**URL 예시**:
- `https://hqmx.net/` → 브라우저 언어 자동 감지
- `https://hqmx.net/es/` → 스페인어
- `https://hqmx.net/ko/` → 한국어
- `https://hqmx.net/ja/jpg-to-png` → 일본어 + 변환 페이지

---

## 🚩 Feature Flags 시스템 (feature-flags.js)

**목적**: 기능 단위 활성화/비활성화 제어

**사용 방법**:
```javascript
// feature-flags.js
window.FEATURES = {
    SOCIAL_MEDIA: false  // Social Media 카테고리 비활성화
};

// script.js에서 자동 감지 및 적용
if (window.FEATURES && !window.FEATURES.SOCIAL_MEDIA) {
    // Social Media 관련 UI/기능 자동 숨김
    delete FORMATS.social;
    document.getElementById('socialCategoryBtn').style.display = 'none';
}
```

**지원 플래그**:
- `SOCIAL_MEDIA`: 소셜 미디어 다운로드 기능 (현재 비활성화)

---

## 🔐 중요한 기술적 제약사항

### 브라우저 환경 요구사항
- **CORS 헤더**: FFmpeg.wasm SharedArrayBuffer 사용을 위한 필수 헤더 (nginx 설정됨)
  ```nginx
  add_header Cross-Origin-Opener-Policy "same-origin" always;
  add_header Cross-Origin-Embedder-Policy "require-corp" always;
  add_header Cross-Origin-Resource-Policy "cross-origin" always;
  ```
- **지원 브라우저**: Chrome 90+, Firefox 88+, Safari 15+, Edge 90+
- **메모리 제한**: 브라우저당 ~2GB 메모리 제한 (대용량 파일 처리 시 주의)
- **WASM 초기화**: 첫 변환시 FFmpeg 라이브러리 로딩으로 인한 지연 (정상적인 동작, ~3초)

### 파일 처리 패턴
- **클라이언트 사이드 전용**: 파일이 서버로 전송되지 않음 (프라이버시 보장)
- **Blob URL 기반**: 변환된 파일을 브라우저 메모리에서 직접 다운로드
- **배치 변환**: 여러 파일을 순차적으로 처리 (메모리 효율성)

---

## 🔍 형식 지원 시스템

### 형식 지원 (`frontend/script.js`)
- **FORMATS**: 카테고리별 형식 정의
- **인기 형식**: 자주 사용되는 형식 우선 표시
- **검색 기능**: 형식명, 설명 기반 검색
- **300+ 형식**: 이미지, 비디오, 오디오, 문서, 압축 파일

### 289개 변환 분류
- **이미지 → 이미지**: 72개 (9 formats × 9 - 자기자신 제외)
- **비디오 → 비디오**: 56개 (8 formats × 8 - 자기자신 제외)
- **오디오 → 오디오**: 56개 (8 formats × 8 - 자기자신 제외)
- **비디오 → 오디오**: 64개 (8 video × 8 audio)
- **문서 → PDF**: 7개 (docx, doc, xlsx, xls, pptx, ppt, txt)
- **이미지 → PDF**: 9개
- **PDF → 이미지**: 9개
- **비디오 → GIF**: 8개
- **GIF → 비디오**: 8개
- **총계**: **289개**

### 지원 형식
```javascript
image: ['jpg', 'png', 'webp', 'heic', 'gif', 'svg', 'bmp', 'ico', 'avif']  // 9개
video: ['mp4', 'mov', 'mkv', 'flv', 'wmv', 'webm', 'avi', 'm4v']           // 8개
audio: ['mp3', 'm4a', 'flac', 'ogg', 'aac', 'wma', 'wav', 'opus']          // 8개
document: ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'txt']      // 8개
```
