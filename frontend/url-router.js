/**
 * HQMX Converter - URL Router
 * 다국어 SEO 친화적 URL 라우팅 시스템
 *
 * URL 형식: /{언어코드}/{from}-to-{to}
 * 예: /kr/jpg-to-png, /en/mp4-to-avi
 */

class URLRouter {
    constructor() {
        this.supportedLanguages = [
            'en', 'de', 'es', 'fr', 'hi', 'id', 'it', 'ko', 'ja',
            'my', 'ms', 'fil', 'pt', 'ru', 'th', 'tr', 'vi',
            'zh-CN', 'zh-TW', 'ar', 'bn'
        ];

        // 언어 코드 매핑 (URL에서 사용하는 짧은 코드 → 실제 언어 코드)
        this.languageMapping = {
            'kr': 'ko',  // 한국어
            'cn': 'zh-CN', // 중국어 간체
            'tw': 'zh-TW'  // 중국어 번체
        };
    }

    /**
     * 현재 URL을 파싱해서 라우팅 정보 반환
     */
    parseURL() {
        const params = new URLSearchParams(window.location.search);
        const pathname = window.location.pathname;

        // 쿼리 파라미터 방식 (nginx rewrite 결과)
        if (params.has('lang')) {
            return {
                language: this.normalizeLanguageCode(params.get('lang')),
                fromFormat: params.get('from')?.toLowerCase(),
                toFormat: params.get('to')?.toLowerCase(),
                isRouted: true
            };
        }

        // 직접 URL 경로 파싱 (fallback)
        const pathMatch = pathname.match(/^\/([^\/]+)\/([a-z0-9]+)-to-([a-z0-9]+)\/?$/i);
        if (pathMatch) {
            return {
                language: this.normalizeLanguageCode(pathMatch[1]),
                fromFormat: pathMatch[2].toLowerCase(),
                toFormat: pathMatch[3].toLowerCase(),
                isRouted: true
            };
        }

        // 언어만 있는 경우
        const langMatch = pathname.match(/^\/([^\/]+)\/?$/);
        if (langMatch && langMatch[1] !== 'index.html') {
            const lang = this.normalizeLanguageCode(langMatch[1]);
            if (this.supportedLanguages.includes(lang)) {
                return {
                    language: lang,
                    fromFormat: null,
                    toFormat: null,
                    isRouted: true
                };
            }
        }

        return {
            language: null,
            fromFormat: null,
            toFormat: null,
            isRouted: false
        };
    }

    /**
     * 언어 코드 정규화 (kr → ko, cn → zh-CN 등)
     */
    normalizeLanguageCode(code) {
        if (!code) return null;
        const normalized = code.toLowerCase();
        return this.languageMapping[normalized] || normalized;
    }

    /**
     * 포맷 이름을 대문자로 변환 (jpg → JPG)
     */
    normalizeFormat(format) {
        if (!format) return null;
        return format.toUpperCase();
    }

    /**
     * 라우팅 정보를 기반으로 앱 초기화
     */
    async applyRouting() {
        const routing = this.parseURL();

        if (!routing.isRouted) {
            console.log('URLRouter: No routing detected, using defaults');
            return;
        }

        console.log('URLRouter: Parsed routing:', routing);

        // 1. 언어 설정 적용
        if (routing.language && window.i18n) {
            try {
                await window.i18n.changeLanguage(routing.language);
                console.log(`URLRouter: Language set to ${routing.language}`);
            } catch (error) {
                console.error('URLRouter: Failed to set language:', error);
            }
        }

        // 2. 변환 설정 미리 채우기
        if (routing.fromFormat && routing.toFormat) {
            this.presetConversion(routing.fromFormat, routing.toFormat);
        }
    }

    /**
     * 변환 설정 미리 채우기 (파일 선택 후 자동으로 출력 포맷 설정)
     */
    presetConversion(fromFormat, toFormat) {
        // 변환 설정을 세션 스토리지에 저장
        sessionStorage.setItem('preset_from_format', this.normalizeFormat(fromFormat));
        sessionStorage.setItem('preset_to_format', this.normalizeFormat(toFormat));

        console.log(`URLRouter: Preset conversion ${fromFormat} → ${toFormat}`);

        // UI에 힌트 표시 (선택사항)
        this.showConversionHint(fromFormat, toFormat);
    }

    /**
     * 변환 힌트 표시
     */
    showConversionHint(from, to) {
        // header의 tagline 바로 아래에 변환 형식 표시
        const tagline = document.querySelector('.header .tagline');
        if (tagline) {
            const conversionText = document.createElement('p');
            conversionText.className = 'conversion-format-text';
            conversionText.style.cssText = 'font-size: 18px; margin-top: 8px; margin-bottom: 0; font-weight: 500; color: var(--text-primary);';
            conversionText.textContent = `${this.normalizeFormat(from)} to ${this.normalizeFormat(to)}`;

            // tagline 다음에 삽입
            tagline.parentNode.insertBefore(conversionText, tagline.nextSibling);
        }
    }

    /**
     * URL 생성 헬퍼 함수
     */
    generateURL(language, fromFormat, toFormat) {
        const lang = language || 'en';
        if (fromFormat && toFormat) {
            return `/${lang}/${fromFormat.toLowerCase()}-to-${toFormat.toLowerCase()}`;
        }
        return `/${lang}`;
    }
}

// 전역 인스턴스 생성
window.urlRouter = new URLRouter();

// DOM 로드 완료 시 라우팅 적용
document.addEventListener('DOMContentLoaded', () => {
    window.urlRouter.applyRouting();
});
