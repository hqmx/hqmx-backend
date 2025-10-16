# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL RULES (절대 규칙)
1. 
2. **프론트엔드 디자인 변경 금지** - 백엔드만 수정 가능
3. **기존 파일 구조 유지** - 임의로 파일 삭제/이동 금지
4. **다운로드 서버비용 최적화 설정** - 이 설정은 절대 변경 불가
5. **모든 응답과 커밋 메시지는 한글로 작성**


## 프로젝트 개요

HQMX Converter는 100% 클라이언트 사이드에서 작동하는 파일 변환 웹 애플리케이션입니다.
서버로 파일을 업로드하지 않고 브라우저에서 직접 FFmpeg.wasm을 사용하여 변환합니다.

## 웹사이트 주소
- **메인**: https://hqmx.net

## 서버 정보
### hqmx.net (메인 서버)
- **IP (Elastic IP)**: 23.21.183.81 ⚠️ 변경됨 (이전: 54.242.63.16)
- **Git**: https://github.com/hqmx/hqmx-backend
- **PEM 파일**: `/Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem`
- **서버 상태**: ✅ 정상 작동 (2025-10-16 확인)
- **백엔드 API**: https://hqmx.net/api/health
- **Trust Proxy**: Cloudflare + nginx 설정 완료 (2025-10-13)
- **PM2 프로세스**: `pm2 start src/server.js --name hqmx-backend`
  - ⚠️ `src/index.js`가 아닌 `src/server.js` 사용 (Express 기반)
- **인스턴스 타입**: t3.medium (4GB RAM, 2 vCPU) ⚠️ 업그레이드됨 (2025-10-17)
- **동시 처리**: MAX_CONCURRENCY=2 (2개 작업 동시 변환 가능)
- **자동 취소 시스템**: 클라이언트 연결 끊김 시 서버 작업 자동 취소 (2025-10-17)
  - Heartbeat 모니터링 (30초 타임아웃)
  - FFmpeg 프로세스 자동 종료
  - 임시 파일 자동 삭제
- **중요 참고사항**:
  - `document-converter.js` 파일 삭제됨 (2025-10-16)
  - EC2에서는 LibreOffice + ImageMagick 사용
  - Cloudflare Workers 전용 파일은 EC2에 배포 금지

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

## 🏗️ 아키텍처 개요 (Architecture)

**핵심 원칙**: 스마트 라우팅 - 업로드 시간을 고려한 동적 최적화

### 🎯 4-Tier 라우팅 전략 (289개 변환)

**핵심 통찰**: 서버가 약간 빠르더라도 업로드 시간이 추가되면 총 시간은 비슷하거나 더 느림
→ **대부분 클라이언트가 더 효율적** (프라이버시 + 비용 절감)

```
┌─────────────────────────────────────────────────────────┐
│ Tier 1: 항상 클라이언트 (105개 - 36%)                    │
│ - 작은 파일 (< 10MB), 빠른 변환 (< 30초)                 │
│ - 예: JPG↔PNG, MP3↔WAV, 이미지→PDF                      │
│ - 이유: 업로드 시간 > 변환 절약 시간                     │
│   예) 5MB JPG→PNG: 클라이언트 5초 vs 서버 9초 (44% 빠름) │
├─────────────────────────────────────────────────────────┤
│ Tier 2: 클라이언트 우선 (110개 - 38%)                    │
│ - 중간 파일 (10-100MB), 중간 변환 (30초-3분)             │
│ - 예: 비디오 중간 크기, 비디오→오디오 추출               │
│ - 로직: if (업로드 > 변환 * 0.3) 클라이언트              │
│   예) 50MB MP4→WebM: 둘 다 2분 → 클라이언트 (프라이버시) │
├─────────────────────────────────────────────────────────┤
│ Tier 3: 동적 판단 (50개 - 17%)                           │
│ - 대형 파일 (100MB+), 복잡한 변환 (3분+)                 │
│ - 예: 대형 비디오 1080p, GIF 생성                        │
│ - 로직: 실시간 네트워크 속도 + 예상 시간 계산            │
│   예) 500MB MP4→AVI: 서버 5분 vs 클라이언트 8분 (34% 빠름)│
├─────────────────────────────────────────────────────────┤
│ Tier 4: 항상 서버 (24개 - 9%)                            │
│ - 클라이언트 불가능 또는 서버 3배+ 빠름                  │
│ - 예: DOC/XLS→PDF (LibreOffice 필요), 4K 비디오          │
│ - 이유: 전문 소프트웨어 또는 메모리 제약                 │
└─────────────────────────────────────────────────────────┘
```

**동적 라우팅 로직**:
```javascript
총_클라이언트_시간 = 변환_시간
총_서버_시간 = 업로드_시간 + 서버_변환_시간 + 다운로드_시간

if (총_클라이언트_시간 <= 총_서버_시간 * 1.3) {
  클라이언트_사용(); // 30% 이내 차이면 클라이언트 (프라이버시)
} else if (총_서버_시간 * 2 < 총_클라이언트_시간) {
  서버_추천(); // 서버가 2배 빠르면 강력 추천
} else {
  사용자_선택(); // 애매하면 선택 제공
}
```

**상세 문서**: `docs/conversion-routing-strategy.md`, `docs/conversion-tier-mapping.json`

### 메인 프론트엔드 (`/frontend`) ✅ 완성된 앱

**아키텍처**: 순수 HTML/JS/CSS + WebAssembly

**핵심 파일**:
- `script.js` (5000+ 라인): 상태 관리, UI 제어, 이벤트 처리
- `converter-engine.js`: FFmpeg.wasm 래핑, 진행률 파싱
- `i18n.js`: 21개 언어 지원, 동적 번역
- `feature-flags.js`: 기능 토글 시스템

**변환 엔진**:
1. **FFmpeg.wasm**: 비디오/오디오 변환
   - CDN 로드 (지연 로딩)
   - SharedArrayBuffer 멀티스레드
   - 실시간 진행률 파싱

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

## 🔧 트러블슈팅 (Troubleshooting)

### FFmpeg.wasm 문제 해결 가이드 (2025-10-14)

#### 문제: 10MB 이상 파일 변환 실패

**증상**:
- 작은 파일 (<10MB): 정상 작동
- 큰 파일 (≥10MB): FFmpeg 로딩 실패 또는 변환 중단
- CDN에서 404 에러 또는 CORS 에러 발생

**근본 원인**:
1. **외부 CDN 불안정성**: unpkg.com, jsdelivr.com 등에서 FFmpeg.wasm 파일 로딩 실패
2. **CORS 헤더 누락**: SharedArrayBuffer 사용에 필요한 CORP 헤더 없음
3. **API 버전 불일치**: FFmpeg.wasm 0.11.x API를 0.12.x에서 사용

#### 해결 방법: 자체 호스팅 + API 마이그레이션

**1단계: FFmpeg.wasm 자체 호스팅**

```bash
# npm으로 FFmpeg.wasm 다운로드
npm install @ffmpeg/ffmpeg@0.12.6 @ffmpeg/core@0.12.6

# 필요한 파일 복사
cp node_modules/@ffmpeg/ffmpeg/dist/umd/ffmpeg.js frontend/lib/ffmpeg/
cp node_modules/@ffmpeg/ffmpeg/dist/umd/814.ffmpeg.js frontend/lib/ffmpeg/
cp node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js frontend/lib/ffmpeg/
cp node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm frontend/lib/ffmpeg/

# EC2 서버로 업로드
scp -i hqmx-ec2.pem -r frontend/lib/ffmpeg/ ubuntu@54.242.63.16:/tmp/
ssh -i hqmx-ec2.pem ubuntu@54.242.63.16 \
  'sudo mkdir -p /var/www/html/lib/ffmpeg && \
   sudo cp -r /tmp/ffmpeg/* /var/www/html/lib/ffmpeg/ && \
   sudo chown -R www-data:www-data /var/www/html/lib/ffmpeg && \
   sudo chmod -R 755 /var/www/html/lib/ffmpeg'
```

**파일 크기**:
- `ffmpeg.js`: 3.4KB
- `814.ffmpeg.js`: 2.7KB
- `ffmpeg-core.js`: 112KB
- `ffmpeg-core.wasm`: 31MB

**2단계: nginx CORS 헤더 추가**

`/etc/nginx/nginx.conf`에 다음 추가:

```nginx
http {
    # FFmpeg.wasm CORS 헤더 (SharedArrayBuffer 필수)
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Embedder-Policy "require-corp" always;
    add_header Cross-Origin-Resource-Policy "cross-origin" always;
}
```

적용:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

**3단계: converter-engine.js API 마이그레이션 (0.11.x → 0.12.x)**

**변경 1**: FFmpeg 로딩 URL을 로컬 경로로 변경

```javascript
// frontend/converter-engine.js Line 75
// BEFORE:
const script = document.createElement('script');
script.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.min.js';

// AFTER:
const script = document.createElement('script');
script.src = '/lib/ffmpeg/ffmpeg.js';
```

**변경 2**: Core 파일 경로 변경

```javascript
// frontend/converter-engine.js Lines 45-46
// BEFORE:
coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',

// AFTER:
coreURL: '/lib/ffmpeg/ffmpeg-core.js',
wasmURL: '/lib/ffmpeg/ffmpeg-core.wasm',
```

**변경 3**: fetchFile 제거 (0.12.x에서 더 이상 제공 안 함)

```javascript
// frontend/converter-engine.js Line 49
// BEFORE:
this.fetchFile = FFmpegLib.fetchFile;

// AFTER: (완전 제거)
```

**변경 4**: 파일 쓰기 API 변경

```javascript
// frontend/converter-engine.js Lines 914-915
// BEFORE:
this.ffmpeg.FS('writeFile', inputName, await this.fetchFile(file));

// AFTER:
const fileData = new Uint8Array(await file.arrayBuffer());
await this.ffmpeg.writeFile(inputName, fileData);
```

**변경 5**: 실행 API 변경

```javascript
// frontend/converter-engine.js Lines 920-921
// BEFORE:
await this.ffmpeg.run(...args);

// AFTER:
await this.ffmpeg.exec(args);
```

**변경 6**: 파일 읽기 API 변경

```javascript
// frontend/converter-engine.js Lines 925-926
// BEFORE:
const data = this.ffmpeg.FS('readFile', outputName);

// AFTER:
const data = await this.ffmpeg.readFile(outputName);
```

**변경 7**: Blob 생성 수정 (중요!)

```javascript
// frontend/converter-engine.js Line 929
// BEFORE:
const blob = new Blob([data.buffer], { type: this.getMimeType(outputFormat) });

// AFTER:
const blob = new Blob([data], { type: this.getMimeType(outputFormat) });
```

**이유**: `readFile()`은 Uint8Array를 반환하므로 `.buffer` 속성 사용하면 에러 발생

**변경 8**: 파일 삭제 API 변경

```javascript
// frontend/converter-engine.js Lines 933-935
// BEFORE:
this.ffmpeg.FS('unlink', inputName);
this.ffmpeg.FS('unlink', outputName);

// AFTER:
try {
    await this.ffmpeg.deleteFile(inputName);
    await this.ffmpeg.deleteFile(outputName);
} catch (cleanupError) {
    console.warn('파일 정리 중 오류 (무시):', cleanupError);
}
```

**변경 9**: FFmpeg 로그 이벤트 추가 (디버깅용)

```javascript
// frontend/converter-engine.js Lines 41-44
this.ffmpeg.on('log', ({ message }) => {
    console.log('[FFmpeg]', message);
});
```

**변경 10**: 파일 무결성 검증 로깅 추가 (선택사항)

```javascript
// frontend/converter-engine.js Lines 919-925
console.log(`[Debug] 원본 파일 크기: ${file.size} bytes (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
const fileData = new Uint8Array(await file.arrayBuffer());
console.log(`[Debug] Uint8Array 크기: ${fileData.byteLength} bytes (${(fileData.byteLength / 1024 / 1024).toFixed(2)} MB)`);
console.log(`[Debug] 데이터 무결성: 처음 4바이트 = ${Array.from(fileData.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
await this.ffmpeg.writeFile(inputName, fileData);
console.log(`[Debug] writeFile 완료: ${inputName}`);
```

**4단계: 캐시 무효화**

```html
<!-- frontend/index.html -->
<script src="/converter-engine.js?v=20251014l"></script>
```

버전 번호를 업데이트하여 브라우저 캐시 무효화

#### 발생 가능한 에러와 해결법

**에러 1**: `this.fetchFile is not a function`
- **원인**: 0.12.x에서 fetchFile API 제거됨
- **해결**: `fetchFile` 사용을 `new Uint8Array(await file.arrayBuffer())`로 변경

**에러 2**: `ErrnoError: FS error`
- **원인**: `data.buffer` 사용으로 인한 Blob 생성 실패
- **해결**: `new Blob([data.buffer], ...)` → `new Blob([data], ...)`

**에러 3**: `moov atom not found` (MP4 파일)
- **원인**: 파일 데이터 손상 또는 불완전한 전송
- **해결**: 파일 무결성 검증 로깅으로 원인 파악
- **확인**: 디버그 로그에서 원본 크기 = Uint8Array 크기 일치 여부 확인

**에러 4**: CORS 에러 또는 SharedArrayBuffer 사용 불가
- **원인**: nginx CORS 헤더 누락
- **해결**: nginx.conf에 COOP, COEP, CORP 헤더 추가

**에러 5**: FFmpeg 404 Not Found
- **원인**: CDN 파일 경로 오류 또는 파일 누락
- **해결**: 자체 호스팅으로 전환, 파일 경로 확인

#### 검증 방법

**1. nginx 헤더 확인**:
```bash
curl -I https://hqmx.net/lib/ffmpeg/ffmpeg.js | grep -i "cross-origin"
```

예상 출력:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: cross-origin
```

**2. FFmpeg.wasm 파일 존재 확인**:
```bash
ssh -i hqmx-ec2.pem ubuntu@54.242.63.16 \
  'ls -lh /var/www/html/lib/ffmpeg/'
```

예상 출력:
```
-rwxr-xr-x 1 www-data www-data  112K ffmpeg-core.js
-rwxr-xr-x 1 www-data www-data   31M ffmpeg-core.wasm
-rwxr-xr-x 1 www-data www-data  3.4K ffmpeg.js
-rwxr-xr-x 1 www-data www-data  2.7K 814.ffmpeg.js
```

**3. 브라우저 콘솔에서 FFmpeg 로딩 확인**:
```javascript
// 개발자 도구 콘솔에서 확인
[FFmpeg] load ffmpeg-core
[FFmpeg] imported ffmpeg and ffmpeg core successfully
// ✅ 에러 없이 로딩되면 성공
```

**4. 실제 변환 테스트**:
- 10MB 이상 비디오 파일 업로드
- 콘솔에서 FFmpeg 로그 확인:
  ```
  [FFmpeg] Duration: 00:00:08.09
  [FFmpeg] Stream #0:0: Video: h264, 1920x1080, 24fps
  [FFmpeg] frame=  193 fps= 38 q=-1.0 Lsize=    2445kB
  ```
- 변환 완료 후 다운로드 테스트

#### 테스트 결과 (2025-10-14)

**테스트 파일**: test.mp4 (9.96 MB, 8초, 1920x1080, 24fps)

**성공 지표**:
```
✅ 파일 무결성: 10443457 bytes (원본 = Uint8Array)
✅ MP4 서명: 00 00 00 18 (유효한 ftyp atom)
✅ FFmpeg 실행: 193 프레임 처리
✅ 진행률 추적: 5% → 10% → ... → 100%
✅ 출력 파일: test.avi (2.4 MB, 2445 kb/s)
✅ 파일 재생: ffmpeg -i로 검증 완료
```

**성능**:
- FFmpeg 로딩: ~3초
- 변환 시간: ~5초 (10MB 파일)
- 총 소요 시간: ~8초

#### API 버전 비교표

| 작업 | 0.11.x (구버전) | 0.12.x (신버전) |
|------|----------------|----------------|
| 파일 쓰기 | `FS('writeFile', name, data)` | `await writeFile(name, data)` |
| 파일 읽기 | `FS('readFile', name)` | `await readFile(name)` |
| 파일 삭제 | `FS('unlink', name)` | `await deleteFile(name)` |
| 실행 | `run(...args)` | `exec(args)` |
| 파일 변환 | `fetchFile(file)` | `new Uint8Array(await file.arrayBuffer())` |
| 반환 타입 | Uint8Array with buffer | Uint8Array (직접 사용) |

#### 주의사항

1. **Blob 생성 시**: `data.buffer` 사용 금지, `data` 직접 사용
2. **모든 파일 작업**: 0.12.x에서는 `await` 필수
3. **fetchFile 제거**: 더 이상 제공되지 않음
4. **SharedArrayBuffer**: COOP, COEP, CORP 헤더 필수
5. **파일 크기**: 31MB WASM 파일로 인한 초기 로딩 시간 있음
6. **브라우저 호환성**: Chrome 90+, Firefox 88+, Safari 15+

#### 참고 자료

- FFmpeg.wasm 공식 문서: https://ffmpegwasm.netlify.app/docs/getting-started/usage
- FFmpeg.wasm 0.12.x API: https://github.com/ffmpegwasm/ffmpeg.wasm/tree/main
- Self-hosting 가이드: https://ffmpegwasm.netlify.app/docs/getting-started/installation#self-host

### 백엔드 (EC2 기반) - 대용량 파일 전용 ⚠️

**플랫폼**: AWS EC2 (t3.small spot instance)

**구성**:
- **nginx**: 정적 파일 서빙 + 리버스 프록시
- **FFmpeg**: 서버 사이드 변환
- **pm2**: Node.js API 프로세스 관리

**역할**:
- 100-2500MB 대용량 파일 변환 (전체 트래픽의 5%)
- 스트리밍 방식 처리 (메모리 효율)
- 1시간 임시 파일 자동 삭제

**제한사항**:
- 2.5GB 하드 제한 (nginx body size)
- 동시 변환 1-2개 (메모리 제약)

### SEO 및 다국어 시스템

**변환 페이지 SEO** (generate-pages.js):
- `/jpg-to-png.html`, `/mp4-to-avi.html` 등 개별 페이지
- 템플릿 기반 자동 생성 (conversions.json)
- Open Graph, Twitter Card 메타 태그

**다국어 SEO** (nginx + i18n.js):
- nginx URL rewrite: `/es/` → `/index.html?lang=es`
- i18n.js 동적 번역 로딩: `/locales/es.json`
- SEO 완벽 지원: 각 언어 URL이 별도 페이지로 인식
- hreflang 태그: `index.html`에 이미 설정됨

## 💰 비용 분석 및 최적화 (월 10,000회 변환 기준)

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
# SSH 연결 (Elastic IP)
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.21.183.81

# PEM 파일 권한 설정 (필요시)
chmod 400 /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem
```

#### SCP 파일 전송
```bash
# 로컬 -> 서버 파일 전송
scp -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem -r frontend/ ubuntu@23.21.183.81:~/

# 서버 -> 로컬 파일 다운로드
scp -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.21.183.81:~/backup.tar.gz ./
```

#### 서버에서 Git 동기화
```bash
# 서버에서 최신 코드 받기 (GitHub에서)
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.21.183.81 'cd ~/hqmx && git pull origin main'

# 서버에서 Git 상태 확인
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.21.183.81 'cd ~/hqmx && git status'

# 서버에서 원격 저장소 확인
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.21.183.81 'cd ~/hqmx && git remote -v'
```

#### 서버 상태 확인
```bash
# 웹 서버 상태 확인
curl -I https://hqmx.net

# 서버 포트 확인
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.21.183.81 'sudo netstat -tlnp'

# 디스크 사용량 확인
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.21.183.81 'df -h'
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
  frontend/style.css frontend/index.html ubuntu@23.21.183.81:/tmp/

# 2. 서버에서 nginx root로 이동 및 권한 설정
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.21.183.81 \
  'sudo cp /tmp/style.css /tmp/index.html /var/www/html/ && \
   sudo chown www-data:www-data /var/www/html/style.css /var/www/html/index.html && \
   sudo chmod 755 /var/www/html/style.css /var/www/html/index.html'

# 3. nginx reload
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.21.183.81 \
  'sudo nginx -t && sudo systemctl reload nginx'
```

**배포 스크립트 사용 (권장):**
```bash
./deploy-to-ec2.sh
```

**nginx 설정 확인:**
```bash
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.21.183.81 \
  'sudo nginx -T 2>/dev/null | grep "root\|server_name"'
```

### 백엔드 API 배포 (100-200MB 대용량 파일용)
```bash
# 백엔드 API 서버 재시작 (권장)
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.21.183.81 \
  'cd ~/hqmx/backend && pm2 restart hqmx-backend'

# 또는 처음 시작 (⚠️ src/server.js 사용, src/index.js 아님!)
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.21.183.81 \
  'cd ~/hqmx/backend && npm install && pm2 start src/server.js --name hqmx-backend'

# 백엔드 로그 확인
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.21.183.81 \
  'pm2 logs hqmx-backend'

# PM2 프로세스 상태 확인
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.21.183.81 \
  'pm2 list'
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
1. `frontend/locales/` 디렉토리에 새 언어 JSON 파일 생성 (예: `vi.json`)
2. `frontend/i18n.js`의 `supportedLangs` 배열에 언어 코드 추가
3. nginx 설정에 언어 코드 추가 (`/etc/nginx/sites-available/hqmx.net`)
4. HTML 요소에 `data-i18n-key` 속성 사용하여 번역 가능하게 마크업

**참고**: 물리적 언어별 페이지 생성은 불필요합니다. nginx rewrite가 자동 처리합니다.

### 스타일 수정
- `frontend/style.css`에서 테마 및 UI 스타일 수정
- CSS 변수를 활용한 테마 커스터마이징

## 핵심 파일 구조

### 프론트엔드 주요 파일
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

### Feature Flags 시스템 (feature-flags.js)

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

## SEO 최적화 시스템

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

**사용 명령어**:
```bash
cd frontend/_scripts
node generate-pages.js
```

## 다국어 시스템 (nginx + i18n.js)

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

### ✅ 전체 페이지 생성 결정 (289개)

**결정일**: 2025-10-15

**결정 이유**:
1. **사용자 경험 일관성**: 289개 HTML 페이지를 생성하면서 54개만 작동하면 나쁜 UX
2. **SEO 신뢰도**: 모든 페이지가 실제로 작동해야 검색엔진 신뢰도 유지
3. **기술적 준비**: FFmpeg.wasm과 Canvas API가 이미 대부분 변환 지원
4. **완전한 시스템**: 289개 HTML + 289개 conversions.json + 289개 테스트

**289개 변환 분류**:
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

**지원 형식**:
```javascript
image: ['jpg', 'png', 'webp', 'heic', 'gif', 'svg', 'bmp', 'ico', 'avif']  // 9개
video: ['mp4', 'mov', 'mkv', 'flv', 'wmv', 'webm', 'avi', 'm4v']           // 8개
audio: ['mp3', 'm4a', 'flac', 'ogg', 'aac', 'wma', 'wav', 'opus']          // 8개
document: ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'txt']      // 8개
```

**생성 절차**:
```bash
# 1단계: conversions.json 생성 (289개 항목)
cd frontend/_scripts
node generate-all-conversions.js

# 2단계: HTML 페이지 생성 (289개)
node generate-pages.js

# 3단계: 전체 테스트 (선택사항, 2-3시간 소요)
cd ../..
node test-comprehensive.js

# 4단계: 서버 배포
./deploy-to-ec2.sh
```

**테스트 계획**:
- **전체 테스트 시간**: 약 2-3시간 (289개 × 30초 평균)
- **프록시 로테이션**: 무료 프록시로 IP 분산
- **배치 테스트**: 카테고리별로 나눠서 테스트 가능
- **진행 상황 저장**: 중단 시 이어서 테스트 가능 (향후 기능)

**예상 테스트 결과**:
- **이미지 변환**: ~100% 성공 (Canvas API 지원)
- **비디오/오디오 변환**: ~95% 성공 (FFmpeg.wasm 지원)
- **문서 변환**: ~70% 성공 (일부 형식 제한)
- **크로스 카테고리**: ~80% 성공 (특수 처리 필요)

---

## 📚 개발 히스토리

### 백엔드 변환 엔진 구현 (2025-10-09 → 2025-10-15)

**플랫폼 전환**:
- **초기 (2025-10-09)**: Cloudflare Workers 기반 (제약: 30초 CPU, 128MB 메모리)
- **현재 (2025-10-15)**: AWS EC2 기반 (Sharp + fluent-ffmpeg)
- **이유**: Native 모듈(Sharp, FFmpeg) 사용 필요

**구현 변경사항**:
- PDF 변환: pdf-lib → Sharp/LibreOffice
- 이미지 변환: Canvas API → Sharp (libvips)
- 비디오/오디오: FFmpeg.wasm → fluent-ffmpeg

## 🔨 백엔드 변환 엔진 (Backend Conversion Engine)

### 개요
Sharp와 fluent-ffmpeg 기반의 실제 서버 사이드 변환 엔진 구현 완료.
시뮬레이션 코드를 실제 작동하는 변환 로직으로 교체하였으며, EC2 서버에서 정상 작동 확인.

### 플랫폼 변경사항
- **기존**: Cloudflare Workers (제약 많음)
- **현재**: AWS EC2 (t3.small, 2GB RAM)
- **이유**: Sharp와 FFmpeg는 Node.js native 모듈이므로 EC2 환경 필수

### 구현된 변환기

#### 1. ImageConverter (Sharp 기반) ✅ 완료
**파일**: `backend/src/utils/converters/image-converter.js`

**기술 스택**:
- **Sharp v0.33.0**: libvips 기반 고성능 이미지 처리
- **지원 형식**: JPG, PNG, GIF, WebP, BMP, AVIF, HEIC, SVG

**구현 방식**:
- 파일 경로 기반 처리 (ArrayBuffer 방식에서 변경)
- `inputPath`와 `outputPath`를 settings에서 받아 처리
- 실시간 진행률 업데이트 (10% → 30% → 50% → 70% → 90% → 100%)

**주요 기능**:
```javascript
async convert() {
  const inputPath = this.settings.inputPath;
  const outputPath = this.settings.outputPath;

  // Sharp 인스턴스 생성
  let image = sharp(inputPath);

  // 메타데이터 확인
  const metadata = await image.metadata();

  // 리사이즈 처리 (optional)
  if (this.settings.resize && this.settings.resize !== 'none') {
    image = this.applyResize(image, metadata, this.settings.resize);
  }

  // 형식별 변환 및 품질 설정
  image = this.applyOutputFormat(image);

  // 파일 저장
  await image.toFile(outputPath);
}
```

**품질 설정**:
- JPG: mozjpeg 압축, quality 1-100
- PNG: compressionLevel 0-9 자동 계산
- WebP: quality 1-100
- AVIF: quality 1-100

#### 2. VideoConverter (fluent-ffmpeg 기반) ✅ 완료
**파일**: `backend/src/utils/converters/video-converter.js`

**기술 스택**:
- **fluent-ffmpeg v2.1.3**: FFmpeg 래퍼
- **시스템 FFmpeg v6.1.1**: EC2에 설치됨

**지원 형식**: MP4, AVI, MOV, MKV, WebM, FLV, WMV, M4V

**구현 방식**:
```javascript
async convertWithFFmpeg(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath);

    // 출력 형식 설정
    command = command.toFormat(this.outputFormat);

    // 품질 설정 (CRF)
    if (this.settings.quality) {
      const crfMap = { high: 18, medium: 23, low: 28 };
      const crf = crfMap[this.settings.quality] || 23;
      command = command.videoCodec('libx264').outputOptions([`-crf ${crf}`]);
    }

    // 진행률 콜백
    command.on('progress', (progress) => {
      if (progress.percent) {
        const percent = Math.min(95, Math.max(40, Math.round(progress.percent)));
        this.updateProgress(percent, `변환 진행 중... ${percent}%`);
      }
    });

    command.save(outputPath);
  });
}
```

**품질 옵션**:
- high: CRF 18 (최고 품질, 큰 파일)
- medium: CRF 23 (기본값, 균형)
- low: CRF 28 (낮은 품질, 작은 파일)

#### 3. AudioConverter (fluent-ffmpeg 기반) ✅ 완료
**파일**: `backend/src/utils/converters/audio-converter.js`

**지원 형식**: MP3, WAV, FLAC, AAC, OGG, M4A, WMA, Opus

**구현 방식**:
- VideoConverter와 동일한 구조
- 오디오 전용 옵션: audioQuality(), audioBitrate(), audioFrequency(), audioChannels()

**설정 옵션**:
- quality: high (q=0), medium (q=2), low (q=4)
- bitrate: 32-320 kbps
- sampleRate: 44100, 48000, 96000
- channels: mono, stereo

### 의존성 및 환경

#### package.json 업데이트
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "multer": "^1.4.5-lts.1",
    "fluent-ffmpeg": "^2.1.2",
    "sharp": "^0.33.0",           // NEW: 이미지 변환
    "uuid": "^9.0.0",
    "express-rate-limit": "^7.1.5"
  }
}
```

#### EC2 서버 환경
- **OS**: Ubuntu 24.04 LTS
- **Node.js**: v20.19.5
- **FFmpeg**: 6.1.1-3ubuntu5
- **RAM**: 2GB (t3.small)
- **디스크**: 20GB EBS gp3

### 테스트 결과 (2025-10-15)

#### PNG → JPG 변환 테스트 ✅ 성공
**테스트 파일**: frontend/assets/apple-touch-icon.png (18.4 KB)

**결과**:
```
원본: 18,433 bytes (180x180 PNG)
변환: 4,358 bytes (180x180 JPG, quality 85)
압축률: 76.3% (18KB → 4KB)
변환 시간: ~1초
```

**서버 로그 (상세)**:
```
[ImageConverter] ========== 변환 시작 ==========
[ImageConverter] inputFormat: png
[ImageConverter] outputFormat: jpg
[ImageConverter] inputPath: /tmp/converter/uploads/9b9b7537-ca05-4592-883f-0970f76760df-apple-touch-icon.png
[ImageConverter] outputPath: /tmp/converter/outputs/9b9b7537-ca05-4592-883f-0970f76760df.jpg
[ImageConverter] Sharp 인스턴스 생성 중...
[ImageConverter] Sharp 인스턴스 생성 완료
[ImageConverter] 메타데이터 읽기 중...
[ImageConverter] 원본 이미지: 180x180, format: png
[ImageConverter] 출력 형식 적용 중: jpg
[ImageConverter] 출력 형식 적용 완료
[ImageConverter] 파일 저장 시작: /tmp/converter/outputs/9b9b7537-ca05-4592-883f-0970f76760df.jpg
[ImageConverter] 파일 저장 완료: {
  format: 'jpeg',
  width: 180,
  height: 180,
  channels: 3,
  premultiplied: false,
  size: 4358
}
[ImageConverter] ========== 변환 완료 ==========
[Queue] Job 9b9b7537-ca05-4592-883f-0970f76760df completed successfully
[Download] File downloaded: 9b9b7537-ca05-4592-883f-0970f76760df
```

### ConverterFactory 수정사항

#### 문제점 해결
1. **DocumentConverter 미구현 문제**:
   - 원인: import 구문은 있으나 파일이 존재하지 않음
   - 해결: 주석 처리
   ```javascript
   // import { DocumentConverter } from './converters/document-converter.js'; // TODO: 구현 필요
   // import { LibreOfficeConverter } from './converters/libreoffice-converter.js'; // TODO: 구현 필요
   ```

2. **출력 파일 자동 삭제 문제**:
   - 원인: finally 블록에서 outputPath 삭제
   - 해결: 입력 파일만 삭제, 출력 파일은 Cron job이 1시간 후 삭제
   ```javascript
   finally {
     // 입력 파일만 정리 (출력 파일은 다운로드 후 Cron job이 삭제)
     try {
       await fs.unlink(inputPath).catch(() => {});
     } catch (err) {
       console.error('[VideoConverter] 임시 파일 정리 실패:', err);
     }
   }
   ```

### 배포 절차

#### 1. 로컬에서 백엔드 압축
```bash
cd backend
tar -czf ../backend-v{version}.tar.gz --exclude=node_modules .
```

#### 2. EC2 업로드
```bash
scp -i hqmx-ec2.pem backend-v{version}.tar.gz ubuntu@54.242.63.16:/tmp/
```

#### 3. EC2에서 추출 및 의존성 설치
```bash
ssh -i hqmx-ec2.pem ubuntu@54.242.63.16
cd ~/hqmx/backend
tar -xzf /tmp/backend-v{version}.tar.gz
npm install  # Sharp 설치 포함
```

#### 4. pm2 재시작
```bash
pm2 restart hqmx-backend
pm2 logs hqmx-backend --lines 50
```

### 트러블슈팅 가이드

#### 문제 1: Sharp 패키지 없음
**증상**: `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'sharp'`
**원인**: npm install 누락
**해결**: `cd ~/hqmx/backend && npm install`

#### 문제 2: 출력 파일 404 에러
**증상**: Job completed successfully 로그는 있지만 다운로드 시 404
**원인**:
- outputPath가 잘못 설정됨
- finally 블록에서 파일이 삭제됨
- Sharp.toFile()이 실제로 실행되지 않음
**해결**:
- inputPath/outputPath를 settings에서 정확히 전달
- finally 블록 수정 (outputPath 삭제 제거)
- 상세 로그로 실행 흐름 추적

#### 문제 3: Module Not Found (DocumentConverter)
**증상**: 모듈 로딩 실패
**원인**: 존재하지 않는 파일 import
**해결**: converter-factory.js에서 미구현 converter import 주석 처리

### 다음 단계

#### 추가 테스트 필요
- [ ] 비디오 변환 테스트 (MP4 → AVI)
- [ ] 오디오 변환 테스트 (MP3 → WAV)
- [ ] 대용량 파일 테스트 (100MB+)
- [ ] 동시 변환 테스트 (큐 시스템)

#### 추가 구현 필요
- [ ] DocumentConverter (PDF ↔ 이미지)
- [ ] LibreOfficeConverter (DOC/XLSX → PDF)
- [ ] 크로스 카테고리 변환 (비디오 → GIF)

#### 최적화 필요
- [ ] Sharp 프로세스 풀 (메모리 효율)
- [ ] FFmpeg 프리셋 최적화 (속도 vs 품질)
- [ ] 진행률 정확도 개선 (FFmpeg 로그, 및 기타 컨버터의 로그 파싱)