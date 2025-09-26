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

## 명령어

### 메인 프론트엔드 (frontend 디렉토리) ✅ 사용
```bash
cd frontend
python3 -m http.server 3000  # http://localhost:3000에서 개발 서버 시작
```
- **특징**: 순수 HTML/JS/CSS, 의존성 없음, 바로 실행 가능
- **변환 엔진**: `CLIENT_SIDE_MODE = true` - 브라우저에서 직접 변환
- **다국어**: i18n.js로 다국어 지원
- **완성된 UI**: 드래그&드롭, 진행률, 테마 등 모든 기능 구현

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

## 배포

### 프론트엔드 배포
- **플랫폼**: Cloudflare Pages, Netlify, Vercel 등
- **정적 호스팅**: 서버 사이드 처리 불필요
- **CORS 헤더**: SharedArrayBuffer 사용을 위해 필요
  ```
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  ```

### 배포 명령
```bash
# 프론트엔드 배포 (Cloudflare Pages)
wrangler pages deploy frontend --project-name hqmx-converter

# 또는 프로젝트 루트에서 배포 스크립트 사용
./deploy.sh

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
- `CLIENT_SIDE_MODE = true` 설정 유지 (frontend/script.js:18)
- 새로운 변환 형식 추가 시 `FORMATS` 객체 업데이트 필수
- 브라우저 호환성: SharedArrayBuffer 지원 필요 (Chrome 90+, Firefox 88+)

### 현재 상태
- ✅ **프론트엔드**: 완전 작동, 클라이언트 사이드 변환 구현 완료
- ⚠️ **백엔드**: API 구조만 존재, 실제 변환 미구현
- ✅ **FFmpeg.wasm**: 비디오/오디오 변환 작동
- ✅ **이미지 변환**: 브라우저 네이티브 API 사용
- ⚠️ **문서 변환**: 제한적 지원

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