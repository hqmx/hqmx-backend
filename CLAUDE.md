# CLAUDE.md

이 파일은 이 저장소에서 작업할 때 Claude Code (claude.ai/code)에게 가이드를 제공합니다.

모든 내용은 한글로 작성되어 있습니다.

## 명령어

### 개발
- `npm run dev` - 로컬 개발 서버 시작 (포트 3000에서 Python HTTP 서버)
- `npm run build` - 배포를 위한 프로젝트 빌드 (현재 플레이스홀더)
- `npm run lint` - JavaScript 및 CSS 파일 린팅 (현재 플레이스홀더)

### 번역 관리 (ex-frontend 디렉토리)
- `cd ex-frontend && npm run sync:translations` - Google Translate API를 사용하여 번역 동기화
- 번역 파일은 `/locales/` 및 `/ex-frontend/locales/`에 위치

## 아키텍처 개요

이것은 다음과 같은 주요 구성 요소를 가진 클라이언트 사이드 파일 변환기 웹 애플리케이션입니다:

### 핵심 애플리케이션 구조
- **프론트엔드 전용 애플리케이션**: 순수 HTML5, CSS3 및 Vanilla JavaScript
- **빌드 시스템 없음**: 정적 파일을 직접 제공
- **이중 디렉토리 구조**: 루트 디렉토리에는 메인 앱이, `ex-frontend/`에는 번역 도구가 포함된 확장 버전이 있음

### 주요 구성 요소

#### JavaScript 아키텍처 (`script.js`)
- **상태 관리**: 파일, 변환 및 이벤트 소스를 관리하는 전역 상태 객체
- **API 통합**: `API_BASE_URL`의 변환 백엔드에 대한 RESTful API 호출
- **형식 지원**: 5개 카테고리(비디오, 오디오, 이미지, 문서, 아카이브)에 걸친 300+ 파일 형식
- **고급 설정**: 카테고리별 변환 매개변수(품질, 해상도, 비트레이트 등)
- **진행 추적**: 실시간 변환 진행을 위한 서버 전송 이벤트
- **파일 처리**: 배치 변환 지원이 있는 드래그 앤 드롭 인터페이스

#### 국제화 시스템 (`i18n.js`)
- **다국어 지원**: 자동 브라우저 감지가 있는 20+ 언어
- **RTL 지원**: 아랍어, 히브리어 등을 위한 오른쪽에서 왼쪽 텍스트 방향
- **동적 로딩**: JSON 번역 파일을 비동기적으로 로드
- **localStorage 지속성**: 사용자 언어 기본 설정을 로컬에 저장

#### 스타일링 (`style.css`)
- **테마 시스템**: 자동 시스템 기본 설정 감지가 있는 다크/라이트 테마
- **반응형 디자인**: CSS Grid 및 Flexbox를 사용한 모바일 우선 접근 방식
- **CSS 사용자 정의 속성**: 테마를 위한 광범위한 CSS 변수 사용
- **컴포넌트 기반**: UI 컴포넌트를 위한 모듈식 CSS 구조

### API 통합
- **기본 URL**: 개발(`localhost:5001`) 및 프로덕션 엔드포인트 간 구성 가능
- **엔드포인트**: 
  - `POST /convert` - 파일 변환 시작
  - `GET /stream-progress/:taskId` - 진행을 위한 서버 전송 이벤트
  - `GET /download/:taskId` - 변환된 파일 다운로드
- **백엔드**: Cloudflare Workers + R2 Storage 백엔드 필요 (이 저장소에 포함되지 않음)

### 구성
- **API 엔드포인트**는 `script.js`의 14번째 줄에서 구성
- **파일 크기 제한**은 `package.json`에서 100MB(104857600 바이트)로 설정
- **형식 카테고리**는 `script.js`의 `FORMATS` 객체에 정의
- **고급 설정**은 `script.js`의 `ADVANCED_SETTINGS` 객체에서 형식별로 정의

### 번역 시스템
- **기본 언어**: 영어(`en.json`)
- **번역 파일**: `/locales/` 디렉토리의 JSON 형식
- **자동화된 번역**: `ex-frontend/scripts/sync-translations.js`의 Google Translate API 통합
- **언어 감지**: 영어로 폴백하는 자동 브라우저 언어 감지

### 배포
- **대상 플랫폼**: Cloudflare Pages
- **정적 호스팅**: 프론트엔드에 서버 사이드 처리 불필요
- **CDN**: 글로벌 배포를 위한 Cloudflare CDN
- **빌드 출력**: 루트 디렉토리에는 배포 준비가 된 파일이 포함

## 주요 파일
- `index.html` - 메인 애플리케이션 진입점
- `script.js` - 핵심 애플리케이션 로직 및 API 통합
- `style.css` - 테마 지원이 있는 스타일링
- `i18n.js` - 국제화 시스템
- `locales/*.json` - 번역 파일
- `ex-frontend/` - 번역 도구가 있는 확장 프론트엔드
- `assets/` - 아이콘, 파비콘 및 정적 자산

## 중요 참고사항
- 백엔드 엔드포인트를 변경할 때 `script.js:14`의 `API_BASE_URL` 업데이트
- 
- 테마 기본 설정은 localStorage에 'theme'으로 저장
- 언어 기본 설정은 localStorage에 'language'로 저장
- 파일 보존 정책: 24시간 (백엔드에서 구성 가능)