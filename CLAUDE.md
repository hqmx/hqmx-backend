# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

모든 내용은 한글로.

## ⚠️ 절대 규칙 (ABSOLUTE RULES - NEVER CHANGE)
1. **클라이언트 사이드 변환 우선** - 서버 비용을 발생시키지 않는 구조 유지
2. **프론트엔드 디자인 변경 금지** - 백엔드만 수정 가능
3. **기존 파일 구조 유지** - 임의로 파일 삭제/이동 금지
4. **사용자 동의 없이 중요 설정 변경 금지**
5. **WASM 기반 변환 엔진 유지** - FFmpeg.wasm과 이미지 변환 엔진
6. **다운로드로 서버비용이 발생하지 않게 구조설정**
   - **이 설정은 절대 변경 불가**

## 프로젝트 개요

HQMX Converter는 100% 클라이언트 사이드에서 작동하는 파일 변환 웹 애플리케이션입니다.
서버로 파일을 업로드하지 않고 브라우저에서 직접 FFmpeg.wasm을 사용하여 변환합니다.

## 웹사이트 주소
- **메인**: https://hqmx.net

## 서버 정보
### hqmx.net (메인 서버)
- **IP**: 54.242.63.16
- **Git**: https://github.com/hqmx/hqmx-backend
- **PEM 파일**: `/Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem`

## 광고 수익화 (Monetization)

### Google AdSense
- **계정 ID**: `ca-pub-1478922009946363`
- **소유권 확인**: `index.html`의 `<head>` 섹션에 메타 태그 추가됨
```html
<meta name="google-adsense-account" content="ca-pub-1478922009946363">
```

### Adsterra 광고 (활성화됨)

#### 1. Banner 광고 (728x90)
- **위치**: "Your Files" 패널 바로 아래
- **광고 키**: `a0109a486ddd226684cfa5934f412a88`
- **표시 조건**: 파일 업로드 시 자동 표시, 파일 삭제 시 자동 숨김
- **파일**: `index.html:192-204`
```html
<div id="adsterra-banner-728x90" style="display: none;">
    <script type="text/javascript">
        atOptions = {
            'key' : 'a0109a486ddd226684cfa5934f412a88',
            'format' : 'iframe',
            'height' : 90,
            'width' : 728
        };
    </script>
    <script src="//www.highperformanceformat.com/a0109a486ddd226684cfa5934f412a88/invoke.js"></script>
</div>
```

#### 2. Interstitials 광고 (전면 광고)
- **광고 키**: `dfdeb4497c2530e9cc7c6c5a9e33f754`
- **표시 시점**: "Start Conversion" 버튼 클릭 시
- **동작**: 광고 표시 → 2초 지연 → 변환 시작
- **파일**: `index.html:595-596`, `script.js:759-802`
```html
<script type='text/javascript' src='//pl27817229.effectivegatecpm.com/df/de/b4/dfdeb4497c2530e9cc7c6c5a9e33f754.js'></script>
```

#### 3. Anti-Adblock Popunder
- **광고 키**: `a5b0d31831c41ea6968b77517c884ff0`
- **표시 시점**: 페이지 로드 시 및 클릭 시 (백그라운드)
- **특징**: Adblock 우회 기능
- **파일**: `index.html:598-599`
```html
<script type='text/javascript' src='//outskirtsgrey.com/a5/b0/d3/a5b0d31831c41ea6968b77517c884ff0.js'></script>
```

### Propeller Ads
- **소유권 확인 파일**: `/var/www/html/sw.js` (156B)
- **⚠️ 중요**: 이 파일은 Propeller Ads 소유권 확인용이므로 **절대 삭제 금지**
- **파일 위치**: 서버 루트 디렉토리 (`/var/www/html/sw.js`)

### 광고 수익 예상 (월 10,000명 방문 기준)
| 광고 유형 | 노출/클릭 | CPM/CPC | 월 수익 예상 |
|----------|-----------|---------|-------------|
| Banner (728x90) | 8,000 노출 | $2 CPM | $16 |
| Interstitials | 5,000 노출 | $3 CPM | $15 |
| Popunder | 3,000 클릭 | $5 CPM | $15 |
| **총 월 수익** | | | **$46** |

**트래픽 10배 증가 시**: 월 100,000명 = **$460/월**

## 명령어

### 메인 프론트엔드 (frontend 디렉토리) ✅ 사용
```bash
# 개발 서버 실행 (두 가지 방법)
cd frontend
python3 -m http.server 3000  # http://localhost:3000에서 개발 서버 시작

# 또는 프로젝트 루트에서
npm run dev                   # package.json 스크립트 사용
```
- **특징**: 순수 HTML/JS/CSS, 의존성 없음, 바로 실행 가능
- **변환 엔진**: `CLIENT_SIDE_MODE = true` - 브라우저에서 직접 변환
- **다국어**: i18n.js로 다국어 지원
- **완성된 UI**: 드래그&드롭, 진행률, 테마 등 모든 기능 구현

### 프로젝트 레벨 명령어 (package.json)
```bash
npm run dev          # 프론트엔드 개발 서버 시작
npm run build        # 빌드 완료 메시지 출력
npm run lint         # JavaScript/CSS 린팅
npm run test         # 테스트 실행
```

### 백엔드 개발 (backend 디렉토리) - EC2 기반
```bash
cd backend
npm install          # 의존성 설치 (최초 1회)
npm run dev          # 로컬 개발 서버 (http://localhost:3001)
npm run test         # Jest 테스트 실행
npm run lint         # ESLint 검사

# EC2 서버에서 실행 (메인 서버: hqmx.net)
ssh -i /path/to/hqmx-ec2.pem ubuntu@54.242.63.16
cd ~/converter.hqmx/backend
pm2 start src/index.js --name converter-api  # API 서버 시작
pm2 logs converter-api                        # 로그 확인
pm2 restart converter-api                     # 재시작
```

### 번역 관리
- 번역 파일 위치: `frontend/locales/`
- 지원 언어: 한국어(ko), 영어(en) 외 19개 언어
- 추가 언어 지원시 JSON 파일 생성 후 메인 코드에 등록 필요

## 아키텍처 개요

### 메인 프론트엔드 (`/frontend`) ✅ 완성된 앱
- **아키텍처**: 순수 HTML/JS/CSS + WebAssembly 변환
- **기술 스택**: 순수 JavaScript, FFmpeg.wasm (CDN), 브라우저 네이티브 API
- **변환 엔진**:
  - FFmpeg.wasm: 비디오/오디오 변환 (CDN에서 로드)
  - Canvas API: 이미지 변환
  - 변환 엔진 자동 선택: converter-engine.js
- **주요 기능**:
  - 실시간 진행률 추적
  - 배치 변환 지원
  - 다국어 지원 (i18n.js)
  - 다크/라이트 테마
  - 드래그&드롭 업로드
  - 300+ 파일 형식 지원

### 백엔드 (EC2 기반) - 대용량 파일용 ⚠️
- **플랫폼**: AWS EC2 (t3.small spot instance)
- **웹 서버**: nginx (정적 파일 서빙)
- **변환 API**: Node.js/Python FFmpeg
- **용도**: 100-200MB 대용량 파일 서버 변환 (전체 트래픽의 5%)
- **상태**: 개발 중 (클라이언트 사이드 우선 정책)

## 주요 기능

### 클라이언트 사이드 변환
- **FFmpeg.wasm**: 비디오/오디오 변환
- **브라우저 네이티브 API**: 이미지 변환
- **진행률 추적**: 실시간 변환 진행률 표시
- **배치 처리**: 여러 파일 동시 변환

### 주요 구성 요소

#### 변환 엔진 시스템 (`frontend/script.js`)
- **상태 관리**: files, conversions, eventSources 등
- **이벤트 시스템**: DOM 이벤트, 드래그앤드롭, 키보드 단축키
- **UI 관리**: 파일 리스트, 진행률, 모달, 토스트 알림
- **변환 모드**: 단일 파일 변환, 배치 변환 지원
- **테마 시스템**: 다크/라이트 테마, localStorage 저장

#### 변환 엔진 (`frontend/converter-engine.js`)
- **FFmpeg.wasm 래핑**: 진행률 파싱 및 콜백
- **명령어 생성**: 비디오/오디오 옵션
- **메모리 관리**: 파일시스템 정리
- **이미지 처리**: 브라우저 네이티브 Canvas API 사용

## 대용량 파일 처리 전략 (EC2 기반)

### 하이브리드 아키텍처
- **0-100MB (90% 트래픽)**: 클라이언트 사이드 (FFmpeg.wasm)
  - 비용: 무료
  - 속도: 사용자 CPU 의존
  - 프라이버시: 완벽 보장

- **100MB-2.5GB (10% 트래픽)**: EC2 서버 변환
  - 비용: 발생 (적정 수준)
  - 속도: 빠름 (서버 CPU)
  - 처리: FFmpeg 서버 (스트리밍 방식)
  - 메모리: 해상도 의존 (파일 크기 무관)
  - 변환 시간: 100MB(~1분), 1GB(~5분), 2.5GB(~10분)

- **2.5GB+**: 파일 분할 권장 또는 처리 거부
  - 이유: 변환 시간 과다 (10분+ 소요)
  - 대안: 사용자에게 파일 분할 안내

**📌 EC2는 request body 크기 제한이 없음** (Cloudflare Workers와 차이점)

### EC2 서버 구성
- **인스턴스**: t3.small spot (2 vCPU, 2GB RAM)
- **스토리지**: EBS gp3 20GB (임시 파일만, 1시간 보관)
- **처리 능력**: 동시 변환 1-2개, 일일 300-500회
- **자동 정리**: 1시간마다 임시 파일 삭제

### Cloudflare 역할 명확화
- **DNS 관리**: 도메인 관리 (hqmx.net)
- **CDN 캐싱**: 정적 파일만 (HTML, CSS, JS, 이미지)
- **변환 파일**: 관여하지 않음 (EC2 → 사용자 직접 다운로드)
- **Workers/Pages**: 사용하지 않음
- **R2 스토리지**: 현재 사용하지 않음 (소규모 트래픽에서 비용 이점 없음)

### 클라이언트 사이드 극대화 전략
1. **FFmpeg.wasm 최적화**
   - 멀티스레드 활성화
   - 빠른 프리셋 사용 (ultrafast)
   - 100MB까지 클라이언트 처리 목표

2. **사용자 유도**
   - "브라우저 변환이 더 빠르고 무료입니다" 메시지 표시
   - 50MB+ 파일: "서버 변환은 대기시간이 있을 수 있습니다" 경고
   - 프로그레스바로 클라이언트 변환 체감 속도 개선

3. **제한 설정**
   - 서버 변환: 2.5GB 하드 제한 (nginx, multer)
   - 2.5GB+: "파일이 너무 큽니다. 파일을 분할해주세요" 안내
   - 500MB+: "변환에 5-10분이 소요될 수 있습니다" 경고

### 파일 크기별 처리 흐름
```
사용자 파일 업로드
├─ 0-50MB → 클라이언트 (자동) → 무료, 빠름
├─ 50-100MB → 클라이언트 (권장) → 무료, 보통
├─ 100-500MB → EC2 서버 → 비용 발생, 빠름
├─ 500MB-2.5GB → EC2 서버 → 비용 발생, 느림 (5-10분)
└─ 2.5GB+ → 거부 또는 분할 권장
```

## 비용 분석 및 최적화 (월 10,000회 변환 기준)

### 월간 운영 비용 상세
| 항목 | 규격 | 가격 | 비용 |
|------|------|------|------|
| EC2 Compute | t3.small spot (70% 할인) | $0.0062/시간 | $4.55 |
| EBS 스토리지 | gp3 20GB | $0.08/GB | $1.60 |
| AWS 데이터 전송 | 75GB egress (5% 서버 처리) | $0.09/GB | $6.75 |
| **총 월 비용** | | | **$12.90** |

### 비용 절감 전략

#### 1. 클라이언트 사이드 비율 극대화 (95% 목표)
- **현재**: 85% 클라이언트, 15% 서버
- **목표**: 95% 클라이언트, 5% 서버
- **방법**:
  - FFmpeg.wasm 성능 최적화 (멀티스레드, 빠른 프리셋)
  - 사용자에게 브라우저 변환 적극 권장
  - 서버 변환 대기시간 명시적 안내
  - 프로그레스바 UX 개선으로 체감 속도 향상

#### 2. EC2 Spot Instance 활용 (70% 비용 절감)
- **On-Demand**: $15.18/월
- **Spot**: $4.55/월 (70% 할인)
- **리스크 완화**:
  - 짧은 변환 작업만 처리 (<10분)
  - 자동 재시도 로직 구현
  - Spot 중단 시 On-Demand로 자동 전환

#### 3. 파일 크기 제한 (200MB)
- t3.small (2GB RAM)로 안정적 처리 가능 범위
- 메모리 부족(OOM) 방지
- FFmpeg 메모리 사용량: ~1.5GB (200MB 파일 기준)
- 안전 마진 확보

#### 4. EBS 최적화 (gp3 사용)
- gp2 대비 20% 저렴 ($0.10 → $0.08/GB)
- 성능도 더 우수 (3000 IOPS 기본 제공)
- 1시간 자동 정리로 스토리지 최소화

### Cloudflare R2를 사용하지 않는 이유

#### 초기 예상
- **장점**: Egress 무료 (R2 → 사용자 다운로드 무료)
- **기대**: 데이터 전송 비용 절감

#### 실제 분석 (심층 조사 결과)
- **EC2 → R2 업로드**: AWS egress 비용 발생 ($16.87/월)
- **R2 스토리지**: $2.81/월
- **R2 총 비용**: $19.68/월
- **EC2 직접 다운로드**: $16.87/월

#### 결론
- **R2 사용 시**: $19.68/월
- **직접 다운로드**: $16.87/월
- **차이**: R2가 오히려 $2.81 더 비쌈
- **소규모 트래픽에서는 R2 이점 없음**
- **대규모 트래픽 (월 50,000회+)에서만 R2 고려**

### 비용 비교표

| 전략 | EC2 | EBS | Egress | R2 | 총 비용 |
|------|-----|-----|--------|-----|---------|
| **EC2 On-Demand** | $15.18 | $1.60 | $16.87 | - | $33.65 |
| **EC2 Spot + 직접** | $4.55 | $1.60 | $16.87 | - | $23.02 |
| **EC2 Spot + R2** | $4.55 | $1.60 | $10.00 | $9.68 | $25.83 |
| **최적 (Spot + 95% 클라이언트)** | $4.55 | $1.60 | $6.75 | - | **$12.90** ⭐️ |

### 확장성 계획

#### 트래픽 증가 시 대응
- **월 10,000회 → 50,000회**:
  - t3.small → t3.medium
  - 추가 비용: ~$15/월

- **월 50,000회 → 100,000회**:
  - Auto Scaling Group
  - R2 도입 고려
  - 추가 비용: ~$50/월

#### 비용 최적화 우선순위
1. **클라이언트 비율 증가** (가장 효과적)
2. **Spot Instance 활용** (70% 절감)
3. **파일 크기 제한** (메모리 절약)
4. **자동 정리** (스토리지 절약)

#### 형식 지원 시스템 (`frontend/script.js`)
- **FORMATS**: 카테고리별 형식 정의
- **인기 형식**: 자주 사용되는 형식 우선 표시
- **검색 기능**: 형식명, 설명 기반 검색
- **300+ 형식**: 이미지, 비디오, 오디오, 문서, 압축 파일

## 주요 파일 구조

### 메인 프론트엔드 (`frontend/`) ✅
- `index.html` - 메인 애플리케이션 진입점
- `script.js` - 메인 애플리케이션 로직 (상태관리, UI, 변환 제어)
- `converter-engine.js` - FFmpeg.wasm 변환 엔진
- `i18n.js` - 다국어 지원 시스템
- `style.css` - 스타일링 및 테마
- `locales/` - 다국어 번역 파일
- `assets/` - 정적 파일 (아이콘, 이미지)

### 백엔드 (`backend/`) - 선택적
- `src/index.js` - Hono 앱 (메인 진입점)
- `src/handlers/` - API 핸들러 (변환, 다운로드, 진행률)
- `src/utils/` - 보안, 저장소, 진행률 추적
- `wrangler.toml` - Cloudflare Workers 설정
- `package.json` - Hono, TypeScript, Jest 의존성

## 설정

### 프론트엔드 설정
- **변환 모드**: `frontend/script.js`의 `CLIENT_SIDE_MODE` 변수
  - `true`: 클라이언트 사이드 변환 (기본값, 추천)
  - `false`: 서버 사이드 변환 (백엔드 필요)
- **지원 형식**: `frontend/script.js`의 `FORMATS` 객체
- **고급 설정**: `frontend/script.js`의 `ADVANCED_SETTINGS` 객체

### 지원 브라우저
- Chrome 90+
- Firefox 88+
- Safari 15+
- Edge 90+
- **요구사항**: WebAssembly, SharedArrayBuffer 지원

## Git 및 버전 관리

### Git 기본 정보
- **현재 저장소**: https://github.com/hqmx/hqmx-backend
- **메인 브랜치**: main
- **커밋 메시지**: 한글로 작성
- **현재 상태**: Modified files in git status로 확인

### Git 워크플로우
```bash
# 현재 상태 확인
git status
git branch

# 변경사항 확인
git diff

# 스테이징 및 커밋
git add .
git commit -m "변경사항 설명"

# 푸시
git push origin main

# 풀 (최신 코드 받기)
git pull origin main

# 원격 저장소 확인
git remote -v
# origin  https://github.com/hqmx/hqmx-backend.git (fetch)
# origin  https://github.com/hqmx/hqmx-backend.git (push)
```

### 브랜치 전략
```bash
# 새 기능 브랜치 생성
git checkout -b feature/새기능명
git checkout -b hotfix/버그수정명

# 브랜치 병합
git checkout main
git merge feature/새기능명

# 브랜치 삭제
git branch -d feature/새기능명
```

### Git 설정 (최초 설정시)
```bash
# 사용자 정보 설정
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 한글 파일명 지원
git config --global core.quotepath false
```

## 서버 관리

### hqmx.net 서버
- **도메인**: https://hqmx.net
- **IP**: 54.242.63.16
- **Git**: https://github.com/hqmx/hqmx-backend
- **PEM 파일**: `/Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem`

#### SSH 연결
```bash
# SSH 연결
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@54.242.63.16

# PEM 파일 권한 설정 (필요시)
chmod 400 /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem
```

#### SCP 파일 전송
```bash
# 로컬 -> 서버 파일 전송
scp -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem -r frontend/ ubuntu@54.242.63.16:~/

# 서버 -> 로컬 파일 다운로드
scp -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@54.242.63.16:~/backup.tar.gz ./
```

#### 서버에서 Git 동기화
```bash
# 서버에서 최신 코드 받기 (GitHub에서)
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@54.242.63.16 'cd ~/converter.hqmx && git pull origin main'

# 서버에서 Git 상태 확인
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@54.242.63.16 'cd ~/converter.hqmx && git status'

# 서버에서 원격 저장소 확인
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@54.242.63.16 'cd ~/converter.hqmx && git remote -v'
```

#### 서버 상태 확인
```bash
# 웹 서버 상태 확인
curl -I https://hqmx.net

# 서버 포트 확인
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@54.242.63.16 'sudo netstat -tlnp'

# 디스크 사용량 확인
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@54.242.63.16 'df -h'
```

## 배포

### 프론트엔드 배포 (EC2 nginx)
- **플랫폼**: AWS EC2 + nginx (정적 파일 서빙)
- **웹서버 설정**: `/etc/nginx/sites-available/default`
- **CORS 헤더**: SharedArrayBuffer 사용을 위해 nginx 설정 필요
  ```nginx
  add_header Cross-Origin-Opener-Policy "same-origin";
  add_header Cross-Origin-Embedder-Policy "require-corp";
  ```
- **SSL/TLS**: Let's Encrypt certbot 사용 (HTTPS 필수)

### ⚠️ EC2 서버 배포 - 중요 경로 정보

**nginx 설정:**
- **nginx root 경로**: `/var/www/html/`
- **절대 복사하지 말 것**: `~/frontend/` (nginx가 보지 않는 위치)

**올바른 배포 절차:**
```bash
# 1. 로컬에서 /tmp로 복사
scp -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem \
  frontend/style.css frontend/index.html ubuntu@54.242.63.16:/tmp/

# 2. 서버에서 nginx root로 이동 및 권한 설정
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@54.242.63.16 \
  'sudo cp /tmp/style.css /tmp/index.html /var/www/html/ && \
   sudo chown www-data:www-data /var/www/html/style.css /var/www/html/index.html && \
   sudo chmod 755 /var/www/html/style.css /var/www/html/index.html'

# 3. nginx reload
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@54.242.63.16 \
  'sudo nginx -t && sudo systemctl reload nginx'
```

**배포 스크립트 사용 (권장):**
```bash
./deploy-to-ec2.sh
```

**nginx 설정 확인:**
```bash
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@54.242.63.16 \
  'sudo nginx -T 2>/dev/null | grep "root\|server_name"'
```

### 백엔드 API 배포 (100-200MB 대용량 파일용)
```bash
# 백엔드 API 서버 시작/재시작
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@54.242.63.16 \
  'cd ~/converter.hqmx/backend && npm install && pm2 restart converter-api'

# 또는 처음 시작
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@54.242.63.16 \
  'cd ~/converter.hqmx/backend && npm install && pm2 start src/index.js --name converter-api'

# 백엔드 로그 확인
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@54.242.63.16 \
  'pm2 logs converter-api'
```

## 개발 가이드

### 로컬 개발 시작 (초간단 2단계)
1. **저장소 클론 후 frontend 디렉토리 이동**:
   ```bash
   cd frontend
   python3 -m http.server 3000  # http://localhost:3000
   ```
2. **브라우저에서 http://localhost:3000 접속**

### 테스트 파일 변환
개발 중 변환 기능을 테스트하려면:
1. 작은 크기의 테스트 파일 사용 (1-10MB)
2. 브라우저 개발자 도구로 콘솔 확인
3. FFmpeg.wasm 로딩 시 초기 지연 있음 (정상)

### 특징
- **의존성 없음**: node_modules, npm install 불필요
- **바로 실행**: Python 서버만으로 즉시 테스트 가능
- **완전한 클라이언트 사이드**: 파일 변환이 브라우저에서 직접 실행

### 새로운 형식 추가
1. `frontend/script.js`의 `FORMATS` 객체에 형식 추가
2. `frontend/converter-engine.js`의 변환 설정에 코덱/옵션 추가
3. 필요시 이미지 처리 로직을 script.js에 추가

### 번역 추가
1. `frontend/locales/` 디렉토리에 새 언어 JSON 파일 생성
2. `frontend/i18n.js`의 언어 목록에 추가
3. HTML 요소에 `data-i18n-key` 속성 사용

### 스타일 수정
- `frontend/style.css`에서 테마 및 UI 스타일 수정
- CSS 변수를 활용한 테마 커스터마이징

## 중요 참고사항

### 보안 및 프라이버시
- ✅ 모든 파일 처리가 브라우저에서 로컬로 실행
- ✅ 서버로 파일이 전송되지 않음
- ✅ 사용자 데이터 완전 보호
- ✅ 오프라인 작동 가능

### 성능 고려사항
- 대용량 파일 변환 시 브라우저 메모리 제한 주의
- WebAssembly 초기 로딩 시간 (첫 변환시에만)
- 브라우저 탭당 메모리 사용량 모니터링 필요

### 제한사항
- 일부 고급 코덱은 FFmpeg.wasm에서 지원하지 않을 수 있음
- 브라우저 메모리 제한으로 매우 큰 파일(>2GB) 처리 어려움
- 일부 문서 형식(PDF, DOCX 등)은 제한적 지원

### 개발 시 주의사항
- `CLIENT_SIDE_MODE = true` 설정 유지 (frontend/script.js:19)
- 새로운 변환 형식 추가 시 `FORMATS` 객체 업데이트 필수
- 브라우저 호환성: WebAssembly, SharedArrayBuffer 지원 필요 (Chrome 90+, Firefox 88+)
- **CSS 캐시 파일**: `style-v*.css` 파일들은 캐시 무효화를 위한 버전 파일 (정리 필요시 주의)
- **Service Worker**: `sw.js`로 PWA 지원 및 오프라인 기능 제공

## 핵심 아키텍처 패턴

### 상태 관리 시스템 (`frontend/script.js`)
- **중앙화된 상태**: `state` 객체로 모든 파일, 변환 상태 관리
- **Map 기반 추적**: `conversions`, `eventSources`로 비동기 작업 추적
- **배치 처리 지원**: `batchFiles`로 다중 파일 처리

### 변환 엔진 아키텍처 (`frontend/converter-engine.js`)
- **ConverterEngine 클래스**: FFmpeg.wasm과 Canvas API 통합 관리
- **지연 로딩**: FFmpeg 라이브러리를 필요시에만 동적 로드
- **진행률 파싱**: FFmpeg 출력을 실시간 진행률로 변환
- **메모리 관리**: 변환 완료 후 WASM 파일시스템 자동 정리

### 다국어 시스템 (`frontend/i18n.js`)
- **I18n 클래스**: 번역 로딩 및 동적 적용
- **RTL 지원**: 아랍어, 히브리어 등 우측-좌측 언어 지원
- **브라우저 언어 감지**: 자동 언어 감지 및 localStorage 저장
- **동적 번역**: `data-i18n-key` 속성 기반 실시간 번역 적용

## 중요한 기술적 제약사항

### 브라우저 환경 요구사항
- **CORS 헤더**: FFmpeg.wasm SharedArrayBuffer 사용을 위한 필수 헤더
  ```
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  ```
- **메모리 제한**: 브라우저당 ~2GB 메모리 제한 (대용량 파일 처리 시 주의)
- **WASM 초기화**: 첫 변환시 FFmpeg 라이브러리 로딩으로 인한 지연 (정상적인 동작)

### 파일 처리 패턴
- **클라이언트 사이드 전용**: 파일이 서버로 전송되지 않음 (프라이버시 보장)
- **Blob URL 기반**: 변환된 파일을 브라우저 메모리에서 직접 다운로드
- **배치 변환**: 여러 파일을 순차적으로 처리 (메모리 효율성)

## 디버깅 및 개발 팁

### 브라우저 개발자 도구 활용
```javascript
// 현재 상태 확인 (콘솔에서)
console.log('Current state:', window.converterState);

// FFmpeg 로딩 상태 확인
console.log('FFmpeg loaded:', window.converterEngine?.ffmpegLoaded);

// 변환 진행률 모니터링
console.log('Active conversions:', window.converterState?.conversions);
```

### 테스트 파일 권장사항
- **초기 테스트**: 1-5MB 크기의 작은 파일 사용
- **형식 테스트**: 각 카테고리별 대표 형식으로 테스트
- **진행률 테스트**: 비디오 변환으로 진행률 표시 확인
- **에러 처리**: 지원하지 않는 형식으로 에러 핸들링 테스트

### 현재 상태
- ✅ **프론트엔드**: 완전 작동, 클라이언트 사이드 변환 구현 완료
- ⚠️ **백엔드**: API 구조만 존재, 실제 변환 미구현
- ✅ **FFmpeg.wasm**: 비디오/오디오 변환 작동
- ✅ **이미지 변환**: 브라우저 네이티브 API 사용
- ⚠️ **문서 변환**: 제한적 지원

### 미래 계획 (universal.md 참조)
- **Next.js 전환**: 현재 HTML/JS/CSS 구조에서 Next.js 14 App Router로 이전 계획
- **동적 SEO 라우팅**: /jpg-to-pdf 같은 SEO 최적화 URL 구조
- **유니버설 변환기**: 하나의 통합 엔진으로 모든 형식 지원
- **우선순위 형식**: PDF↔Word, YouTube→MP3, JPG↔PDF 등 검색량 기준 구현

## 문제 해결

### FFmpeg가 로드되지 않는 경우
- 브라우저 콘솔에서 CORS 에러 확인
- SharedArrayBuffer 지원 브라우저인지 확인
- 네트워크 연결 상태 확인 (CDN 접근)

### 변환이 실패하는 경우
- 지원되는 형식인지 확인
- 브라우저 메모리 사용량 확인
- 콘솔 로그에서 에러 메시지 확인

### 성능이 느린 경우
- 파일 크기 확인 (작은 파일로 테스트)
- 브라우저 탭 새로고침 (메모리 정리)
- 다른 탭 닫기 (메모리 확보)

## SEO 최적화 개별 변환 페이지 시스템

### 개요
- **목적**: `/jpg-to-png`, `/png-to-jpg` 등 100+ 개별 SEO 페이지 자동 생성 및 관리
- **방식**: 템플릿 기반 빌드 스크립트로 일괄 생성
- **장점**: `index.html` 수정 → 템플릿 업데이트 → 스크립트 실행 → 모든 페이지 자동 업데이트

### 파일 구조
```
frontend/
├── _templates/
│   └── conversion-page.html      # 마스터 템플릿 (플레이스홀더 포함)
├── _scripts/
│   ├── generate-pages.js         # Node.js 빌드 스크립트
│   ├── conversions.json          # 변환 조합 목록 (10개 → 100개 확장 예정)
│   └── format-metadata.json      # 형식별 상세 정보 (extensions, mimeType 등)
└── (생성된 HTML 파일들)
    ├── jpg-to-png.html
    ├── png-to-jpg.html
    ├── webp-to-jpg.html
    └── ... (총 10개, 확장 가능)
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

### 사용 방법

#### 1. 페이지 생성 (초기 또는 변환 조합 추가 후)
```bash
cd frontend/_scripts
node generate-pages.js

# 출력 예시:
# 🚀 SEO 페이지 생성 시작...
#
# ✓ jpg-to-png.html
# ✓ png-to-jpg.html
# ✓ webp-to-jpg.html
# ... (총 10개)
#
# 📊 완료: 10개 성공, 0개 실패
# 🎉 총 10개의 SEO 페이지가 생성되었습니다!
```

#### 2. index.html 구조 변경 시 모든 페이지 업데이트
```bash
# 1. index.html 수정 (네비게이션, 푸터, 스타일 등)
# 2. _templates/conversion-page.html에 동일한 변경사항 반영
# 3. 빌드 스크립트 재실행
cd frontend/_scripts
node generate-pages.js

# → 모든 SEO 페이지가 최신 구조로 일괄 업데이트됨
```

#### 3. 새로운 변환 조합 추가
```bash
# _scripts/conversions.json 편집:
# {
#   "from": "svg",
#   "to": "png",
#   "fromCategory": "image",
#   "toCategory": "image",
#   "priority": 7
# }

# _scripts/format-metadata.json에 형식 메타데이터 추가 (형식이 처음 등장하는 경우):
# "svg": {
#   "name": "SVG",
#   "fullName": "Scalable Vector Graphics",
#   "category": "image",
#   "extensions": [".svg"],
#   "mimeType": "image/svg+xml",
#   "description": "Vector graphics format"
# }

# 빌드 스크립트 실행
node generate-pages.js
```

#### 4. 서버 배포
```bash
# 로컬에서 페이지 생성 후 서버로 전송
cd frontend/_scripts
node generate-pages.js

# EC2 서버로 배포
scp -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem \
  /Users/wonjunjang/Documents/converter.hqmx/frontend/*.html \
  ubuntu@54.242.63.16:/tmp/

ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@54.242.63.16 \
  'sudo cp /tmp/*.html /var/www/html/ && \
   sudo chown www-data:www-data /var/www/html/*.html && \
   sudo chmod 755 /var/www/html/*.html && \
   sudo nginx -t && sudo systemctl reload nginx'
```

### 주의사항
- **✅ 절대 생성된 HTML 파일 직접 수정 금지**: `jpg-to-png.html` 등 생성된 파일은 절대 직접 수정하지 말 것
- **✅ 템플릿만 수정**: `_templates/conversion-page.html`만 수정하고 빌드 스크립트 재실행
- **✅ 설정 파일 검증**: `conversions.json`과 `format-metadata.json` 문법 오류 확인 (JSON Lint 사용 권장)
- **✅ Git 관리**:
  - **커밋 대상**: `_templates/`, `_scripts/` 폴더와 설정 파일
  - **제외 대상**: 생성된 HTML 파일들은 `.gitignore`에 추가 (배포 전 빌드로 생성)
- **✅ 배포 전 빌드 필수**: 배포 전 반드시 `node generate-pages.js` 실행하여 최신 상태 유지

### 현재 지원되는 변환 조합 (10개)
1. JPG → PNG (이미지, 우선순위: 10)
2. PNG → JPG (이미지, 우선순위: 10)
3. WebP → JPG (이미지, 우선순위: 9)
4. PNG → WebP (이미지, 우선순위: 8)
5. HEIC → JPG (이미지, 우선순위: 9)
6. JPG → PDF (이미지→문서, 우선순위: 8)
7. MP4 → AVI (비디오, 우선순위: 7)
8. AVI → MP4 (비디오, 우선순위: 7)
9. MP3 → WAV (오디오, 우선순위: 6)
10. WAV → MP3 (오디오, 우선순위: 6)

### 향후 확장 계획
- 100+ 변환 조합으로 확대
- 인기 검색어 기반 우선순위 조정
- 카테고리별 자동 Related Conversions 개선
- OG 이미지 자동 생성 (`og-{{FROM}}-to-{{TO}}.jpg`)

---

## 백엔드 변환 엔진 구현 (2025-10-09)

### 개요
99개 변환 타입을 지원하기 위한 백엔드 실제 변환 엔진 구현.
Cloudflare Workers 제약사항(30초 CPU, 128MB 메모리)을 고려한 하이브리드 전략.

### 백엔드 폴더 크기
- **전체 크기**: 236MB
- **node_modules**: 235MB (정상 범위)
- **주요 패키지**: @cloudflare (94MB), typescript (23MB), @img (18MB)

### 구현된 변환 엔진

#### 1. DocumentConverter (이미지 ↔ PDF)
**파일 위치**: `backend/src/utils/converters/document-converter.js`

**지원 변환**:
- JPG/PNG → PDF (검색량: 7.4M+)
- PDF → JPG/PNG (검색량: 4.9M+)

**기술 스택**:
- `pdf-lib` v1.17.1: PDF 생성 및 조작 (Pure JavaScript, Workers 호환)
- `pdfjs-dist` v4.0.379: PDF 렌더링 (⚠️ Workers 호환성 확인 필요)

**주요 메서드**:
```javascript
imageToPDF(imageData)    // 이미지를 PDF로 변환
pdfToImage(pdfData)      // PDF를 이미지로 변환 (첫 페이지)
```

**설정 옵션**:
- `quality`: 이미지 품질 (0.1-1.0)
- `scale`: PDF 렌더링 스케일 (0.5-4.0)

#### 2. 의존성 추가 (package.json)
```json
{
  "dependencies": {
    "pdf-lib": "^1.17.1",       // PDF 생성/조작
    "@squoosh/lib": "^0.5.3",   // 이미지 변환 (⚠️ Node 버전 경고)
    "pdfjs-dist": "^4.0.379"    // PDF 렌더링
  }
}
```

**설치 명령**:
```bash
cd backend
npm install
```

#### 3. ConverterFactory 통합
**파일**: `backend/src/utils/converter-factory.js`

**추가된 크로스 카테고리 변환**:
```javascript
// 이미지 → PDF
if (inputInfo.category === 'image' && outputInfo.category === 'document') {
  return new DocumentConverter(inputInfo.extension, outputInfo.extension, settings);
}

// PDF → 이미지
if (inputInfo.category === 'document' && outputInfo.category === 'image') {
  return new DocumentConverter(inputInfo.extension, outputInfo.extension, settings);
}
```

### 99개 변환 구현 전략

#### Tier 1: 즉시 구현 가능 (WASM/Pure JS) - 22개
| 변환 타입 | 검색량 | 상태 | 라이브러리 |
|----------|--------|------|-----------|
| **JPG/PNG → PDF** | 7.4M | ✅ 완료 | pdf-lib |
| **PDF → JPG** | 4.9M | ⚠️ 테스트 필요 | pdfjs-dist |
| **WEBP ↔ PNG/JPG** | 3.8M | 🔜 계획 | @squoosh/lib |
| **HEIC → JPG** | 0.5M | 🔜 계획 | heic-decode |
| **AVIF → JPG** | 0.7M | 🔜 계획 | @squoosh/lib |

#### Tier 2: 외부 API 연동 필요 - 8개
| 변환 타입 | 검색량 | 방법 | 예상 비용 |
|----------|--------|------|----------|
| **PDF → Word** | 7.9M | CloudConvert API | $0.01/변환 |
| **PDF → Excel** | 2-3M | CloudConvert API | $0.01/변환 |
| **Word/Excel → PDF** | 11M+ | Pandoc API | $0.005/변환 |
| **YouTube → MP3/MP4** | 8M+ | yt-dlp API | Free |

#### Tier 3: 클라이언트 사이드 우선 - 69개
비디오/오디오 변환은 대부분 클라이언트 사이드(FFmpeg.wasm)로 처리.
서버는 작은 파일(<10MB)만 fallback으로 지원.

### Cloudflare Workers 제약사항 및 대응

**제약사항**:
- CPU Time: 30초 (Paid tier)
- Memory: 128MB
- 실행 시간: HTTP 30초 응답 제한

**대응 전략**:
1. **작은 파일만 서버 처리**: 이미지 <10MB, 비디오 <5MB
2. **Pure JavaScript/WASM 라이브러리**: Node.js native 모듈 사용 불가
3. **외부 API 연동**: 무거운 변환은 CloudConvert, Pandoc API 활용
4. **클라이언트 우선**: 큰 파일은 프론트엔드 FFmpeg.wasm으로 유도

### 테스트 및 배포

#### 로컬 테스트
```bash
cd backend
npm run dev  # wrangler dev (http://localhost:8787)

# 테스트 예시 (curl)
curl -X POST http://localhost:8787/convert \
  -F "file=@test.jpg" \
  -F "outputFormat=pdf" \
  -F "settings={\"quality\":0.9}"
```

#### 프로덕션 배포
```bash
cd backend
npm run deploy  # Cloudflare Workers 배포
```

### 다음 단계

**Phase 2 구현 계획**:
1. ✅ ImageConverter WASM 업그레이드 (WEBP, HEIC 지원)
2. ✅ 외부 API 클라이언트 구현 (CloudConvert, yt-dlp)
3. ✅ VideoConverter/AudioConverter FFmpeg.wasm 통합
4. ✅ 전체 99개 변환 테스트 및 검증

**주의사항**:
- ⚠️ `pdfjs-dist`는 Cloudflare Workers에서 호환성 문제 가능 → 테스트 필수
- ⚠️ `@squoosh/lib`는 Node 버전 경고 있음 → 런타임 테스트 필요
- ✅ `pdf-lib`는 Pure JS로 Workers 완전 호환