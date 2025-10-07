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
https://converter.hqmx.net

## ip
23.22.45.186

[text](hqmx-ec2.pem)



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
npm run deploy       # Cloudflare Pages 배포
npm run lint         # JavaScript/CSS 린팅
npm run test         # 테스트 실행
```

### 백엔드 개발 (backend 디렉토리) - 선택적/미사용
```bash
cd backend
npm install          # 의존성 설치 (최초 1회)
npm run dev          # Cloudflare Workers 개발 서버 (http://localhost:8787)
npm run deploy       # 프로덕션 배포
npm run test         # Jest 테스트 실행
npm run lint         # ESLint 검사
npm run format       # Prettier 코드 포맷팅
wrangler tail        # 실시간 로그 확인
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

### 백엔드 (`/backend`) - 선택적 ⚠️
- **플랫폼**: Cloudflare Workers (Hono 프레임워크)
- **상태**: API 구조만 구현, 실제 변환 엔진 미구현
- **기능**: R2 스토리지, Durable Objects, Rate Limiting
- **용도**: 서버 사이드 변환이 필요한 경우 사용 가능 (현재 미사용)

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
- **저장소**: https://github.com/hqmx/converter.git (실제), https://github.com/hqmx/convertor-backend (legacy)
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
# origin  https://github.com/hqmx/converter-backend.git (fetch)
# origin  https://github.com/hqmx/converter-backend.git (push)
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

### EC2 서버 연결
- **도메인**: https://converter.hqmx.net
- **EC2 IP**: 23.22.45.186
- **PEM 파일**: `/Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem`

#### SSH 연결
```bash
# SSH 연결
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.22.45.186

# 또는 ec2-user (AMI에 따라)
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ec2-user@23.22.45.186

# PEM 파일 권한 설정 (필요시)
chmod 400 /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem
```

#### SCP 파일 전송
```bash
# 로컬 -> 서버 파일 전송
scp -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem -r frontend/ ubuntu@23.22.45.186:~/

# 서버 -> 로컬 파일 다운로드
scp -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.22.45.186:~/backup.tar.gz ./
```

#### 서버에서 Git 동기화
```bash
# 서버에서 최신 코드 받기 (GitHub에서)
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.22.45.186 'cd ~/converter.hqmx && git pull origin main'

# 서버에서 Git 상태 확인
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.22.45.186 'cd ~/converter.hqmx && git status'

# 서버에서 원격 저장소 확인
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.22.45.186 'cd ~/converter.hqmx && git remote -v'
```

#### 서버 상태 확인
```bash
# 웹 서버 상태 확인
curl -I https://converter.hqmx.net

# 서버 포트 확인
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.22.45.186 'sudo netstat -tlnp'

# 디스크 사용량 확인
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.22.45.186 'df -h'
```

## 배포

### 프론트엔드 배포
- **플랫폼**: Cloudflare Pages, Netlify, Vercel 등
- **정적 호스팅**: 서버 사이드 처리 불필요
- **CORS 헤더**: SharedArrayBuffer 사용을 위해 필요
  ```
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  ```

### ⚠️ EC2 서버 배포 - 중요 경로 정보

**nginx 설정:**
- **nginx root 경로**: `/var/www/html/`
- **절대 복사하지 말 것**: `~/frontend/` (nginx가 보지 않는 위치)

**올바른 배포 절차:**
```bash
# 1. 로컬에서 /tmp로 복사
scp -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem \
  frontend/style.css frontend/index.html ubuntu@23.22.45.186:/tmp/

# 2. 서버에서 nginx root로 이동 및 권한 설정
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.22.45.186 \
  'sudo cp /tmp/style.css /tmp/index.html /var/www/html/ && \
   sudo chown www-data:www-data /var/www/html/style.css /var/www/html/index.html && \
   sudo chmod 755 /var/www/html/style.css /var/www/html/index.html'

# 3. nginx reload
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.22.45.186 \
  'sudo nginx -t && sudo systemctl reload nginx'
```

**배포 스크립트 사용 (권장):**
```bash
./deploy-to-ec2.sh
```

**nginx 설정 확인:**
```bash
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.22.45.186 \
  'sudo nginx -T 2>/dev/null | grep "root\|server_name"'
```

### 기타 배포 명령
```bash
# 프론트엔드 배포 (Cloudflare Pages)
wrangler pages deploy frontend --project-name hqmx-converter

# 백엔드 배포 (선택적)
cd backend
npm run deploy
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