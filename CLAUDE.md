# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소의 코드 작업 시 참고하는 가이드입니다.

> **📚 상세 문서**:
> - **아키텍처**: `docs/ARCHITECTURE.md` - 시스템 구조, 프론트엔드/백엔드 아키텍처, SEO, 다국어
> - **히스토리**: `docs/HISTORY.md` - 개발 히스토리, 트러블슈팅, 광고, 비용 분석

## ⚠️ CRITICAL RULES (절대 규칙)
1. **Elastic IP 변경됨**: 23.21.183.81 (이전: 54.242.63.16)
2. **프론트엔드 디자인 변경 금지** - 백엔드만 수정 가능
3. **기존 파일 구조 유지** - 임의로 파일 삭제/이동 금지
4. **다운로드 서버비용 최적화 설정** - 이 설정은 절대 변경 불가
5. **모든 응답과 커밋 메시지는 한글로 작성**

---

## 📌 프로젝트 개요

HQMX Converter는 클라이언트 사이드에서 작동하는 파일 변환 웹 애플리케이션입니다.
브라우저에서 직접 FFmpeg.wasm을 사용하여 변환하며, 대용량 파일(100-2500MB)은 EC2 서버에서 처리합니다.

**웹사이트**: https://hqmx.net

**핵심 원칙**:
- 95% 클라이언트 변환 (프라이버시 + 비용 절감)
- 5% 서버 변환 (대용량 파일 전용)
- 4-Tier 스마트 라우팅 (업로드 시간 고려)

---

## 🖥️ 서버 정보

### hqmx.net (메인 서버)
- **IP (Elastic IP)**: 23.21.183.81 ⚠️ 변경됨 (이전: 54.242.63.16)
- **타입**: AWS EC2 t3.medium (Spot Instance - 70% 할인)
- **CPU**: 2 vCPU (무제한 모드 활성화 - CPU 크레딧 제약 없음)
- **메모리**: 4GB RAM
- **디스크**: 20GB EBS gp3
- **동시 처리**: MAX_CONCURRENCY=4 (메모리 기준: 4GB / ~1GB per job)
- **Git**: https://github.com/hqmx/hqmx-backend
- **PEM 파일**: `/Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem`
- **PM2 프로세스**: `pm2 start src/server.js --name hqmx-backend`
  - ⚠️ `src/index.js`가 아닌 `src/server.js` 사용 (Express 기반)

**처리 용량**:
- 대형 비디오 (100-500MB): 동시 2-3개
- 중형 비디오 (10-100MB): 동시 4-5개
- 오디오/이미지: 동시 5-10개

---

## 🚀 빠른 시작 (Quick Start)

### 개발 서버 실행
```bash
# 프론트엔드 개발 (가장 일반적)
cd frontend
python3 -m http.server 3000  # → http://localhost:3000

# 또는 프로젝트 루트에서
npm run dev
```

### 주요 명령어

**프론트엔드 개발:**
```bash
cd frontend
python3 -m http.server 3000     # 개발 서버 시작
```

**백엔드 개발 (EC2 기반, 대용량 파일 처리용):**
```bash
cd backend
npm install                     # 의존성 설치 (최초 1회)
npm run dev                     # 로컬 개발 서버 (http://localhost:3001)
npm run test                    # Jest 테스트 실행
```

**SEO 페이지 생성 (선택사항):**
```bash
cd frontend/_scripts
node generate-pages.js          # 변환 페이지 생성 (jpg-to-png.html 등)
```

**배포:**
```bash
./deploy-to-ec2.sh              # EC2 서버로 전체 배포 (권장)
```

---

## 📂 핵심 파일 구조

```
converter.hqmx/
├── frontend/                   # 클라이언트 사이드 앱 (순수 HTML/JS/CSS)
│   ├── index.html              # 메인 페이지 (단 하나!)
│   ├── script.js               # 메인 로직 (5000+ 라인)
│   ├── converter-engine.js     # FFmpeg.wasm 변환 엔진
│   ├── i18n.js                 # 21개 언어 지원
│   ├── style.css               # 스타일링 및 테마
│   ├── lib/ffmpeg/             # FFmpeg.wasm 자체 호스팅 (0.12.x)
│   │   ├── ffmpeg.js           # 3.4KB
│   │   ├── 814.ffmpeg.js       # 2.7KB
│   │   ├── ffmpeg-core.js      # 112KB
│   │   └── ffmpeg-core.wasm    # 31MB
│   ├── locales/                # 번역 파일 (21개)
│   ├── _scripts/               # 빌드 스크립트
│   │   ├── generate-pages.js       # SEO 페이지 생성
│   │   └── conversions.json        # 289개 변환 조합
│   └── _templates/             # 페이지 템플릿
│       └── conversion-page.html
│
├── backend/                    # 서버 사이드 변환 (EC2)
│   ├── src/
│   │   ├── server.js           # Express 앱 (메인 진입점)
│   │   ├── handlers/           # API 핸들러
│   │   └── utils/converters/   # 변환기 (Sharp, FFmpeg)
│   ├── .env                    # 환경 변수 (MAX_CONCURRENCY=4)
│   └── package.json            # 의존성 (Sharp, fluent-ffmpeg)
│
├── docs/                       # 상세 문서
│   ├── ARCHITECTURE.md         # 시스템 아키텍처
│   └── HISTORY.md              # 개발 히스토리, 트러블슈팅
│
├── deploy-to-ec2.sh            # 배포 스크립트
└── hqmx-ec2.pem                # SSH 키
```

---

## 🔧 Git 및 배포

### Git 기본 정보
- **저장소**: https://github.com/hqmx/hqmx-backend
- **메인 브랜치**: main
- **커밋 메시지**: 한글로 작성

### Git 워크플로우
```bash
# 현재 상태 확인
git status
git branch

# 변경사항 커밋
git add .
git commit -m "변경사항 설명"

# 푸시
git push origin main
```

### SSH 연결
```bash
# SSH 연결 (Elastic IP)
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.21.183.81

# PEM 파일 권한 설정 (필요시)
chmod 400 /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem
```

### 배포 (EC2 nginx)

**⚠️ 중요**: nginx root 경로는 `/var/www/html/` (절대 `~/frontend/`에 복사하지 말 것)

**배포 스크립트 사용 (권장):**
```bash
./deploy-to-ec2.sh
```

**수동 배포:**
```bash
# 1. 로컬에서 /tmp로 복사
scp -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem \
  frontend/*.html frontend/*.js frontend/*.css ubuntu@23.21.183.81:/tmp/

# 2. 서버에서 nginx root로 이동 및 권한 설정
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.21.183.81 \
  'sudo cp /tmp/*.html /tmp/*.js /tmp/*.css /var/www/html/ && \
   sudo chown www-data:www-data /var/www/html/* && \
   sudo chmod 755 /var/www/html/* && \
   sudo nginx -t && sudo systemctl reload nginx'
```

**백엔드 API 재시작:**
```bash
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.21.183.81 \
  'cd ~/hqmx/backend && pm2 restart hqmx-backend'
```

---

## 🛠️ 개발 가이드

### 로컬 개발 시작
1. `cd frontend`
2. `python3 -m http.server 3000`
3. 브라우저에서 http://localhost:3000 접속

### 새로운 형식 추가
1. `frontend/script.js`의 `FORMATS` 객체에 형식 추가
2. `frontend/converter-engine.js`의 변환 설정에 코덱/옵션 추가

### 번역 추가
1. `frontend/locales/` 디렉토리에 새 언어 JSON 파일 생성 (예: `vi.json`)
2. `frontend/i18n.js`의 `supportedLangs` 배열에 언어 코드 추가
3. nginx 설정에 언어 코드 추가 (`/etc/nginx/sites-available/hqmx.net`)

---

## 🔍 디버깅

### 브라우저 개발자 도구
```javascript
// 콘솔에서 상태 확인
console.log('Current state:', window.converterState);
console.log('FFmpeg loaded:', window.converterEngine?.ffmpegLoaded);
console.log('Active conversions:', window.converterState?.conversions);
```

### 서버 로그 확인
```bash
# PM2 로그
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.21.183.81 \
  'pm2 logs hqmx-backend --lines 50'

# nginx 에러 로그
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.21.183.81 \
  'sudo tail -f /var/log/nginx/error.log'
```

---

## 🚨 문제 해결

### FFmpeg가 로드되지 않는 경우
1. 브라우저 콘솔에서 CORS 에러 확인
2. nginx CORS 헤더 확인:
   ```bash
   curl -I https://hqmx.net/lib/ffmpeg/ffmpeg.js | grep -i "cross-origin"
   ```
3. FFmpeg 파일 존재 확인:
   ```bash
   ssh -i hqmx-ec2.pem ubuntu@23.21.183.81 'ls -lh /var/www/html/lib/ffmpeg/'
   ```

### 변환이 실패하는 경우
1. 브라우저 콘솔에서 에러 메시지 확인
2. 지원되는 형식인지 확인
3. 파일 크기 확인 (브라우저: <2GB, 서버: <2.5GB)

### 배포 후 404 에러
1. nginx root 경로 확인:
   ```bash
   ssh -i hqmx-ec2.pem ubuntu@23.21.183.81 \
     'sudo nginx -T 2>/dev/null | grep "root\|server_name"'
   ```
2. 파일 권한 확인:
   ```bash
   ssh -i hqmx-ec2.pem ubuntu@23.21.183.81 'ls -la /var/www/html/'
   ```

---

## 📚 추가 문서

- **`docs/ARCHITECTURE.md`**: 시스템 아키텍처, 4-Tier 라우팅, 프론트엔드/백엔드 구조, SEO, 다국어
- **`docs/HISTORY.md`**: 개발 히스토리, FFmpeg.wasm 자체 호스팅, 트러블슈팅, 광고 수익화, 비용 분석

---

## 🎯 현재 상태

- ✅ **프론트엔드**: 완전 작동, 클라이언트 사이드 변환 구현 완료
- ✅ **백엔드**: Sharp + fluent-ffmpeg 기반 변환 엔진 구현 완료
- ✅ **FFmpeg.wasm**: 0.12.x 자체 호스팅, 10MB+ 파일 변환 성공
- ✅ **SEO**: 289개 개별 변환 페이지 생성 완료
- ✅ **다국어**: 21개 언어 지원, nginx + 동적 로딩
- ✅ **광고**: Adsterra 3종 (Banner, Interstitials, Popunder) 활성화
- ✅ **동시 처리**: MAX_CONCURRENCY=4 (t3.medium 무제한 모드)

---

## 🔜 다음 단계

- [ ] 비디오 변환 FFmpeg 진행률 정확도 개선
- [ ] DocumentConverter 구현 (PDF ↔ 이미지)
- [ ] LibreOfficeConverter 구현 (DOC/XLSX → PDF)
- [ ] 크로스 카테고리 변환 (비디오 → GIF)
- [ ] 대용량 파일 테스트 (100MB+, 동시 변환)
