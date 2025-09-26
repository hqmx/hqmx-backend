# 배포 가이드

## 전제 조건

1. **Cloudflare 계정**: [Cloudflare](https://cloudflare.com) 계정 필요
2. **Node.js**: 18.0.0 이상
3. **Wrangler CLI**: Cloudflare Workers CLI 도구

## 초기 설정

### 1. Wrangler 설치 및 로그인
```bash
npm install -g wrangler
wrangler login
```

### 2. R2 버킷 생성
```bash
wrangler r2 bucket create converter-files
```

### 3. Durable Objects 네임스페이스 생성
```bash
wrangler d1 create converter-progress-db
```

## 환경별 배포

### 개발 환경
```bash
# 개발 서버 실행
npm run dev

# 브라우저에서 http://localhost:8787 접속
```

### 스테이징 환경
```bash
# 스테이징 환경 배포
wrangler deploy --env staging

# 환경 변수 설정
wrangler secret put API_KEY --env staging
```

### 프로덕션 환경
```bash
# 프로덕션 배포
wrangler deploy --env production

# 환경 변수 설정
wrangler secret put API_KEY --env production
```

## 환경 변수 설정

### wrangler.toml에서 설정하는 변수
```toml
[vars]
MAX_FILE_SIZE = "104857600"
FILE_RETENTION_HOURS = "24"
ALLOWED_ORIGINS = "https://converter.hqmx.net"
```

### Secret 변수 (민감한 정보)
```bash
# API 키 (필요한 경우)
wrangler secret put API_KEY

# 서드파티 서비스 키들
wrangler secret put EXTERNAL_SERVICE_KEY
```

## 모니터링 설정

### 1. Cloudflare Analytics
- Workers Analytics에서 성능 메트릭 확인
- 요청 수, 응답 시간, 오류율 모니터링

### 2. 로그 확인
```bash
# 실시간 로그 확인
wrangler tail

# 특정 환경 로그
wrangler tail --env production
```

### 3. 알림 설정
- Cloudflare Dashboard에서 알림 규칙 설정
- 오류율, 응답 시간 임계값 설정

## 성능 최적화

### 1. 캐싱 전략
- R2 파일은 TTL 설정으로 자동 만료
- 정적 응답에 적절한 Cache-Control 헤더 설정

### 2. 메모리 사용량 최적화
- 대용량 파일 처리 시 스트리밍 사용
- 불필요한 메모리 사용 방지

### 3. 비용 최적화
- 사용하지 않는 Durable Objects 정리
- R2 스토리지 정기 정리 작업

## 보안 체크리스트

### 배포 전 확인사항
- [ ] 모든 환경 변수 설정 완료
- [ ] CORS 설정 검증
- [ ] Rate limiting 설정 확인
- [ ] 파일 업로드 제한 설정
- [ ] 보안 헤더 설정 확인

### 정기 보안 점검
- [ ] 의존성 업데이트
- [ ] 보안 패치 적용
- [ ] 액세스 로그 검토
- [ ] 비정상적인 트래픽 패턴 확인

## 백업 및 복구

### 1. 설정 백업
```bash
# wrangler.toml 파일 백업
git add wrangler.toml
git commit -m "Update production config"
```

### 2. 데이터 백업
- R2 버킷 데이터는 자동으로 복제됨
- Durable Objects 데이터는 정기적으로 백업 권장

### 3. 롤백 절차
```bash
# 이전 버전으로 롤백
wrangler rollback [VERSION_ID]

# 설정 롤백
git revert [COMMIT_HASH]
wrangler deploy
```

## 문제 해결

### 일반적인 문제들

1. **배포 실패**
   - wrangler.toml 문법 확인
   - 계정 권한 확인
   - 의존성 설치 확인

2. **CORS 오류**
   - ALLOWED_ORIGINS 환경 변수 확인
   - 프론트엔드 도메인 화이트리스트 확인

3. **파일 업로드 실패**
   - R2 버킷 권한 확인
   - 파일 크기 제한 확인
   - 네트워크 연결 상태 확인

4. **변환 실패**
   - 지원되는 형식인지 확인
   - 파일 손상 여부 확인
   - 메모리 사용량 확인

### 로그 분석
```bash
# 오류 로그 필터링
wrangler tail --format pretty | grep "ERROR"

# 특정 시간대 로그
wrangler tail --since 2024-08-21T10:00:00Z
```

## 성능 메트릭

### 모니터링 대상
- 요청 처리 시간
- 파일 변환 시간
- 메모리 사용량
- R2 스토리지 사용량
- 오류율

### 임계값 설정
- 평균 응답 시간: < 5초
- 오류율: < 1%
- 메모리 사용량: < 128MB
- 변환 성공률: > 95%

## 확장 계획

### 단기 개선사항
- 더 많은 파일 형식 지원
- 배치 변환 기능
- 웹훅 알림 기능

### 장기 로드맵
- AI 기반 파일 최적화
- 실시간 협업 기능
- 엔터프라이즈 기능