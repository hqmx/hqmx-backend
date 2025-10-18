# 🔧 Dropbox & Google Drive 로그인 문제 해결 가이드

**작성일**: 2025-10-18
**문제**: Dropbox/Google Drive 버튼 클릭 시 로그인 화면 대신 404 또는 설정 오류 표시

---

## 📊 문제 진단 결과

### Dropbox 문제 ✅ **해결책 확인됨**
**에러 메시지**: "이 위젯이 제대로 구성되지 않은 것 같습니다" / "앱이 잘못 구성되었습니다"

**원인**:
- Drop-ins domains에 **잘못된 형식**으로 도메인 등록됨
- 현재 설정 (잘못됨): `https://hqmx.net`, `https://hqmx.net/*`
- 올바른 설정: `hqmx.net` (프로토콜 없이, 와일드카드 없이)

**참고**:
- [Dropbox Forum - Widget not configured](https://www.dropboxforum.com/t5/Dropbox-API-Support-Feedback/Error-while-using-chooser-saver-quot-Uh-oh-Seems-like-this/td-p/295448)
- [Stack Overflow - Origin does not match](https://stackoverflow.com/questions/23881497/dropbox-api-chooser-with-js-from-localhost-origin-does-not-match-any-app-domain)

---

### Google Drive 문제 ✅ **해결책 확인됨**
**에러 메시지**: `ERR_FAILED` at `https://accounts.google.com/gsi/client`

**원인 (우선순위순)**:
1. **CSP (Content Security Policy) 헤더 누락** - 가장 가능성 높음
2. **Ad Blocker/Privacy Extensions** - 사용자 브라우저 설정
3. **Google Cloud Console 설정** - Authorized JavaScript origins

**참고**:
- [Google Developers - GIS Setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)
- [Stack Overflow - GIS ERR_FAILED](https://stackoverflow.com/questions/76770357/sign-in-with-google-error-in-script-https-accounts-google-com-gsi-client)
- [Stack Overflow - CSP for Sign in with Google](https://stackoverflow.com/questions/74521166/does-the-sign-in-with-google-button-require-csp-style-src-unsafe-inline)

---

## 🚀 해결 방법

### 1️⃣ Dropbox 설정 수정 (필수)

#### A. Dropbox Developer Portal 접속
```bash
URL: https://www.dropbox.com/developers/apps
```

#### B. HQMX-Converter 앱 선택
- App Key: `xfuwomiskerr8by` 확인

#### C. Settings 탭 → "Chooser / Saver / Embedder domains" 수정

**❌ 현재 (잘못된 설정)**:
```
https://hqmx.net
https://hqmx.net/*
```

**✅ 수정 (올바른 설정)**:
```
hqmx.net
```

**중요 사항**:
- ✅ 프로토콜 제거 (`https://` 없이)
- ✅ 와일드카드 제거 (`/*` 없이)
- ✅ www 프리픽스 없이 (`hqmx.net`만)
- ✅ 대소문자 구분 없음

#### D. 저장 및 즉시 테스트
- "Save" 버튼 클릭
- 브라우저 캐시 클리어 (Ctrl+Shift+Delete)
- https://hqmx.net 접속하여 "From Dropbox" 버튼 테스트

---

### 2️⃣ Google Drive 설정 수정

#### 방법 1: nginx CSP 헤더 수정 (가장 효과적)

**A. EC2 서버 접속**:
```bash
ssh -i hqmx-ec2.pem ubuntu@23.21.183.81
```

**B. nginx 설정 파일 확인**:
```bash
sudo nginx -T 2>/dev/null | grep -i "content-security-policy"
```

**C. nginx 설정 파일 편집**:
```bash
sudo nano /etc/nginx/sites-available/hqmx.net
```

**D. CSP 헤더에 Google GIS 도메인 추가**:

**현재 (예상)**:
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com ...";
```

**수정 후**:
```nginx
add_header Content-Security-Policy "
    default-src 'self';
    script-src 'self' 'unsafe-inline'
        https://cdnjs.cloudflare.com
        https://accounts.google.com/gsi/client
        https://www.dropbox.com/static/api/2/dropins.js;
    frame-src 'self'
        https://accounts.google.com/gsi/
        https://www.dropbox.com/chooser;
    connect-src 'self'
        https://accounts.google.com/gsi/
        https://api.dropbox.com;
    style-src 'self' 'unsafe-inline';
" always;
```

**E. nginx 테스트 및 재시작**:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

**F. 브라우저에서 확인**:
```bash
curl -I https://hqmx.net | grep -i content-security-policy
```

---

#### 방법 2: Google Cloud Console 설정 확인

**A. Google Cloud Console 접속**:
```bash
URL: https://console.cloud.google.com
프로젝트: HQMX-Converter
```

**B. OAuth 2.0 Client ID 확인**:
1. APIs & Services → 사용자 인증 정보
2. Client ID: `280998173097-ffdh6ft1kujjcn5kp9md1p6mso17cvpj.apps.googleusercontent.com`
3. **승인된 JavaScript 원본** 확인:
   ```
   https://hqmx.net
   http://localhost:3000  (개발용)
   ```
4. 누락되어 있다면 추가 → 저장

**C. OAuth 동의 화면 설정 확인**:
1. APIs & Services → OAuth 동의 화면
2. **게시 상태** 확인:
   - ✅ "프로덕션" 모드 (권장) - 모든 사용자 접근 가능
   - ⚠️ "테스트" 모드 - 테스트 사용자만 접근 가능
3. 테스트 모드인 경우:
   - "테스트 사용자" 목록에 테스트용 이메일 추가
   - 또는 "프로덕션으로 게시" 버튼 클릭

**D. API 활성화 확인**:
1. APIs & Services → 라이브러리
2. 다음 API가 활성화되어 있는지 확인:
   - ✅ Google Picker API
   - ✅ Google Drive API

---

#### 방법 3: Ad Blocker 임시 비활성화 (테스트용)

사용자 브라우저에 Ad Blocker가 설치되어 있으면 Google GIS 스크립트를 차단할 수 있습니다.

**테스트 방법**:
1. 브라우저 시크릿 모드 (Incognito) 접속
2. 또는 Ad Blocker 확장 프로그램 비활성화
3. https://hqmx.net 접속하여 "From Google Drive" 버튼 테스트

**결과**:
- ✅ 시크릿 모드에서 작동 → Ad Blocker 문제 (사용자 환경)
- ❌ 시크릿 모드에서도 실패 → CSP 헤더 또는 Google Cloud 설정 문제

---

## 🧪 테스트 절차

### Dropbox 테스트
1. Dropbox Developer Portal에서 도메인 수정 완료
2. 브라우저 캐시 클리어 (Ctrl+Shift+Delete)
3. https://hqmx.net 접속
4. "From Dropbox" 버튼 클릭
5. **예상 결과**: Dropbox 로그인 화면 또는 파일 선택 화면 표시

### Google Drive 테스트
1. nginx CSP 헤더 수정 완료 (또는 Google Cloud 설정 확인)
2. nginx 재시작 (`sudo systemctl reload nginx`)
3. 브라우저 캐시 클리어
4. https://hqmx.net 접속
5. **브라우저 개발자 도구 (F12)** 열기
6. Console 탭 확인:
   - ✅ 정상: `🟢 [Google Drive] ✅ 버튼 활성화됨`
   - ❌ 오류: `ERR_FAILED` 또는 `google 객체: ✗ 없음`
7. "From Google Drive" 버튼 클릭
8. **예상 결과**: Google 로그인 화면 또는 파일 선택 화면 표시

---

## 🔍 문제 해결 (Troubleshooting)

### Dropbox 여전히 실패하는 경우

**1. 도메인 형식 재확인**:
```
✅ 올바름: hqmx.net
❌ 잘못됨: https://hqmx.net
❌ 잘못됨: hqmx.net/*
❌ 잘못됨: www.hqmx.net
```

**2. App Key 확인**:
- Settings 탭에서 App Key가 `xfuwomiskerr8by`인지 확인
- `frontend/index.html`의 Dropbox script 태그와 일치하는지 확인

**3. Permissions 확인**:
- Permissions 탭으로 이동
- `files.metadata.read`, `files.content.read` 권한 활성화 확인

**4. 브라우저 개발자 도구 확인**:
```javascript
// 콘솔에서 실행
console.log('Dropbox SDK loaded:', typeof Dropbox !== 'undefined');
console.log('Dropbox object:', Dropbox);
```

---

### Google Drive 여전히 실패하는 경우

**1. CSP 헤더 확인**:
```bash
curl -I https://hqmx.net | grep -i content-security-policy
```

**예상 출력**:
```
Content-Security-Policy: ... script-src ... https://accounts.google.com/gsi/client ...
```

**2. 브라우저 개발자 도구 확인**:
```javascript
// 콘솔에서 실행
console.log('gapi loaded:', typeof gapi !== 'undefined');
console.log('google loaded:', typeof google !== 'undefined');
```

**3. Network 탭 확인**:
- F12 → Network 탭
- `gsi/client` 검색
- Status Code 확인:
  - ✅ 200 OK → 정상 로드
  - ❌ Failed/Blocked → CSP 또는 Ad Blocker 문제

**4. OAuth 설정 재확인**:
```bash
Google Cloud Console → OAuth 동의 화면 → 게시 상태 → "프로덕션"
```

---

## 📋 체크리스트

### Dropbox
- [ ] Dropbox Developer Portal 로그인
- [ ] HQMX-Converter 앱 선택 (App Key: `xfuwomiskerr8by`)
- [ ] Settings → "Chooser / Saver / Embedder domains"
- [ ] 기존 도메인 삭제 (`https://hqmx.net`, `https://hqmx.net/*`)
- [ ] `hqmx.net`만 추가 (프로토콜 없이)
- [ ] Save 클릭
- [ ] 브라우저 캐시 클리어
- [ ] "From Dropbox" 버튼 테스트

### Google Drive
- [ ] EC2 서버 접속 (`ssh -i hqmx-ec2.pem ubuntu@23.21.183.81`)
- [ ] nginx CSP 헤더에 Google GIS 도메인 추가
- [ ] nginx 테스트 (`sudo nginx -t`)
- [ ] nginx 재시작 (`sudo systemctl reload nginx`)
- [ ] Google Cloud Console → OAuth Client ID 확인
- [ ] "승인된 JavaScript 원본"에 `https://hqmx.net` 등록 확인
- [ ] OAuth 동의 화면 → "프로덕션" 모드 확인
- [ ] 브라우저 캐시 클리어
- [ ] "From Google Drive" 버튼 테스트

---

## 📸 스크린샷

### Dropbox 에러 화면
![Dropbox Error](/.playwright-mcp/dropbox-error-screenshot.png)

**에러 메시지**:
- "이 위젯이 제대로 구성되지 않은 것 같습니다"
- "앱이 잘못 구성되었습니다"

---

## 🎯 예상 결과

### 수정 완료 후
1. **Dropbox**: 로그인 화면 또는 파일 선택 화면 정상 표시
2. **Google Drive**: 로그인 화면 또는 파일 선택 화면 정상 표시
3. **파일 업로드**: 선택한 파일이 "Your Files" 섹션에 정상 추가
4. **변환**: 파일 변환 및 다운로드 정상 작동

### 성공 지표
- ✅ Dropbox Chooser 팝업에서 "앱이 잘못 구성되었습니다" 메시지 사라짐
- ✅ Google Drive 버튼 활성화됨 (비활성화 상태 해제)
- ✅ 브라우저 콘솔에 `🟢 [Google Drive] ✅ 버튼 활성화됨` 표시
- ✅ 두 서비스 모두에서 파일 선택 가능

---

## 📞 추가 지원

문제가 지속되는 경우:
1. 브라우저 개발자 도구 (F12) → Console 탭 스크린샷
2. 브라우저 개발자 도구 (F12) → Network 탭 스크린샷
3. nginx 설정 파일 내용 (`sudo nginx -T 2>/dev/null | grep -i content-security-policy`)
4. Dropbox Developer Portal → Settings 스크린샷
5. Google Cloud Console → OAuth Client ID 스크린샷

위 정보를 함께 제공해주시면 더 정확한 해결책을 제시할 수 있습니다.

---

**최종 업데이트**: 2025-10-18
**작성자**: Claude (Anthropic)
**참고 문서**: `google-add.md`, Dropbox/Google Drive 공식 문서
