# HQMX Converter

**빠르고 안전한 100% 클라이언트 사이드 파일 변환기**

## 🚀 주요 특징

- **완전한 프라이버시**: 파일이 서버로 전송되지 않음
- **빠른 변환**: 서버 업로드/다운로드 없이 브라우저에서 직접 처리
- **300+ 형식 지원**: 이미지, 비디오, 오디오 변환
- **자동 다운로드**: 변환 완료 즉시 자동 다운로드
- **PWA 지원**: 오프라인 사용 및 앱 설치 가능
- **스마트 캐싱**: 변환 엔진 자동 캐싱으로 빠른 재사용

## 🛠️ 기술 스택

- **Frontend**: Vanilla JavaScript + Vite
- **변환 엔진**: FFmpeg.wasm, ImageMagick.wasm
- **캐싱**: IndexedDB + Browser Cache API
- **PWA**: Service Worker + Web App Manifest
- **배포**: Cloudflare Pages

## 📦 설치 및 실행

### 1. 의존성 설치
```bash
cd client-app
npm install
```

### 2. 개발 서버 실행
```bash
npm run dev
```

### 3. 빌드
```bash
npm run build
```

### 4. 빌드 테스트
```bash
npm run preview
```

## 🌐 배포

### Cloudflare Pages 배포

#### 자동 배포 스크립트 사용:
```bash
# 프로젝트 루트에서 실행
./deploy.sh
```

#### 수동 배포:
```bash
cd client-app

# Wrangler 로그인 (최초 1회)
npx wrangler login

# 빌드 및 배포
npm run deploy
```

#### 프리뷰 배포:
```bash
npm run deploy:preview
```

## 📁 프로젝트 구조

```
converter.hqmx/
├── client-app/                 # 메인 애플리케이션
│   ├── public/                 # 정적 파일
│   │   ├── manifest.json      # PWA 매니페스트
│   │   └── sw.js             # Service Worker
│   ├── src/                   # 소스 코드
│   │   ├── engines/          # 변환 엔진들
│   │   │   ├── ffmpeg-engine.js
│   │   │   └── image-engine.js
│   │   ├── utils/            # 유틸리티
│   │   │   ├── auto-converter.js
│   │   │   ├── cache-manager.js
│   │   │   └── download-manager.js
│   │   └── main.js           # 메인 애플리케이션
│   ├── _headers              # Cloudflare Pages 헤더
│   ├── _redirects            # 리디렉션 규칙
│   ├── vite.config.js        # Vite 설정
│   ├── wrangler.toml         # Cloudflare 설정
│   └── package.json
├── deploy.sh                  # 배포 스크립트
└── README.md
```

## 🎯 사용 방법

1. **파일 선택**: 드래그앤드롭 또는 클릭하여 파일 선택
2. **형식 선택**: 원하는 출력 형식 선택
3. **변환 시작**: '변환' 버튼 클릭
4. **자동 다운로드**: 변환 완료 즉시 자동 다운로드

## 🌐 배포 완료!

Cloudflare Pages 배포 설정이 완료되었습니다. 이제 다음 명령어로 배포할 수 있습니다:

```bash
# 자동 배포 스크립트 실행
./deploy.sh

# 또는 수동 배포
cd client-app
npm run deploy
```
