#!/bin/bash

# HQMX Converter - Cloudflare Pages 배포 스크립트

set -e  # 에러 발생시 중단

echo "🚀 HQMX Converter 배포 시작..."

# 프로젝트 디렉토리로 이동
cd "$(dirname "$0")/client-app"

echo "📦 의존성 설치 중..."
npm install

echo "🔧 빌드 중..."
npm run build

echo "✅ 빌드 완료!"

# Wrangler가 설치되어 있는지 확인
if ! command -v wrangler &> /dev/null; then
    echo "⚠️  Wrangler가 설치되어 있지 않습니다."
    echo "설치하려면: npm install -g wrangler"
    echo "또는 npx를 사용하여 배포하세요: npx wrangler pages deploy dist"
    exit 1
fi

# Cloudflare 인증 확인
echo "🔐 Cloudflare 인증 확인 중..."
if ! wrangler whoami &> /dev/null; then
    echo "⚠️  Cloudflare 계정에 로그인해주세요."
    echo "실행: wrangler login"
    exit 1
fi

# 배포 실행
echo "🌐 Cloudflare Pages에 배포 중..."
wrangler pages deploy dist --project-name hqmx-converter

echo ""
echo "✅ 배포 완료!"
echo "🌟 웹사이트: https://hqmx-converter.pages.dev"
echo ""
echo "📋 추가 명령어:"
echo "  개발 서버: npm run dev"
echo "  빌드 테스트: npm run preview"
echo "  배포 확인: wrangler pages deployment list --project-name hqmx-converter"