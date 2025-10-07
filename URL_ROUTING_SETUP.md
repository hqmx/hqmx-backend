# HQMX Converter - 다국어 URL 라우팅 설정 가이드

## 개요
`/{언어코드}/{from}-to-{to}` 형식의 SEO 친화적 다국어 URL을 지원합니다.

**예시 URL:**
- `/kr/jpg-to-png` - 한국어로 JPG를 PNG로 변환
- `/en/mp4-to-avi` - 영어로 MP4를 AVI로 변환
- `/es/pdf-to-docx` - 스페인어로 PDF를 DOCX로 변환

## 구현 구조

### 1. nginx rewrite 규칙
URL을 index.html로 리다이렉트하면서 언어코드와 변환 타입을 쿼리 파라미터로 전달

### 2. JavaScript URL 라우터 (url-router.js)
- URL 파라미터 파싱
- 자동 언어 전환
- 변환 설정 프리셋 적용

### 3. 언어 토글 URL 동기화 (i18n.js)
- 언어 선택 시 URL 자동 변경
- 4가지 URL 패턴 지원: `/{lang}/{from}-to-{to}`, `/{from}-to-{to}`, `/{lang}`, `/`
- 언어 코드 매핑: kr↔ko, cn↔zh-CN, tw↔zh-TW
- 데스크톱 및 모바일 언어 선택기 지원

### 4. 자동 변환 설정 (script.js)
- 파일 업로드 시 프리셋된 출력 포맷 자동 선택
- 모바일 언어 토글 URL 동기화

## EC2 서버 설정

### nginx 설정 추가

1. SSH 접속:
```bash
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.22.45.186
```

2. nginx 사이트 설정 편집:
```bash
sudo nano /etc/nginx/sites-available/converter.hqmx.net
```

3. `location /` 블록 **이전에** 다음 설정 추가:
```nginx
# 다국어 URL 라우팅: /{언어코드}/{from}-to-{to}
location ~ ^/(en|de|es|fr|hi|id|it|ko|ja|my|ms|fil|pt|ru|th|tr|vi|zh-CN|zh-TW|ar|bn)/([a-z0-9]+)-to-([a-z0-9]+)/?$ {
    rewrite ^/([^/]+)/([^/]+)-to-([^/]+)/?$ /index.html?lang=$1&from=$2&to=$3 last;
}

# 언어코드만 있는 경우 (홈페이지)
location ~ ^/(en|de|es|fr|hi|id|it|ko|ja|my|ms|fil|pt|ru|th|tr|vi|zh-CN|zh-TW|ar|bn)/?$ {
    rewrite ^/([^/]+)/?$ /index.html?lang=$1 last;
}

# 한국어 단축 코드 (kr → ko)
location ~ ^/kr/([a-z0-9]+)-to-([a-z0-9]+)/?$ {
    rewrite ^/kr/([^/]+)-to-([^/]+)/?$ /index.html?lang=ko&from=$1&to=$2 last;
}

location ~ ^/kr/?$ {
    rewrite ^/kr/?$ /index.html?lang=ko last;
}
```

4. 설정 테스트 및 적용:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 파일 배포

### 새로 추가된 파일
- `frontend/url-router.js` - URL 라우팅 로직
- 수정된 `frontend/index.html` - url-router.js 스크립트 추가
- 수정된 `frontend/script.js` - 프리셋 변환 자동 적용

### 배포 명령어
```bash
# 1. 파일 복사
scp -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem \
  frontend/url-router.js frontend/script.js frontend/index.html \
  ubuntu@23.22.45.186:/tmp/

# 2. nginx 루트로 이동 및 권한 설정
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.22.45.186 '\
  sudo cp /tmp/url-router.js /tmp/script.js /tmp/index.html /var/www/html/ && \
  sudo chown www-data:www-data /var/www/html/url-router.js /var/www/html/script.js /var/www/html/index.html && \
  sudo chmod 755 /var/www/html/url-router.js /var/www/html/script.js /var/www/html/index.html'

# 3. nginx reload
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@23.22.45.186 '\
  sudo nginx -t && sudo systemctl reload nginx'
```

## 테스트

### 브라우저에서 테스트
1. **기본 홈페이지**: https://converter.hqmx.net
2. **한국어 홈페이지**: https://converter.hqmx.net/kr
3. **JPG→PNG 변환 (한국어)**: https://converter.hqmx.net/kr/jpg-to-png
4. **MP4→AVI 변환 (영어)**: https://converter.hqmx.net/en/mp4-to-avi
5. **PDF→DOCX 변환 (스페인어)**: https://converter.hqmx.net/es/pdf-to-docx

### 확인 사항
- ✅ URL 접속 시 자동으로 해당 언어로 전환되는지
- ✅ 지정된 파일 형식 업로드 시 출력 포맷이 자동 선택되는지
- ✅ 브라우저 개발자 도구 콘솔에서 `URLRouter:` 로그 확인
- ✅ RTL 언어(아랍어, 히브리어)에서 레이아웃이 제대로 표시되는지
- ✅ 언어 선택 시 URL이 자동으로 변경되는지 (데스크톱/모바일)
  - `/kr/jpg-to-png` → English 선택 → `/en/jpg-to-png`
  - `/en/mp4-to-avi` → 日本語 선택 → `/ja/mp4-to-avi`
  - `/ja/webp-to-jpg` → 简体中文 선택 → `/cn/webp-to-jpg`

## 지원 언어 코드

| 언어 | 코드 | URL 예시 |
|------|------|----------|
| 영어 | en | /en/jpg-to-png |
| 한국어 | ko 또는 kr | /kr/jpg-to-png |
| 독일어 | de | /de/jpg-to-png |
| 스페인어 | es | /es/jpg-to-png |
| 프랑스어 | fr | /fr/jpg-to-png |
| 힌디어 | hi | /hi/jpg-to-png |
| 인도네시아어 | id | /id/jpg-to-png |
| 이탈리아어 | it | /it/jpg-to-png |
| 일본어 | ja | /ja/jpg-to-png |
| 미얀마어 | my | /my/jpg-to-png |
| 말레이어 | ms | /ms/jpg-to-png |
| 필리핀어 | fil | /fil/jpg-to-png |
| 포르투갈어 | pt | /pt/jpg-to-png |
| 러시아어 | ru | /ru/jpg-to-png |
| 태국어 | th | /th/jpg-to-png |
| 터키어 | tr | /tr/jpg-to-png |
| 베트남어 | vi | /vi/jpg-to-png |
| 중국어 간체 | zh-CN 또는 cn | /cn/jpg-to-png |
| 중국어 번체 | zh-TW 또는 tw | /tw/jpg-to-png |
| 아랍어 | ar | /ar/jpg-to-png |
| 벵골어 | bn | /bn/jpg-to-png |

## 주요 변환 경로 예시

### 이미지 변환
- `/kr/jpg-to-png` - JPG를 PNG로
- `/kr/png-to-jpg` - PNG를 JPG로
- `/kr/webp-to-jpg` - WebP를 JPG로

### 비디오 변환
- `/kr/mp4-to-avi` - MP4를 AVI로
- `/kr/mov-to-mp4` - MOV를 MP4로
- `/kr/avi-to-mp4` - AVI를 MP4로

### 문서 변환
- `/kr/pdf-to-docx` - PDF를 DOCX로
- `/kr/docx-to-pdf` - DOCX를 PDF로
- `/kr/pptx-to-pdf` - PPTX를 PDF로

## SEO 최적화

### robots.txt 추가 권장
```
User-agent: *
Allow: /
Sitemap: https://converter.hqmx.net/sitemap.xml
```

### sitemap.xml 생성 (향후 작업)
주요 변환 경로에 대한 사이트맵 생성으로 검색 엔진 최적화

## 문제 해결

### nginx 404 에러
- nginx 설정이 제대로 적용되었는지 확인: `sudo nginx -t`
- nginx를 재시작: `sudo systemctl restart nginx`

### 언어 전환이 안 됨
- 브라우저 개발자 도구 콘솔에서 에러 확인
- `/var/www/html/locales/` 디렉토리에 언어 파일이 있는지 확인

### 프리셋 변환이 작동하지 않음
- 세션 스토리지 확인: 개발자 도구 → Application → Session Storage
- 콘솔에서 `URLRouter:` 로그 확인

## 향후 개선 사항

1. **동적 사이트맵 생성**: 주요 변환 경로 자동 생성
2. **SEO 메타 태그**: 각 언어/변환 조합별 커스텀 메타 태그
3. **구조화된 데이터**: Schema.org JSON-LD 추가
4. **hreflang 태그**: 다국어 페이지 간 관계 명시
5. **캐시 최적화**: CDN을 통한 언어별 콘텐츠 캐싱
