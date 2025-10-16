# HQMX Converter - 개발 히스토리 및 트러블슈팅

## 📅 주요 개발 마일스톤

### 백엔드 변환 엔진 구현 (2025-10-09 → 2025-10-15)

**플랫폼 전환**:
- **초기 (2025-10-09)**: Cloudflare Workers 기반 (제약: 30초 CPU, 128MB 메모리)
- **현재 (2025-10-15)**: AWS EC2 기반 (Sharp + fluent-ffmpeg)
- **이유**: Native 모듈(Sharp, FFmpeg) 사용 필요

**구현 변경사항**:
- PDF 변환: pdf-lib → Sharp/LibreOffice
- 이미지 변환: Canvas API → Sharp (libvips)
- 비디오/오디오: FFmpeg.wasm → fluent-ffmpeg

### FFmpeg.wasm 자체 호스팅 전환 (2025-10-14)

**문제**: 외부 CDN(unpkg.com) 불안정으로 인한 변환 실패
- 10MB 이상 파일 변환 실패
- CORS 헤더 누락
- API 버전 불일치

**해결책**:
- FFmpeg.wasm 파일 자체 호스팅 (`/lib/ffmpeg/`)
- nginx CORS 헤더 추가
- API 0.11.x → 0.12.x 마이그레이션

**결과**:
- ✅ 10MB+ 파일 변환 성공
- ✅ 안정적인 파일 로딩
- ✅ 진행률 추적 개선

### MAX_CONCURRENCY 최적화 (2025-10-17)

**배경**: t3.medium 인스턴스에 무제한 모드 활성화
- CPU 크레딧 제약 제거
- 메모리가 유일한 제약 (4GB RAM)

**최적화**:
- MAX_CONCURRENCY: 2 → 4
- 동시 처리 능력 2배 증가
- 4GB RAM / ~1GB per job = 4 concurrent jobs

---

## 🐛 트러블슈팅 가이드

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
scp -i hqmx-ec2.pem -r frontend/lib/ffmpeg/ ubuntu@23.21.183.81:/tmp/
ssh -i hqmx-ec2.pem ubuntu@23.21.183.81 \
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

**주요 API 변경사항**:

| 작업 | 0.11.x (구버전) | 0.12.x (신버전) |
|------|----------------|----------------|
| 파일 쓰기 | `FS('writeFile', name, data)` | `await writeFile(name, data)` |
| 파일 읽기 | `FS('readFile', name)` | `await readFile(name)` |
| 파일 삭제 | `FS('unlink', name)` | `await deleteFile(name)` |
| 실행 | `run(...args)` | `exec(args)` |
| 파일 변환 | `fetchFile(file)` | `new Uint8Array(await file.arrayBuffer())` |
| 반환 타입 | Uint8Array with buffer | Uint8Array (직접 사용) |

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
ssh -i hqmx-ec2.pem ubuntu@23.21.183.81 \
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

#### 주의사항

1. **Blob 생성 시**: `data.buffer` 사용 금지, `data` 직접 사용
2. **모든 파일 작업**: 0.12.x에서는 `await` 필수
3. **fetchFile 제거**: 더 이상 제공되지 않음
4. **SharedArrayBuffer**: COOP, COEP, CORP 헤더 필수
5. **파일 크기**: 31MB WASM 파일로 인한 초기 로딩 시간 있음
6. **브라우저 호환성**: Chrome 90+, Firefox 88+, Safari 15+

---

### 백엔드 테스트 결과

#### PNG → JPG 변환 테스트 ✅ 성공 (2025-10-15)
**테스트 파일**: frontend/assets/apple-touch-icon.png (18.4 KB)

**결과**:
```
원본: 18,433 bytes (180x180 PNG)
변환: 4,358 bytes (180x180 JPG, quality 85)
압축률: 76.3% (18KB → 4KB)
변환 시간: ~1초
```

**서버 로그 (주요 부분)**:
```
[ImageConverter] Sharp 인스턴스 생성 완료
[ImageConverter] 원본 이미지: 180x180, format: png
[ImageConverter] 출력 형식 적용 완료
[ImageConverter] 파일 저장 완료: {
  format: 'jpeg',
  width: 180,
  height: 180,
  size: 4358
}
```

---

### 반복되는 배포 에러 해결

#### 에러 1: Module Not Found - document-converter.js
**증상**:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/ubuntu/hqmx/backend/src/utils/converters/document-converter.js'
```
**원인**: Git pull이 주석 처리된 import를 복원
**해결**: 배포 스크립트에 자동 주석 처리 추가
```bash
sed -i "s/^import { DocumentConverter } from/\/\/ import { DocumentConverter } from/" src/utils/converter-factory.js
```

#### 에러 2: Export Mismatch - downloadHandler
**증상**:
```
SyntaxError: The requested module './handlers/download.js' does not provide an export named 'downloadHandler'
```
**원인**: Git pull이 named export를 default export로 변경
**해결**: 배포 스크립트에 자동 수정 추가
```bash
sed -i "s/export default downloadHandler;/export { downloadHandler };/" src/handlers/download.js
```

---

## 💰 광고 수익화 (Monetization)

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

#### 2. Interstitials 광고 (전면 광고)
- **광고 키**: `dfdeb4497c2530e9cc7c6c5a9e33f754`
- **표시 시점**: "Start Conversion" 버튼 클릭 시
- **동작**: 광고 표시 → 2초 지연 → 변환 시작
- **파일**: `index.html:595-596`, `script.js:759-802`

#### 3. Anti-Adblock Popunder
- **광고 키**: `a5b0d31831c41ea6968b77517c884ff0`
- **표시 시점**: 페이지 로드 시 및 클릭 시 (백그라운드)
- **특징**: Adblock 우회 기능
- **파일**: `index.html:598-599`

### Propeller Ads
- **소유권 확인 파일**: `/var/www/html/sw.js` (156B)
- **⚠️ 중요**: 이 파일은 Propeller Ads 소유권 확인용이므로 **절대 삭제 금지**

### 광고 수익 예상 (월 10,000명 방문 기준)
| 광고 유형 | 노출/클릭 | CPM/CPC | 월 수익 예상 |
|----------|-----------|---------|-------------|
| Banner (728x90) | 8,000 노출 | $2 CPM | $16 |
| Interstitials | 5,000 노출 | $3 CPM | $15 |
| Popunder | 3,000 클릭 | $5 CPM | $15 |
| **총 월 수익** | | | **$46** |

**트래픽 10배 증가 시**: 월 100,000명 = **$460/월**

---

## 💸 비용 분석 및 최적화 (월 10,000회 변환 기준)

### 월간 운영 비용 상세
| 항목 | 규격 | 가격 | 비용 |
|------|------|------|------|
| EC2 Compute | t3.medium spot (70% 할인) | $0.0062/시간 | $4.55 |
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

#### 3. 파일 크기 제한 (2.5GB)
- t3.medium (4GB RAM)로 안정적 처리 가능 범위
- 메모리 부족(OOM) 방지
- nginx body size: 2.5GB 제한
- 1시간 자동 정리로 스토리지 최소화

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
  - t3.medium → t3.large
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

---

## 🔨 구현 완료 항목

### ✅ 전체 페이지 생성 (289개) - 2025-10-15

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

---

## 📝 추가 구현 필요 항목

### 추가 테스트 필요
- [ ] 비디오 변환 테스트 (MP4 → AVI)
- [ ] 오디오 변환 테스트 (MP3 → WAV)
- [ ] 대용량 파일 테스트 (100MB+)
- [ ] 동시 변환 테스트 (큐 시스템)

### 추가 구현 필요
- [ ] DocumentConverter (PDF ↔ 이미지)
- [ ] LibreOfficeConverter (DOC/XLSX → PDF)
- [ ] 크로스 카테고리 변환 (비디오 → GIF)

### 최적화 필요
- [ ] Sharp 프로세스 풀 (메모리 효율)
- [ ] FFmpeg 프리셋 최적화 (속도 vs 품질)
- [ ] 진행률 정확도 개선 (FFmpeg 로그 파싱)

---

## 🚀 미래 계획 (universal.md 참조)

- **Next.js 전환**: 현재 HTML/JS/CSS 구조에서 Next.js 14 App Router로 이전 계획
- **동적 SEO 라우팅**: /jpg-to-pdf 같은 SEO 최적화 URL 구조
- **유니버설 변환기**: 하나의 통합 엔진으로 모든 형식 지원
- **우선순위 형식**: PDF↔Word, YouTube→MP3, JPG↔PDF 등 검색량 기준 구현
