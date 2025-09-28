# 파일 변환 웹사이트 구축 TO-DO LIST

## 🎯 프로젝트 목표
- **도메인**: converter.hqmx.net
- **타겟**: 100개 이상 파일 형식 변환 지원
- **전략**: SEO 최적화된 하이브리드 아키텍처
- **수익 목표**: 3개월 내 월 $3,000-5,000

---

## Phase 1: 기초 설정 (1-2주차)

### 1.1 도메인 및 DNS 설정
- [ ] **Cloudflare DNS 설정**
  - [ ] A 레코드: converter.hqmx.net → EC2 IP
  - [ ] A 레코드: api.converter.hqmx.net → EC2 IP (DNS Only)
  - [ ] CNAME: cdn.converter.hqmx.net → converter.hqmx.net (Proxied)
  - [ ] SSL 인증서 자동 발급 확인

- [ ] **리다이렉트 규칙 설정**
  - [ ] /jpg-png → /jpg-to-png (301 리다이렉트)
  - [ ] /jpeg-to-png → /jpg-to-png
  - [ ] /jpg2png → /jpg-to-png
  - [ ] 한글 URL 처리: /jpg-png-변환 → /jpg-to-png

### 1.2 EC2 서버 환경 구성
- [ ] **기본 패키지 설치**
  ```bash
  sudo apt update && sudo apt upgrade -y
  sudo apt install -y nginx nodejs npm python3-pip ffmpeg imagemagick libreoffice
  ```
- [ ] **Node.js 20 LTS 설치**
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```
- [ ] **PM2 설치 및 설정**
  ```bash
  sudo npm install -g pm2
  pm2 startup
  ```
- [ ] **변환 라이브러리 설치**
  - [ ] Python: pypdf, python-docx, pillow, moviepy
  - [ ] Node.js: sharp-cli, svgo, typescript
  - [ ] 시스템: calibre (전자책 변환)

### 1.3 Next.js 프로젝트 초기화
- [ ] **프로젝트 생성**
  ```bash
  npx create-next-app@latest converter-site --typescript --tailwind --app
  cd converter-site
  ```
- [ ] **필수 패키지 설치**
  ```bash
  npm install @ffmpeg/ffmpeg pdf-lib sharp mammoth xlsx archiver multer bull redis @sentry/nextjs
  ```
- [ ] **프로젝트 구조 생성**
  - [ ] `app/[conversion]/page.tsx` (동적 라우팅)
  - [ ] `components/Converter/UniversalConverter.tsx`
  - [ ] `lib/converters/` (변환 엔진들)
  - [ ] `scripts/` (자동화 스크립트)

---

## Phase 2: 핵심 기능 개발 (3-4주차)

### 2.1 상위 20개 변환 페이지 생성
- [ ] **우선순위 변환 리스트 확정**
  1. [ ] jpg-to-pdf (월 500만 검색)
  2. [ ] pdf-to-word (월 800만 검색)
  3. [ ] youtube-to-mp3 (월 600만 검색)
  4. [ ] webp-to-png (월 400만 검색)
  5. [ ] excel-to-pdf (월 300만 검색)
  6. [ ] png-to-jpg (월 250만 검색)
  7. [ ] word-to-pdf (월 200만 검색)
  8. [ ] pdf-to-jpg (월 180만 검색)
  9. [ ] gif-to-mp4 (월 150만 검색)
  10. [ ] mp4-to-mp3 (월 140만 검색)
  11. [ ] heic-to-jpg (월 120만 검색)
  12. [ ] svg-to-png (월 110만 검색)
  13. [ ] webm-to-mp4 (월 100만 검색)
  14. [ ] csv-to-excel (월 90만 검색)
  15. [ ] tiff-to-pdf (월 80만 검색)
  16. [ ] psd-to-png (월 75만 검색)
  17. [ ] ai-to-pdf (월 70만 검색)
  18. [ ] eps-to-pdf (월 65만 검색)
  19. [ ] rtf-to-docx (월 60만 검색)
  20. [ ] bmp-to-jpg (월 55만 검색)

- [ ] **개별 페이지 생성 스크립트**
  ```javascript
  // scripts/generate-priority-pages.js
  - [ ] 각 변환별 고유 콘텐츠 2000+ 단어
  - [ ] SEO 메타데이터 최적화
  - [ ] 구조화된 데이터 (Schema.org) 추가
  ```

### 2.2 유니버설 변환 엔진 개발
- [ ] **파일 형식 감지 시스템**
  ```typescript
  // lib/utils/format-detector.ts
  - [ ] MIME 타입 검사
  - [ ] 파일 확장자 검증
  - [ ] 파일 헤더 분석
  ```

- [ ] **이미지 변환 엔진**
  ```typescript
  // lib/converters/image.ts
  - [ ] Sharp.js 활용 (JPG, PNG, WEBP, GIF, BMP, TIFF)
  - [ ] Canvas API 폴백
  - [ ] 진행률 추적
  ```

- [ ] **문서 변환 엔진**
  ```typescript
  // lib/converters/document.ts
  - [ ] PDF.js (PDF 처리)
  - [ ] Mammoth (DOCX 처리)
  - [ ] XLSX.js (Excel 처리)
  ```

- [ ] **미디어 변환 엔진**
  ```typescript
  // lib/converters/media.ts
  - [ ] FFmpeg.wasm (비디오/오디오)
  - [ ] WebAssembly 로딩
  - [ ] 진행률 콜백
  ```

### 2.3 동적 라우팅 시스템
- [ ] **미들웨어 설정**
  ```typescript
  // middleware.ts
  - [ ] 상위 20개 → 개별 페이지 라우팅
  - [ ] 나머지 → 동적 처리
  - [ ] URL 정규화
  ```

- [ ] **동적 페이지 컴포넌트**
  ```typescript
  // app/[conversion]/page.tsx
  - [ ] 메타데이터 동적 생성
  - [ ] from/to 파라미터 파싱
  - [ ] 유니버설 변환기 렌더링
  ```

---

## Phase 3: SEO 최적화 (5주차)

### 3.1 사이트맵 자동 생성
- [ ] **사이트맵 생성 스크립트**
  ```javascript
  // scripts/generate-sitemap.js
  - [ ] 100개 변환 URL 포함
  - [ ] 우선순위 설정 (검색량 기반)
  - [ ] lastmod 자동 업데이트
  ```

- [ ] **robots.txt 설정**
  ```
  User-agent: *
  Allow: /
  Sitemap: https://converter.hqmx.net/sitemap.xml
  ```

### 3.2 구조화된 데이터
- [ ] **Schema.org 마크업**
  ```json
  {
    "@type": "WebApplication",
    "name": "{변환} 변환기",
    "applicationCategory": "UtilityApplication",
    "offers": {"price": "0"}
  }
  ```

### 3.3 성능 최적화
- [ ] **Core Web Vitals 최적화**
  - [ ] LCP < 2.5초
  - [ ] FID < 100ms
  - [ ] CLS < 0.1

- [ ] **이미지 최적화**
  - [ ] Next.js Image 컴포넌트 활용
  - [ ] WebP 자동 변환
  - [ ] 지연 로딩

- [ ] **코드 분할**
  - [ ] 변환 엔진 동적 임포트
  - [ ] 컴포넌트 레벨 분할

---

## Phase 4: 배포 및 CI/CD (6주차)

### 4.1 Cloudflare Pages 설정
- [ ] **프론트엔드 배포**
  ```bash
  npm run build
  npx wrangler pages deploy .next/dist --project-name=converter-hqmx
  ```

- [ ] **커스텀 도메인 연결**
  - [ ] Cloudflare Dashboard에서 도메인 연결
  - [ ] SSL 인증서 확인
  - [ ] CDN 설정 최적화

### 4.2 GitHub Actions 설정
- [ ] **자동 배포 파이프라인**
  ```yaml
  # .github/workflows/deploy.yml
  - [ ] 코드 품질 검사
  - [ ] 빌드 테스트
  - [ ] EC2 배포 (API)
  - [ ] Cloudflare 배포 (프론트엔드)
  ```

### 4.3 PM2 프로세스 관리
- [ ] **프로덕션 설정**
  ```javascript
  // ecosystem.config.js
  - [ ] 클러스터 모드 (2개 인스턴스)
  - [ ] 자동 재시작
  - [ ] 로그 관리
  ```

---

## Phase 5: 모니터링 및 분석 (7주차)

### 5.1 분석 도구 설정
- [ ] **Google Analytics 4**
  - [ ] 변환별 이벤트 추적
  - [ ] 파일 크기별 분석
  - [ ] 사용자 플로우 분석

- [ ] **Google Search Console**
  - [ ] 사이트맵 제출
  - [ ] 크롤링 오류 모니터링
  - [ ] 검색 순위 추적

- [ ] **Hotjar/클라리티**
  - [ ] 사용자 행동 분석
  - [ ] 히트맵 설정
  - [ ] 세션 리플레이

### 5.2 에러 모니터링
- [ ] **Sentry 설정**
  - [ ] JavaScript 에러 추적
  - [ ] 서버 에러 모니터링
  - [ ] 알림 설정

- [ ] **로그 시스템**
  ```typescript
  // lib/logger.ts
  - [ ] Winston 로거
  - [ ] 일별 로그 로테이션
  - [ ] 에러 레벨별 분류
  ```

### 5.3 성능 모니터링
- [ ] **New Relic/DataDog**
  - [ ] 서버 리소스 모니터링
  - [ ] API 응답 시간 추적
  - [ ] 변환 성공률 측정

---

## Phase 6: 광고 수익화 (8-9주차)

### 6.1 Google AdSense 설정
- [ ] **AdSense 계정 생성 및 승인**
- [ ] **광고 배치 최적화**
  - [ ] 헤더 배너 (728x90)
  - [ ] 사이드바 (300x600)
  - [ ] 콘텐츠 내 (336x280)
  - [ ] 모바일 앵커 광고

### 6.2 프리미엄 광고 네트워크
- [ ] **Media.net 계정 설정**
- [ ] **Ezoic 통합** (AI 기반 광고 최적화)
- [ ] **헤더 비딩 구현** (20-40% 수익 증대)

### 6.3 A/B 테스트
- [ ] **광고 배치 테스트**
  - [ ] 버전 A: 기본 배치
  - [ ] 버전 B: 변환 버튼 근처
  - [ ] 버전 C: 다운로드 페이지

---

## Phase 7: 확장 및 최적화 (10-12주차)

### 7.1 고급 기능 개발
- [ ] **배치 변환 기능**
  - [ ] 여러 파일 동시 처리
  - [ ] ZIP 파일 일괄 다운로드
  - [ ] 진행률 표시

- [ ] **API 서비스**
  - [ ] RESTful API 설계
  - [ ] API 키 시스템
  - [ ] 사용량 제한 (Rate Limiting)

### 7.2 다국어 지원
- [ ] **i18n 설정**
  - [ ] 한국어, 영어 기본 지원
  - [ ] URL 다국어화 (/ko/, /en/)
  - [ ] 브라우저 언어 자동 감지

### 7.3 모바일 앱 개발 (선택사항)
- [ ] **React Native 앱**
  - [ ] 웹뷰 기반 하이브리드
  - [ ] 푸시 알림
  - [ ] 앱스토어 배포

---

## 지속적 유지보수

### 보안 관리
- [ ] **정기 보안 업데이트**
  - [ ] 의존성 패키지 업데이트
  - [ ] 보안 패치 적용
  - [ ] 취약점 스캔

### 백업 시스템
- [ ] **자동 백업 설정**
  ```bash
  # crontab 설정
  0 3 * * * /home/ubuntu/scripts/backup.sh  # 매일 새벽 3시
  ```

### 성능 최적화
- [ ] **월별 성능 리뷰**
  - [ ] 로딩 속도 측정
  - [ ] 변환 성공률 분석
  - [ ] 사용자 피드백 수집

---

## 📊 성공 지표 (KPI)

### 트래픽 목표
- **1개월**: 일일 1,000명
- **3개월**: 일일 5,000명
- **6개월**: 일일 10,000명
- **1년**: 일일 30,000명

### 수익 목표
- **1개월**: $500-800/월
- **3개월**: $3,000-5,000/월
- **6개월**: $8,000-12,000/월
- **1년**: $25,000-40,000/월

### SEO 목표
- **키워드 순위**: 상위 20개 변환에서 1-3위
- **자연 트래픽**: 전체 트래픽의 80% 이상
- **페이지 속도**: Core Web Vitals 90점 이상

---

## 🚨 중요 마일스톤 체크포인트

### Week 2 체크포인트
- [ ] 기본 인프라 설정 완료
- [ ] 상위 5개 변환 페이지 작동
- [ ] 유니버설 변환 엔진 프로토타입

### Week 6 체크포인트
- [ ] 상위 20개 페이지 모두 배포
- [ ] SEO 최적화 완료
- [ ] Google Search Console 인덱싱 확인

### Week 9 체크포인트
- [ ] 광고 수익 첫 $100 달성
- [ ] 일일 5,000명 트래픽 달성
- [ ] 전환율 최적화 완료

### Week 12 체크포인트
- [ ] 월 $3,000 수익 달성
- [ ] 100개 변환 지원 완료
- [ ] 스케일링 계획 수립