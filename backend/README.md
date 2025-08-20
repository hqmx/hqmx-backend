# HQMX Converter Backend

Cloudflare Workers 기반의 파일 변환 API 백엔드입니다.

## 🚀 기능

- **파일 업로드**: FormData를 통한 다중 형식 파일 업로드
- **실시간 진행률**: Server-Sent Events와 Durable Objects를 통한 실시간 변환 진행률 추적
- **파일 변환**: 300+ 형식 간 변환 지원
- **클라우드 스토리지**: Cloudflare R2를 통한 안전한 파일 저장
- **자동 정리**: 설정된 시간 후 파일 자동 삭제

## 📋 API 엔드포인트

### 파일 변환
```http
POST /convert
Content-Type: multipart/form-data

FormData:
- file: 변환할 파일
- outputFormat: 출력 형식 (예: "mp4", "jpg", "pdf")
- settings: JSON 형태의 변환 설정 (선택사항)
```

### 진행률 모니터링
```http
GET /stream-progress/{taskId}
Accept: text/event-stream
```

### 파일 다운로드
```http
GET /download/{taskId}
```

### 추가 API
```http
GET /info/{taskId}        # 작업 정보 조회
GET /downloads?taskIds=   # 다운로드 가능한 파일 목록
GET /health              # 헬스 체크
```

## 🛠️ 로컬 개발

### 1. 의존성 설치
```bash
cd backend
npm install
```

### 2. Wrangler 설정
```bash
# Cloudflare 계정 로그인
npx wrangler login

# R2 버킷 생성
npx wrangler r2 bucket create converter-files
```

### 3. 개발 서버 시작
```bash
npm run dev
```

서버는 `http://localhost:8787`에서 실행됩니다.

## 🚀 배포

### 1. 프로덕션 환경 설정
`wrangler.toml` 파일에서 프로덕션 환경 변수를 설정합니다.

### 2. 배포 실행
```bash
npm run deploy
```

## 🔧 환경 설정

### wrangler.toml 주요 설정
```toml
# R2 스토리지 바인딩
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "converter-files"

# Durable Objects
[[durable_objects.bindings]]
name = "PROGRESS_TRACKER"
class_name = "ProgressTracker"

# 환경 변수
[vars]
MAX_FILE_SIZE = "104857600"  # 100MB
FILE_RETENTION_HOURS = "24"
ALLOWED_ORIGINS = "https://converter.hqmx.net"
```

## 📁 프로젝트 구조

```
backend/
├── src/
│   ├── handlers/           # API 핸들러
│   │   ├── convert.js     # 파일 변환 요청 처리
│   │   ├── progress.js    # 진행률 스트리밍
│   │   └── download.js    # 파일 다운로드
│   ├── utils/             # 유틸리티 함수
│   │   ├── storage.js     # R2 스토리지 관리
│   │   ├── formats.js     # 지원 형식 정의
│   │   ├── helpers.js     # 공통 헬퍼 함수
│   │   └── progress-tracker.js  # Durable Object
│   ├── types/             # 타입 정의
│   │   └── index.js       # JSDoc 타입 정의
│   └── index.js           # 메인 앱
├── wrangler.toml          # Cloudflare Workers 설정
├── package.json           # 프로젝트 설정
└── README.md             # 이 파일
```

## 🔐 보안

- **CORS**: 허용된 Origin에서만 접근 가능
- **파일 크기 제한**: 100MB 제한
- **자동 파일 삭제**: 24시간 후 자동 정리
- **입력 검증**: 모든 API 입력에 대한 검증

## 📊 모니터링

Cloudflare Dashboard에서 다음 메트릭을 모니터링할 수 있습니다:
- 요청 수 및 응답 시간
- 오류율
- Durable Objects 사용량
- R2 스토리지 사용량

## 🚨 에러 처리

모든 API는 일관된 에러 응답 형식을 사용합니다:
```json
{
  "error": "에러 메시지",
  "status": 400,
  "timestamp": "2024-08-21T10:30:00.000Z",
  "details": "추가 세부사항"
}
```

## 🔄 확장 계획

1. **실제 변환 로직**: FFmpeg, ImageMagick 등을 통한 실제 파일 변환
2. **배치 처리**: 여러 파일 동시 변환
3. **웹훅**: 변환 완료 알림
4. **API 키 인증**: 프리미엄 기능을 위한 인증
5. **사용량 제한**: Rate limiting 및 할당량 관리

## 📞 지원

문제나 질문이 있으시면 GitHub Issues를 통해 문의해주세요.