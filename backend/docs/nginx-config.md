# nginx 설정 가이드

HQMX Converter 백엔드 API를 위한 nginx 리버스 프록시 설정 문서입니다.

## 핵심 요구사항

### 1. 대용량 파일 업로드 (2.5GB)
- `client_max_body_size 2500M` - 2.5GB 파일 업로드 허용
- EC2는 request body 크기 제한이 없으므로 nginx만 설정하면 됨

### 2. 긴 변환 시간 처리
- `proxy_read_timeout 600s` - 10분 타임아웃 (대용량 파일 변환)
- `proxy_connect_timeout 60s` - 연결 타임아웃
- `proxy_send_timeout 600s` - 전송 타임아웃

### 3. SSE (Server-Sent Events) 지원
- `proxy_buffering off` - nginx 버퍼링 비활성화 (실시간 진행률)
- `proxy_cache off` - 캐시 비활성화
- `X-Accel-Buffering: no` 헤더 자동 처리

### 4. CORS 헤더 (프론트엔드 연동)
- `Access-Control-Allow-Origin` 설정
- `Access-Control-Allow-Methods` 설정
- `Access-Control-Allow-Headers` 설정

## nginx 설정 파일

### 기본 설정 (/etc/nginx/nginx.conf)

```nginx
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
}

http {
    # 기본 설정
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # 로깅
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip 압축
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml font/truetype font/opentype
               application/vnd.ms-fontobject image/svg+xml;

    # 대용량 파일 업로드 설정 (2.5GB)
    client_max_body_size 2500M;
    client_body_timeout 600s;
    client_header_timeout 60s;

    # 사이트 설정 포함
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

### 사이트 설정 (/etc/nginx/sites-available/hqmx.net)

```nginx
# HTTP → HTTPS 리디렉션
server {
    listen 80;
    listen [::]:80;
    server_name hqmx.net;

    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # 나머지 모든 요청은 HTTPS로 리디렉션
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS 서버
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name hqmx.net;

    # SSL 인증서 (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/hqmx.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hqmx.net/privkey.pem;

    # SSL 설정 (Mozilla Intermediate 권장)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # 보안 헤더
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 대용량 파일 업로드 (2.5GB)
    client_max_body_size 2500M;
    client_body_buffer_size 128k;
    client_body_timeout 600s;

    # 프론트엔드 정적 파일 (/)
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;

        # CORS 헤더 (API만 필요하지만 전역 설정)
        add_header Access-Control-Allow-Origin "https://hqmx.net" always;
        add_header Access-Control-Allow-Methods "GET, POST, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
    }

    # 백엔드 API (/api)
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;

        # 타임아웃 설정 (10분)
        proxy_connect_timeout 60s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;

        # 헤더 전달
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE (Server-Sent Events) 지원
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        chunked_transfer_encoding off;

        # CORS 헤더
        add_header Access-Control-Allow-Origin "https://hqmx.net" always;
        add_header Access-Control-Allow-Methods "GET, POST, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
        add_header Access-Control-Allow-Credentials "true" always;

        # OPTIONS 요청 처리 (preflight)
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://hqmx.net";
            add_header Access-Control-Allow-Methods "GET, POST, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Content-Type, Authorization";
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type "text/plain charset=UTF-8";
            add_header Content-Length 0;
            return 204;
        }
    }

    # Health check (rate limit 제외)
    location /health {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }

    # 로그 설정
    access_log /var/log/nginx/hqmx.net-access.log;
    error_log /var/log/nginx/hqmx.net-error.log warn;
}
```

## 설치 및 적용 절차

### 1. nginx 설치
```bash
sudo apt update
sudo apt install nginx -y
```

### 2. 설정 파일 생성
```bash
# 사이트 설정 파일 생성
sudo nano /etc/nginx/sites-available/hqmx.net

# 위의 "사이트 설정" 내용 붙여넣기

# 심볼릭 링크 생성 (사이트 활성화)
sudo ln -s /etc/nginx/sites-available/hqmx.net /etc/nginx/sites-enabled/
```

### 3. 기본 사이트 비활성화 (선택)
```bash
sudo rm /etc/nginx/sites-enabled/default
```

### 4. 설정 검증
```bash
# nginx 설정 문법 확인
sudo nginx -t

# 출력 예시:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5. nginx 재시작
```bash
# 설정 적용
sudo systemctl restart nginx

# 상태 확인
sudo systemctl status nginx
```

### 6. 방화벽 설정 (EC2 보안 그룹)
```bash
# HTTP (80)
# HTTPS (443)
# SSH (22)
```

## SSL 인증서 설치 (Let's Encrypt)

### 1. Certbot 설치
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. 인증서 발급
```bash
# 자동 설정 (nginx 자동 수정)
sudo certbot --nginx -d hqmx.net

# 또는 수동 설정 (인증서만 발급)
sudo certbot certonly --webroot -w /var/www/certbot -d hqmx.net
```

### 3. 자동 갱신 설정
```bash
# cron job 확인 (자동 설치됨)
sudo systemctl status certbot.timer

# 수동 갱신 테스트
sudo certbot renew --dry-run
```

## 로그 확인

### Access Log
```bash
# 실시간 로그 확인
sudo tail -f /var/log/nginx/hqmx.net-access.log

# 에러만 필터링
sudo grep "error" /var/log/nginx/hqmx.net-access.log
```

### Error Log
```bash
# 실시간 에러 로그
sudo tail -f /var/log/nginx/hqmx.net-error.log

# 최근 100줄
sudo tail -n 100 /var/log/nginx/hqmx.net-error.log
```

### Express 서버 로그 (pm2)
```bash
# 실시간 로그
pm2 logs converter-api

# 에러만
pm2 logs converter-api --err
```

## 성능 최적화

### 1. worker_processes 조정
```nginx
# /etc/nginx/nginx.conf
worker_processes auto;  # CPU 코어 수만큼 자동 설정
```

### 2. worker_connections 증가
```nginx
events {
    worker_connections 2048;  # 기본값 768에서 증가
}
```

### 3. keepalive_timeout 최적화
```nginx
keepalive_timeout 65;  # 연결 유지 시간 (초)
```

### 4. Gzip 압축 활성화 (이미 설정됨)
- JSON, JavaScript, CSS 등 텍스트 파일 압축
- 이미지, 비디오는 이미 압축되어 있으므로 제외

## 문제 해결

### 413 Request Entity Too Large
**원인**: `client_max_body_size` 설정이 부족
**해결**:
```nginx
client_max_body_size 2500M;
```

### 504 Gateway Timeout
**원인**: 변환 시간이 `proxy_read_timeout`보다 김
**해결**:
```nginx
proxy_read_timeout 600s;  # 10분으로 증가
```

### SSE 진행률이 안 보임
**원인**: nginx 버퍼링 활성화
**해결**:
```nginx
proxy_buffering off;
proxy_cache off;
```

### CORS 에러
**원인**: CORS 헤더 누락 또는 잘못 설정
**해결**:
- Origin 정확히 지정 (`https://hqmx.net`)
- OPTIONS 요청 처리 추가
- `Access-Control-Allow-Credentials: true` 설정

## 모니터링

### nginx 상태 확인
```bash
# 실행 중인지 확인
sudo systemctl status nginx

# 설정 파일 확인
sudo nginx -T

# 에러 로그 실시간 확인
sudo tail -f /var/log/nginx/error.log
```

### 리소스 사용량
```bash
# 메모리 사용량
free -h

# 디스크 사용량
df -h

# 프로세스 확인
ps aux | grep nginx
```

### 연결 수 확인
```bash
# 현재 연결 수
sudo netstat -an | grep :443 | wc -l

# 포트별 연결 상태
sudo ss -tulnp
```

## 보안 강화

### 1. Rate Limiting (nginx 레벨)
```nginx
# /etc/nginx/nginx.conf의 http 블록에 추가
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# server 블록의 location /api에 추가
limit_req zone=api burst=20 nodelay;
```

### 2. IP 화이트리스트 (선택)
```nginx
location /api {
    # 특정 IP만 허용
    allow 203.0.113.0/24;
    deny all;

    proxy_pass http://localhost:3001;
}
```

### 3. 보안 헤더 강화
```nginx
add_header Content-Security-Policy "default-src 'self';" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

## 백업 및 복구

### 설정 백업
```bash
# nginx 설정 백업
sudo tar -czf nginx-backup-$(date +%Y%m%d).tar.gz /etc/nginx/

# 특정 사이트 설정만 백업
sudo cp /etc/nginx/sites-available/hqmx.net /etc/nginx/sites-available/hqmx.net.backup
```

### 복구
```bash
# 백업에서 복구
sudo tar -xzf nginx-backup-20250109.tar.gz -C /

# nginx 재시작
sudo systemctl restart nginx
```

## 참고 자료

- [nginx 공식 문서](https://nginx.org/en/docs/)
- [Let's Encrypt 문서](https://letsencrypt.org/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [nginx Reverse Proxy 가이드](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
