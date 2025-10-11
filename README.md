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

- **Frontend**: 순수 HTML/JS/CSS (빌드 도구 없음)
- **변환 엔진**: FFmpeg.wasm (CDN), 브라우저 Canvas API
- **다국어**: i18n.js + locales/*.json (21개 언어)
- **SEO**: 템플릿 기반 자동 페이지 생성
- **배포**: AWS EC2 + nginx

## 📦 설치 및 실행

### 1. 개발 서버 실행 (의존성 없음)
```bash
cd frontend
python3 -m http.server 3000
```

브라우저에서 http://localhost:3000 접속

### 2. 페이지 생성 (선택사항)
```bash
# 변환 페이지 생성 (jpg-to-png.html 등) - SEO용
cd frontend/_scripts
node generate-pages.js
```

**참고**: 다국어는 nginx rewrite + i18n.js로 자동 처리되므로 별도 페이지 생성 불필요

## 🌐 배포

### EC2 서버 배포

#### 배포 스크립트 (권장):
```bash
# 프로젝트 루트에서 실행
./deploy-to-ec2.sh
```

이 스크립트는 다음을 자동으로 수행합니다:
1. EC2 서버로 정적 파일 업로드 (HTML, CSS, JS, assets, locales)
2. nginx 권한 설정 및 재시작

**참고**: 다국어 페이지는 nginx가 `/es/` → `/index.html?lang=es`로 자동 rewrite하므로,
언어별 디렉토리 업로드는 불필요합니다.

#### 수동 배포:
```bash
# 1. EC2로 파일 전송 (메인 파일만)
scp -i hqmx-ec2.pem frontend/index.html frontend/*.css frontend/*.js ubuntu@54.242.63.16:/tmp/
scp -i hqmx-ec2.pem -r frontend/locales frontend/assets ubuntu@54.242.63.16:/tmp/

# 2. 서버에서 nginx 디렉토리로 이동
ssh -i hqmx-ec2.pem ubuntu@54.242.63.16
sudo cp /tmp/*.html /tmp/*.css /tmp/*.js /var/www/html/
sudo cp -r /tmp/locales /tmp/assets /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
sudo nginx -t && sudo systemctl reload nginx
```

## 📁 프로젝트 구조

```
converter.hqmx/
├── frontend/                   # 메인 프론트엔드 (순수 HTML/JS/CSS)
│   ├── index.html             # 메인 페이지 (단 하나!)
│   ├── script.js              # 메인 애플리케이션 로직 (5000+ 라인)
│   ├── converter-engine.js    # FFmpeg.wasm 변환 엔진
│   ├── i18n.js                # 다국어 동적 로딩 시스템
│   ├── feature-flags.js       # 기능 플래그 설정
│   ├── style.css              # 스타일링 및 테마
│   ├── locales/               # 다국어 번역 파일 (21개 언어)
│   │   ├── en.json
│   │   ├── es.json
│   │   ├── ko.json
│   │   └── ... (총 21개)
│   ├── assets/                # 정적 파일 (아이콘, 이미지)
│   ├── _scripts/              # 빌드 스크립트
│   │   ├── generate-pages.js       # 변환 페이지 생성 (SEO)
│   │   └── generate-sitemap.js     # sitemap.xml 생성
│   ├── _templates/            # 페이지 템플릿
│   │   └── conversion-page.html    # 변환 페이지 템플릿
│   ├── _headers               # CORS 헤더 설정
│   ├── _redirects             # URL 리디렉션 규칙
│   └── (생성된 변환 페이지들)
│       ├── jpg-to-png.html
│       ├── mp4-to-avi.html
│       └── ...
├── backend/                   # 백엔드 API (EC2 전용)
│   └── src/                   # Node.js API 소스
├── deploy-to-ec2.sh           # EC2 배포 스크립트
├── CLAUDE.md                  # Claude Code 가이드
└── README.md
```

## 🎯 사용 방법

1. **파일 선택**: 드래그앤드롭 또는 클릭하여 파일 선택
2. **형식 선택**: 원하는 출력 형식 선택
3. **변환 시작**: '변환' 버튼 클릭
4. **자동 다운로드**: 변환 완료 즉시 자동 다운로드

## 🌐 라이브 사이트

- **메인 사이트**: https://hqmx.net
- **다국어 페이지**: https://hqmx.net/en, https://hqmx.net/ko 등
- **변환 페이지 예시**: https://hqmx.net/jpg-to-png.html

## 📝 주요 특징

- **100% 클라이언트 사이드**: 파일이 서버로 전송되지 않음 (프라이버시 보장)
- **빌드 도구 없음**: npm install 불필요, 바로 실행 가능
- **21개 언어 지원**: 자동 번역 및 SEO 최적화
- **300+ 파일 형식**: 이미지, 비디오, 오디오, 문서 등 지원
