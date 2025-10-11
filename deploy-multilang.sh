#!/bin/bash
# deploy-multilang.sh - 다국어 SEO 페이지 배포 스크립트

set -e  # 에러 발생 시 중단

# 설정
LANGUAGES=("kr" "en" "ja" "zh-CN" "es" "fr" "de")
EC2_IP="54.242.63.16"
PEM_FILE="/Users/wonjunjang/Documents/converter.hqmx/hqmx-ec2.pem"
FRONTEND_DIR="/Users/wonjunjang/Documents/converter.hqmx/frontend"

echo "🚀 다국어 SEO 페이지 배포 시작"
echo "📍 서버: $EC2_IP"
echo "🌐 언어: ${LANGUAGES[@]}"
echo ""

# 각 언어별 배포
for LANG in "${LANGUAGES[@]}"; do
    echo "📦 배포 중: $LANG"

    # 임시 디렉토리로 복사
    scp -i "$PEM_FILE" -r "$FRONTEND_DIR/$LANG/" "ubuntu@$EC2_IP:/tmp/$LANG/" 2>&1 | grep -v "Offending" || true

    # 서버에서 /var/www/html로 이동 및 권한 설정
    ssh -i "$PEM_FILE" "ubuntu@$EC2_IP" "sudo cp -r /tmp/$LANG /var/www/html/ && sudo chown -R www-data:www-data /var/www/html/$LANG && sudo chmod -R 755 /var/www/html/$LANG"

    echo "✅ 완료: $LANG"
done

echo ""
echo "🎉 모든 언어 배포 완료!"
echo ""
echo "📝 다음 단계:"
echo "1. Nginx 설정 수정: ssh -i $PEM_FILE ubuntu@$EC2_IP"
echo "2. sudo nano /etc/nginx/sites-available/hqmx.net"
echo "3. location ~ ^/(kr|en|ja|zh-CN|es|fr|de)/convert/ 블록 추가"
echo "4. sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "🧪 테스트 URL:"
echo "   https://hqmx.net/kr/convert/jpg-to-png"
echo "   https://hqmx.net/en/convert/jpg-to-png"
