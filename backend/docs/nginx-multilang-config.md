# Nginx 다국어 라우팅 설정

## 목적
- `/kr/convert/jpg-to-png` → `/kr/convert/jpg-to-png.html` 자동 변환
- `.html` 확장자 숨김 처리
- 언어별 SEO 페이지 라우팅

## Nginx 설정 추가

`/etc/nginx/sites-available/hqmx.net` 파일의 `server` 블록에 다음 설정을 추가하세요:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name hqmx.net;

    # SSL 설정 (기존 유지)
    ssl_certificate /etc/letsencrypt/live/hqmx.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hqmx.net/privkey.pem;

    # 보안 헤더 (기존 유지)
    # ...

    # 프론트엔드 정적 파일 (/)
    location / {
        root /var/www/html;
        index index.html;

        # 1. 다국어 변환 페이지 라우팅 (.html 확장자 숨김)
        # /kr/convert/jpg-to-png → /kr/convert/jpg-to-png.html
        location ~ ^/(kr|en|ja|zh-CN|es|fr|de)/convert/([a-z0-9-]+)$ {
            try_files $uri $uri.html =404;
        }

        # 2. 기본 라우팅 (SPA fallback)
        try_files $uri $uri/ /index.html;

        # CORS 헤더 (기존 유지)
        add_header Access-Control-Allow-Origin "https://hqmx.net" always;
        add_header Access-Control-Allow-Methods "GET, POST, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
    }

    # 백엔드 API (/api)
    location /api {
        # 기존 설정 유지
        proxy_pass http://localhost:3001;
        # ...
    }
}
```

## 적용 방법

### 1. 서버에서 Nginx 설정 수정
```bash
ssh -i /Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem ubuntu@54.242.63.16

# Nginx 설정 파일 편집
sudo nano /etc/nginx/sites-available/hqmx.net

# 위의 location ~ ^/(kr|en|...) 블록을 location / 내부에 추가
```

### 2. Nginx 설정 검증
```bash
sudo nginx -t
```

### 3. Nginx 재시작
```bash
sudo systemctl reload nginx
```

### 4. 다국어 페이지 서버에 배포
```bash
# 로컬에서 실행
cd /Users/wonjunjang/Documents/converter.hqmx

# kr 디렉토리 전체 복사
scp -i hqmx-ec2.pem -r frontend/kr/ ubuntu@54.242.63.16:/tmp/
ssh -i hqmx-ec2.pem ubuntu@54.242.63.16 'sudo cp -r /tmp/kr /var/www/html/ && sudo chown -R www-data:www-data /var/www/html/kr'

# en 디렉토리 전체 복사
scp -i hqmx-ec2.pem -r frontend/en/ ubuntu@54.242.63.16:/tmp/
ssh -i hqmx-ec2.pem ubuntu@54.242.63.16 'sudo cp -r /tmp/en /var/www/html/ && sudo chown -R www-data:www-data /var/www/html/en'

# 나머지 언어도 동일하게 반복 (ja, zh-CN, es, fr, de)
```

### 5. 배포 스크립트 (권장)
```bash
#!/bin/bash
# deploy-multilang.sh

LANGUAGES=("kr" "en" "ja" "zh-CN" "es" "fr" "de")
EC2_IP="54.242.63.16"
PEM_FILE="/Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem"

for LANG in "${LANGUAGES[@]}"; do
    echo "📦 배포 중: $LANG"
    scp -i $PEM_FILE -r frontend/$LANG/ ubuntu@$EC2_IP:/tmp/
    ssh -i $PEM_FILE ubuntu@$EC2_IP "sudo cp -r /tmp/$LANG /var/www/html/ && sudo chown -R www-data:www-data /var/www/html/$LANG"
    echo "✅ 완료: $LANG"
done

echo "🎉 모든 언어 배포 완료!"
```

## URL 테스트

배포 후 다음 URL들이 작동하는지 확인:

- https://hqmx.net/kr/convert/jpg-to-png ✅ (한국어)
- https://hqmx.net/en/convert/jpg-to-png ✅ (영어)
- https://hqmx.net/ja/convert/jpg-to-png ✅ (일본어)
- https://hqmx.net/zh-CN/convert/jpg-to-png ✅ (중국어)

## 주의사항

1. **zh-CN 디렉토리명**: 하이픈(-)이 포함되므로 Bash 스크립트에서 따옴표 필수
2. **www-data 권한**: 배포 후 반드시 `chown www-data:www-data` 실행
3. **Nginx 재시작**: 설정 변경 후 반드시 `sudo systemctl reload nginx`

## 문제 해결

### 404 에러가 발생하는 경우
```bash
# 파일 권한 확인
ls -la /var/www/html/kr/convert/

# Nginx 에러 로그 확인
sudo tail -f /var/log/nginx/hqmx.net-error.log
```

### .html 확장자가 그대로 보이는 경우
- Nginx 설정이 제대로 적용되지 않았을 가능성
- `sudo nginx -t`로 설정 검증
- `sudo systemctl reload nginx`로 재시작
