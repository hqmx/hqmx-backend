# 🔧 Dropbox & Google Drive 연동 가이드

> **최종 업데이트**: 2025-10-14
> **현재 상태**: ⚠️ COEP 헤더 충돌로 인한 Dropbox 차단, Google Drive API Key 누락

---

## 🚨 현재 문제 및 근본 원인

### 1. Dropbox Chooser API 차단
**에러**: `ERR_BLOCKED_BY_RESPONSE.NotSameOriginAfterDefaultedToSameOriginByCoep`

**근본 원인**:
- FFmpeg.wasm을 위해 nginx에 `Cross-Origin-Embedder-Policy: require-corp` 헤더 설정
- 이 헤더가 Dropbox API 스크립트를 차단함
- Dropbox CDN이 `Cross-Origin-Resource-Policy` 헤더를 반환하지 않음

**해결 방법**:
✅ nginx 설정에서 `Cross-Origin-Embedder-Policy: credentialless` 사용
(Safari 제외 모든 브라우저 지원, FFmpeg.wasm도 정상 작동)

### 2. Google Drive API Key 누락
**증상**: gapi.client 초기화 실패, 버튼 비활성화

**근본 원인**:
- API Key가 설정되지 않음
- `gapi.client.init()`가 API Key 없이 실행 불가

**해결 방법**:
✅ Google Cloud Console에서 API Key 생성 및 제한 설정 필요

---

## 📋 Dropbox Chooser API 설정 체크리스트

### A. Dropbox App 생성 및 설정

- [x] **A1. Dropbox Developer Portal 접속**
  - URL: https://www.dropbox.com/developers/apps
  - 로그인 완료

- [x] **A2. Create App 클릭**
  - "Scoped access" 선택
  - "App folder" 또는 "Full Dropbox" 선택
  - App 이름: `HQMX-Converter`

- [x] **A3. App Key 발급**
  - **App Key**: `xfuwomiskerr8by` (이미 발급됨)
  - Settings 탭에서 확인

- [x] **A4. Chooser Domains 등록**
  - Settings → Chooser / Saver / Embedder domains
  - 추가할 도메인:
    ```
    https://hqmx.net
    https://hqmx.net/*
    ```
  - ⚠️ `http://localhost`는 Dropbox가 지원하지 않음 (HTTPS 필수)

### B. 프론트엔드 구현

- [x] **B1. Dropbox SDK 스크립트 추가**
  - `frontend/index.html`의 `</body>` 직전에 추가됨:
    ```html
    <script type="text/javascript"
            src="https://www.dropbox.com/static/api/2/dropins.js"
            id="dropboxjs"
            data-app-key="xfuwomiskerr8by"
            crossorigin="anonymous"></script>
    ```
  - ⚠️ `crossorigin="anonymous"` 속성 필수 (COEP 호환성)

- [x] **B2. Dropbox 버튼 HTML 추가**
  - `frontend/index.html`에 버튼 추가됨

- [x] **B3. JavaScript 이벤트 핸들러 구현**
  - `frontend/script.js`에 Dropbox Chooser 로직 구현됨
  - 파일 선택 → Blob 변환 → addFile() 호출

- [x] **B4. CSS 스타일 추가**
  - `frontend/style.css`에 `.dropbox-btn` 스타일 추가됨

### C. 서버 설정 (nginx)

- [ ] **C1. COEP 헤더를 credentialless로 변경** ⚠️ **필수 작업**
  - `/etc/nginx/nginx.conf` 수정 필요:
    ```nginx
    # 변경 전 (현재)
    add_header Cross-Origin-Embedder-Policy "require-corp" always;

    # 변경 후 (권장)
    add_header Cross-Origin-Embedder-Policy "credentialless" always;
    ```
  - Safari 제외 모든 브라우저 지원
  - FFmpeg.wasm 정상 작동
  - Dropbox/Google Drive API 정상 작동

- [ ] **C2. nginx 재시작**
  ```bash
  ssh -i hqmx-ec2.pem ubuntu@54.242.63.16 'sudo nginx -t && sudo systemctl reload nginx'
  ```

- [ ] **C3. 브라우저 캐시 클리어 후 테스트**

---

## 📋 Google Drive Picker API 설정 체크리스트

### A. Google Cloud Console 프로젝트 생성

- [x] **A1. Google Cloud Console 접속**
  - URL: https://console.cloud.google.com
  - 로그인 완료

- [x] **A2. 프로젝트 생성**
  - 프로젝트 이름: "HQMX-Converter"
  - 프로젝트 ID: 자동 생성됨

- [x] **A3. 프로젝트 선택**
  - 좌측 상단에서 프로젝트 선택 확인

### B. API 활성화

- [x] **B1. Google Picker API 활성화**
  - APIs & Services → Library → "Google Picker API" 검색
  - "사용 설정" 클릭

- [x] **B2. Google Drive API 활성화**
  - APIs & Services → Library → "Google Drive API" 검색
  - "사용 설정" 클릭 (이미 활성화됨)

### C. OAuth 2.0 클라이언트 ID 생성

- [x] **C1. OAuth 동의 화면 설정**
  - APIs & Services → OAuth 동의 화면
  - "외부" 선택 → 앱 정보 입력

- [x] **C2. OAuth 클라이언트 ID 생성**
  - APIs & Services → 사용자 인증 정보 → "사용자 인증 정보 만들기"
  - "OAuth 클라이언트 ID" 선택
  - 애플리케이션 유형: "웹 애플리케이션"
  - 이름: "HQMX Converter Web Client"
  - **승인된 JavaScript 원본**:
    ```
    https://hqmx.net
    http://localhost:3000
    ```
  - **승인된 리디렉션 URI**: 비워둠 (Picker는 필요 없음)

- [x] **C3. Client ID 복사**
  - **Client ID**: `280998173097-ffdh6ft1kujjcn5kp9md1p6mso17cvpj.apps.googleusercontent.com`
  - `frontend/script.js`에 이미 적용됨

### D. API Key 생성 및 제한 설정

- [ ] **D1. API Key 생성** ⚠️ **필수 작업**
  - APIs & Services → 사용자 인증 정보
  - "사용자 인증 정보 만들기" → "API 키" 클릭
  - API Key 복사 (예: `AIzaSyXXXXXXXXXXXXXXXXXXXXXX`)

- [ ] **D2. API Key 제한 설정 (권장)**
  - 생성된 API Key 옆의 연필 아이콘 클릭
  - **애플리케이션 제한사항**: "HTTP 리퍼러(웹사이트)" 선택
  - **웹사이트 제한사항** 추가:
    ```
    https://hqmx.net/*
    http://localhost:3000/*
    ```
  - **API 제한사항**: "키 제한" 선택
    - Google Drive API
    - Google Picker API
  - "저장" 클릭

- [ ] **D3. script.js에 API Key 추가**
  - `frontend/script.js` 파일에서 다음 라인 수정:
    ```javascript
    // 현재 (누락)
    const GOOGLE_API_KEY = ''; // ❌ 비어있음

    // 변경 후
    const GOOGLE_API_KEY = 'YOUR_GENERATED_API_KEY'; // ✅ D1에서 생성한 키
    ```

### E. 프론트엔드 구현

- [x] **E1. Google API 스크립트 추가**
  - `frontend/index.html`에 추가됨:
    ```html
    <script src="https://apis.google.com/js/api.js"></script>
    <script src="https://accounts.google.com/gsi/client"></script>
    ```

- [x] **E2. Google Drive 버튼 HTML 추가**
  - `frontend/index.html`에 버튼 추가됨

- [x] **E3. JavaScript 구현**
  - `frontend/script.js`에 Google Drive Picker 로직 구현됨
  - OAuth 2.0 토큰 관리 구현됨
  - gapi.client 초기화 구현됨

- [x] **E4. CSS 스타일 추가**
  - `frontend/style.css`에 `.google-drive-btn` 스타일 추가됨

---

## 🔐 보안 권장사항

### 방법 1: 별도 설정 파일 생성 (권장)

**`frontend/config.js` 파일 생성**:
```javascript
// Git에 커밋하지 말 것!
const CONFIG = {
    DROPBOX_APP_KEY: 'xfuwomiskerr8by',
    GOOGLE_API_KEY: 'YOUR_API_KEY_HERE',  // D1에서 생성한 키
    GOOGLE_CLIENT_ID: '280998173097-ffdh6ft1kujjcn5kp9md1p6mso17cvpj.apps.googleusercontent.com'
};
```

**`.gitignore`에 추가**:
```bash
# frontend/.gitignore
config.js
*.key
*.secret
```

**`frontend/index.html`에서 로드**:
```html
<script src="/config.js"></script>
<script src="/script.js"></script>
```

**`frontend/script.js`에서 사용**:
```javascript
const GOOGLE_API_KEY = CONFIG.GOOGLE_API_KEY;
const GOOGLE_CLIENT_ID = CONFIG.GOOGLE_CLIENT_ID;
```

### 방법 2: 직접 script.js에 하드코딩 (간단하지만 덜 안전)

API Key는 클라이언트 사이드에서 사용되므로 어차피 노출됩니다.
대신 **API Key 제한 설정**으로 보안을 강화하세요 (D2 참조).

---

## ✅ 현재 상태 분석

### Dropbox

| 항목 | 상태 | 설명 |
|------|------|------|
| App 생성 | ✅ 완료 | `xfuwomiskerr8by` |
| Domain 등록 | ✅ 완료 | `https://hqmx.net` |
| SDK 스크립트 | ✅ 완료 | `crossorigin="anonymous"` 추가됨 |
| 버튼 UI | ✅ 완료 | HTML/CSS 구현됨 |
| JavaScript 로직 | ✅ 완료 | 이벤트 핸들러 구현됨 |
| **COEP 헤더 수정** | ❌ **미완료** | nginx에서 `credentialless`로 변경 필요 |
| 프로덕션 배포 | ⏳ 대기 | COEP 수정 후 배포 |
| 실제 테스트 | ⏳ 대기 | COEP 수정 후 테스트 |

### Google Drive

| 항목 | 상태 | 설명 |
|------|------|------|
| 프로젝트 생성 | ✅ 완료 | "HQMX-Converter" |
| Picker API 활성화 | ✅ 완료 | 사용 설정됨 |
| Drive API 활성화 | ✅ 완료 | 사용 설정됨 |
| OAuth Client ID | ✅ 완료 | `280998173097-...` |
| **API Key 생성** | ❌ **미완료** | 생성 후 script.js에 추가 필요 |
| API Key 제한 | ⏳ 대기 | API Key 생성 후 설정 |
| 스크립트 로드 | ✅ 완료 | gapi, GIS 로드됨 |
| 버튼 UI | ✅ 완료 | HTML/CSS 구현됨 |
| JavaScript 로직 | ✅ 완료 | OAuth 토큰 관리 구현됨 |
| 프로덕션 배포 | ⏳ 대기 | API Key 추가 후 배포 |
| 실제 테스트 | ⏳ 대기 | API Key 추가 후 테스트 |

---

## 🛠️ 즉시 해야 할 작업 (우선순위)

### 1단계: nginx COEP 헤더 수정 (Dropbox 문제 해결)

**로컬에서 EC2 서버 접속**:
```bash
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@54.242.63.16
```

**nginx 설정 파일 편집**:
```bash
sudo nano /etc/nginx/nginx.conf
```

**변경 내용**:
```nginx
# 🔍 찾기: 다음 라인을 찾아서
add_header Cross-Origin-Embedder-Policy "require-corp" always;

# ✏️ 변경: 다음으로 변경
add_header Cross-Origin-Embedder-Policy "credentialless" always;
```

**변경 사항 저장 및 적용**:
```bash
# 설정 검증
sudo nginx -t

# nginx 재시작
sudo systemctl reload nginx

# 확인
curl -I https://hqmx.net | grep -i cross-origin

# 예상 출력:
# Cross-Origin-Embedder-Policy: credentialless
```

### 2단계: Google Drive API Key 생성 및 설정

**A. Google Cloud Console에서 API Key 생성**:
1. https://console.cloud.google.com 접속
2. "HQMX-Converter" 프로젝트 선택
3. APIs & Services → 사용자 인증 정보
4. "사용자 인증 정보 만들기" → "API 키" 클릭
5. API Key 복사 (예: `AIzaSyXXXXXXXXXXXXXXXXXXXXXX`)

**B. API Key 제한 설정** (보안 강화):
1. 생성된 API Key 옆의 연필 아이콘 클릭
2. **애플리케이션 제한사항**: "HTTP 리퍼러(웹사이트)" 선택
3. **웹사이트 제한사항** 추가:
   ```
   https://hqmx.net/*
   http://localhost:3000/*
   ```
4. **API 제한사항**: "키 제한" 선택
   - Google Drive API
   - Google Picker API
5. "저장" 클릭

**C. frontend/script.js 수정**:

로컬 파일 열기:
```bash
nano /Users/wonjunjang/Documents/converter.hqmx/frontend/script.js
```

찾아서 수정:
```javascript
// 🔍 찾기 (대략 Line 1670 근처)
const GOOGLE_API_KEY = '';

// ✏️ 변경
const GOOGLE_API_KEY = 'AIzaSyXXXXXXXXXXXXXXXXXXXXXX';  // A단계에서 생성한 키
```

저장 후 배포:
```bash
scp -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem \
  /Users/wonjunjang/Documents/converter.hqmx/frontend/script.js \
  ubuntu@54.242.63.16:/tmp/

ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@54.242.63.16 \
  'sudo cp /tmp/script.js /var/www/html/ && \
   sudo chown www-data:www-data /var/www/html/script.js && \
   sudo chmod 755 /var/www/html/script.js'
```

### 3단계: 브라우저 캐시 클리어 및 테스트

1. 브라우저에서 `Ctrl+Shift+R` (강제 새로고침)
2. https://hqmx.net 접속
3. 개발자 도구 열기 (F12)
4. Console 탭 확인:
   - Dropbox 로그: `🔵 [Dropbox] 버튼 활성화됨`
   - Google Drive 로그: `🟢 [Google Drive] ✅ 버튼 활성화됨`
5. "From Dropbox" 버튼 클릭 → Chooser 팝업 정상 열림
6. "From Google Drive" 버튼 클릭 → Picker 팝업 정상 열림

---

## 🧪 테스트 시나리오

### Dropbox 테스트
1. "From Dropbox" 버튼 클릭
2. Dropbox 로그인 (필요 시)
3. 파일 선택 (이미지, 비디오, 오디오)
4. "Choose" 버튼 클릭
5. 파일이 "Your Files" 섹션에 추가되는지 확인
6. 변환 형식 선택 후 "Start Conversion" 클릭
7. 변환 완료 후 다운로드 테스트

### Google Drive 테스트
1. "From Google Drive" 버튼 클릭
2. Google 계정 로그인 및 권한 승인
3. 파일 선택 (이미지, 비디오, 오디오)
4. 파일이 "Your Files" 섹션에 추가되는지 확인
5. 변환 형식 선택 후 "Start Conversion" 클릭
6. 변환 완료 후 다운로드 테스트

---

## 🐛 문제 해결

### Dropbox 관련 문제

**Q1: "Dropbox SDK not loaded" 에러**
```javascript
// 콘솔에서 확인
console.log(typeof Dropbox);  // "object"여야 함

// "undefined"면 스크립트 로딩 실패
// → nginx COEP 헤더 확인
```

**Q2: COEP 에러 여전히 발생**
```bash
# nginx 설정 확인
ssh -i hqmx-ec2.pem ubuntu@54.242.63.16 'sudo nginx -T 2>/dev/null | grep -i embedder'

# 예상 출력:
# Cross-Origin-Embedder-Policy: credentialless

# 브라우저 캐시 클리어 (Ctrl+Shift+Delete)
```

**Q3: 파일 다운로드 실패 (CORS 에러)**
```javascript
// script.js에서 fetch mode 확인
fetch(file.link, { mode: 'cors' })
```

### Google Drive 관련 문제

**Q1: "gapi.client.init() 실패" 에러**
```javascript
// API Key 확인
console.log(GOOGLE_API_KEY);  // 빈 문자열이면 ❌

// API Key 생성 및 설정 (2단계 참조)
```

**Q2: OAuth 인증 팝업이 열리지 않음**
```javascript
// Client ID 확인
console.log(GOOGLE_CLIENT_ID);

// Authorized JavaScript origins 확인
// https://console.cloud.google.com → 사용자 인증 정보
```

**Q3: 파일 선택 후 다운로드 실패**
```javascript
// OAuth scope 확인
// scope: 'https://www.googleapis.com/auth/drive.readonly'

// API 활성화 확인
// Google Drive API, Google Picker API
```

---

## 📊 브라우저 호환성

| 브라우저 | COEP: credentialless | FFmpeg.wasm | Dropbox API | Google Drive API |
|---------|----------------------|-------------|-------------|------------------|
| Chrome 109+ | ✅ 지원 | ✅ 지원 | ✅ 지원 | ✅ 지원 |
| Edge 109+ | ✅ 지원 | ✅ 지원 | ✅ 지원 | ✅ 지원 |
| Firefox 121+ | ✅ 지원 | ✅ 지원 | ✅ 지원 | ✅ 지원 |
| Safari 16+ | ❌ 미지원 | ⚠️ 제한적 | ⚠️ 제한적 | ✅ 지원 |

**Safari 사용자 대응**:
- FFmpeg.wasm 작동 (COEP 없어도 일부 기능 가능)
- Dropbox/Google Drive는 정상 작동 (COEP 영향 없음)
- 전체 사용자의 ~10% (Safari 점유율)

---

## 🔗 유용한 링크

### Dropbox
- [Dropbox Developer Portal](https://www.dropbox.com/developers/apps)
- [Chooser API 문서](https://www.dropbox.com/developers/chooser)
- [SDK 레퍼런스](https://www.dropbox.com/developers/reference/chooser)

### Google Drive
- [Google Cloud Console](https://console.cloud.google.com)
- [Picker API 문서](https://developers.google.com/picker)
- [Drive API 문서](https://developers.google.com/drive)
- [OAuth 2.0 가이드](https://developers.google.com/identity/protocols/oauth2)

### COEP/COOP
- [MDN: Cross-Origin-Embedder-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy)
- [web.dev: COOP and COEP](https://web.dev/articles/coop-coep)
- [Chrome Dev: COEP credentialless](https://developer.chrome.com/blog/coep-credentialless-origin-trial)

---

## 📝 참고사항

1. **HTTPS 필수**: 프로덕션 환경에서는 반드시 HTTPS 사용 (이미 적용됨)
2. **API 키 보안**:
   - API Key는 클라이언트 사이드에서 노출됨 (정상)
   - 대신 **API Key 제한 설정**으로 보안 강화
3. **CORS 정책**: Dropbox/Google Drive는 CORS를 지원하므로 Blob 변환 필요
4. **파일 크기 제한**: 브라우저 메모리 제한 고려 (권장: 100MB 이하)
5. **사용자 경험**: 파일 다운로드 중 로딩 표시 이미 구현됨 (업로드 속도 표시)
6. **에러 처리**: 사용자에게 명확한 에러 메시지 표시 (showToast 사용)
7. **Safari 고려**: COEP credentialless는 Safari 미지원하지만 영향 적음 (Dropbox/Google Drive는 작동)

---

## 🎯 완료 기준

다음 조건을 모두 만족하면 연동 완료:

- [ ] nginx COEP 헤더가 `credentialless`로 변경됨
- [ ] `curl -I https://hqmx.net | grep -i embedder` 명령어로 확인
- [ ] Google Drive API Key가 생성되고 제한 설정됨
- [ ] `frontend/script.js`에 API Key가 추가됨
- [ ] 브라우저 콘솔에서 Dropbox 에러가 사라짐
- [ ] 브라우저 콘솔에서 Google Drive 초기화 성공 로그 확인
- [ ] "From Dropbox" 버튼 클릭 시 Chooser 팝업이 정상적으로 열림
- [ ] "From Google Drive" 버튼 클릭 시 Picker 팝업이 정상적으로 열림
- [ ] Dropbox에서 파일 선택 후 "Your Files"에 추가됨
- [ ] Google Drive에서 파일 선택 후 "Your Files"에 추가됨
- [ ] 선택한 파일이 변환되고 다운로드됨

---

**마지막 업데이트**: 2025-10-14
**작성자**: Claude (Anthropic)
**문의**: support@hqmx.net
