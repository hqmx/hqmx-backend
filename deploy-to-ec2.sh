#!/bin/bash

# EC2 서버 배포 스크립트
# nginx root: /var/www/html/

set -e  # 에러 발생시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PEM_FILE="/Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem"
SERVER="ubuntu@23.21.183.81"  # Elastic IP (2025-10-16 변경)
NGINX_ROOT="/var/www/html"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}EC2 서버 배포 시작${NC}"
echo -e "${YELLOW}========================================${NC}"

# 배포할 파일 확인
if [ ! -f "frontend/style.css" ] || [ ! -f "frontend/index.html" ]; then
    echo -e "${RED}❌ 오류: frontend/style.css 또는 frontend/index.html 파일이 없습니다.${NC}"
    exit 1
fi

if [ ! -f "frontend/sitemap.xml" ]; then
    echo -e "${YELLOW}⚠️  경고: sitemap.xml이 없습니다. _scripts/generate-sitemap.js를 실행하세요.${NC}"
fi

echo -e "${GREEN}✅ 배포 파일 확인 완료${NC}"

# 1. 파일을 서버 /tmp로 복사
echo -e "\n${YELLOW}📤 파일을 서버 /tmp로 복사 중...${NC}"
scp -i "$PEM_FILE" \
    frontend/style.css \
    frontend/index.html \
    frontend/script.js \
    frontend/converter-engine.js \
    frontend/i18n.js \
    frontend/url-router.js \
    frontend/feature-flags.js \
    "$SERVER:/tmp/"

# locales 디렉토리 복사
scp -i "$PEM_FILE" -r frontend/locales "$SERVER:/tmp/"

# assets 디렉토리 복사
scp -i "$PEM_FILE" -r frontend/assets "$SERVER:/tmp/"

# sitemap.xml 복사 (있는 경우)
if [ -f "frontend/sitemap.xml" ]; then
    scp -i "$PEM_FILE" frontend/sitemap.xml "$SERVER:/tmp/"
    echo -e "${GREEN}✅ sitemap.xml 복사 완료${NC}"
fi

# 다국어 변환 페이지 디렉토리 복사 (kr, en, ja, zh-CN, es, fr, de)
echo -e "${YELLOW}📤 다국어 페이지 복사 중...${NC}"
for lang in kr en ja zh-CN es fr de; do
    if [ -d "frontend/$lang" ]; then
        scp -i "$PEM_FILE" -r "frontend/$lang" "$SERVER:/tmp/"
        echo -e "${GREEN}  ✓ $lang 페이지 복사 완료${NC}"
    fi
done

echo -e "${GREEN}✅ 파일 복사 완료${NC}"

# 2. 서버에서 nginx root로 이동 및 권한 설정
echo -e "\n${YELLOW}📁 파일을 $NGINX_ROOT 로 이동 및 권한 설정 중...${NC}"
ssh -i "$PEM_FILE" "$SERVER" << 'EOF'
    # nginx root로 복사 (개별 파일)
    sudo cp /tmp/style.css /tmp/index.html /tmp/script.js /tmp/converter-engine.js /tmp/i18n.js /tmp/url-router.js /tmp/feature-flags.js /var/www/html/

    # sitemap.xml 복사 (있는 경우)
    if [ -f /tmp/sitemap.xml ]; then
        sudo cp /tmp/sitemap.xml /var/www/html/
        sudo chown www-data:www-data /var/www/html/sitemap.xml
        sudo chmod 644 /var/www/html/sitemap.xml
        echo "✓ sitemap.xml 이동 완료"
    fi

    # locales 디렉토리 복사
    sudo rm -rf /var/www/html/locales
    sudo cp -r /tmp/locales /var/www/html/

    # assets 디렉토리 복사
    sudo rm -rf /var/www/html/assets
    sudo cp -r /tmp/assets /var/www/html/

    # 다국어 페이지 디렉토리 복사
    for lang in kr en ja zh-CN es fr de; do
        if [ -d "/tmp/$lang" ]; then
            sudo rm -rf "/var/www/html/$lang"
            sudo cp -r "/tmp/$lang" /var/www/html/
            echo "✓ $lang 디렉토리 이동 완료"
        fi
    done

    # 권한 설정 (개별 파일)
    sudo chown www-data:www-data /var/www/html/style.css /var/www/html/index.html /var/www/html/script.js /var/www/html/converter-engine.js /var/www/html/i18n.js /var/www/html/url-router.js /var/www/html/feature-flags.js
    sudo chmod 755 /var/www/html/style.css /var/www/html/index.html /var/www/html/script.js /var/www/html/converter-engine.js /var/www/html/i18n.js /var/www/html/url-router.js /var/www/html/feature-flags.js

    # 디렉토리 권한 설정
    sudo chown -R www-data:www-data /var/www/html/locales /var/www/html/assets
    sudo chmod -R 755 /var/www/html/locales /var/www/html/assets

    # 다국어 페이지 디렉토리 권한 설정
    for lang in kr en ja zh-CN es fr de; do
        if [ -d "/var/www/html/$lang" ]; then
            sudo chown -R www-data:www-data "/var/www/html/$lang"
            sudo chmod -R 755 "/var/www/html/$lang"
        fi
    done

    # /tmp 정리
    rm -f /tmp/style.css /tmp/index.html /tmp/script.js /tmp/converter-engine.js /tmp/i18n.js /tmp/url-router.js /tmp/feature-flags.js /tmp/sitemap.xml
    rm -rf /tmp/locales /tmp/assets
    for lang in kr en ja zh-CN es fr de; do
        rm -rf "/tmp/$lang"
    done
EOF

echo -e "${GREEN}✅ 파일 이동 및 권한 설정 완료${NC}"

# 3. nginx 설정 테스트 및 reload
echo -e "\n${YELLOW}🔄 nginx reload 중...${NC}"
ssh -i "$PEM_FILE" "$SERVER" 'sudo nginx -t && sudo systemctl reload nginx'

echo -e "${GREEN}✅ nginx reload 완료${NC}"

# 4. 배포 확인
echo -e "\n${YELLOW}🔍 배포 확인 중...${NC}"
DEPLOYED_LINES=$(ssh -i "$PEM_FILE" "$SERVER" 'wc -l /var/www/html/style.css' | awk '{print $1}')
LOCAL_LINES=$(wc -l < frontend/style.css)

echo -e "로컬 style.css: ${LOCAL_LINES}줄"
echo -e "서버 style.css: ${DEPLOYED_LINES}줄"

if [ "$LOCAL_LINES" -eq "$DEPLOYED_LINES" ]; then
    echo -e "${GREEN}✅ 배포 검증 완료: 파일 라인 수 일치${NC}"
else
    echo -e "${RED}⚠️  경고: 파일 라인 수 불일치 (로컬: ${LOCAL_LINES}, 서버: ${DEPLOYED_LINES})${NC}"
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 배포 완료!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n🌐 메인 사이트: https://hqmx.net"
echo -e "🗺️  Sitemap: https://hqmx.net/sitemap.xml"
echo -e "📄 예시 페이지: https://hqmx.net/en/convert/jpg-to-png.html"
echo -e "💡 강제 새로고침: Ctrl+F5 (또는 Cmd+Shift+R)\n"
