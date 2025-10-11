// Internationalization (i18n) Module for HQMX Converter
class I18n {
    constructor() {
        this.currentLang = 'en';
        this.translations = {};
        this.rtlLanguages = ['ar', 'he', 'fa', 'ur'];
        this.init();
    }

    async init() {
        // URL 파라미터의 언어가 최우선 (다국어 SEO URL 지원)
        const urlLang = this.getLanguageFromURL();

        // Get saved language or detect from browser
        this.currentLang = urlLang || localStorage.getItem('language') || this.detectLanguage();

        // Load translations
        await this.loadTranslations(this.currentLang);

        // Apply translations
        this.applyTranslations();
        this.updateDirection();
        this.updateLanguageSelector();
    }

    getLanguageFromURL() {
        // 1. URL 쿼리 파라미터에서 언어 코드 추출 (nginx rewrite 결과)
        const params = new URLSearchParams(window.location.search);
        if (params.has('lang')) {
            return params.get('lang');
        }

        // 2. URL pathname에서 직접 파싱 (/{언어코드}/... 형식)
        const pathname = window.location.pathname;

        // /{언어코드}/{from}-to-{to} 형식
        const pathMatch = pathname.match(/^\/([^\/]+)\/([a-z0-9]+)-to-([a-z0-9]+)\/?$/i);
        if (pathMatch) {
            const langCode = pathMatch[1];
            // 단축 코드 변환 (kr → ko, cn → zh-CN, tw → zh-TW)
            const langMapping = {
                'kr': 'ko',
                'cn': 'zh-CN',
                'tw': 'zh-TW'
            };
            return langMapping[langCode] || langCode;
        }

        // /{언어코드} 형식 (홈페이지)
        const langMatch = pathname.match(/^\/([^\/]+)\/?$/);
        if (langMatch && langMatch[1] !== 'index.html') {
            const langCode = langMatch[1];
            const langMapping = {
                'kr': 'ko',
                'cn': 'zh-CN',
                'tw': 'zh-TW'
            };
            const normalizedLang = langMapping[langCode] || langCode;

            // 지원되는 언어인지 확인
            const supportedLangs = [
                'en', 'de', 'es', 'fr', 'hi', 'id', 'it', 'ko', 'ja',
                'my', 'ms', 'fil', 'pt', 'ru', 'th', 'tr', 'vi',
                'zh-CN', 'zh-TW', 'ar', 'bn'
            ];
            if (supportedLangs.includes(normalizedLang)) {
                return normalizedLang;
            }
        }

        return null;
    }

    detectLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.split('-')[0];
        
        // Supported languages
        const supportedLangs = [
            'en', 'de', 'es', 'fr', 'hi', 'id', 'it', 'ko', 'ja', 
            'my', 'ms', 'fil', 'pt', 'ru', 'th', 'tr', 'vi', 
            'zh-CN', 'zh-TW', 'ar', 'bn'
        ];
        
        return supportedLangs.includes(langCode) ? langCode : 'en';
    }

    async loadTranslations(lang) {
        try {
            const response = await fetch(`/locales/${lang}.json`);
            if (response.ok) {
                this.translations = await response.json();
            } else {
                throw new Error(`Failed to load ${lang}.json`);
            }
        } catch (error) {
            console.warn(`Failed to load translations for ${lang}, falling back to English`);
            if (lang !== 'en') {
                await this.loadTranslations('en');
            }
        }
    }

    t(key, params = {}) {
        let translation = this.getNestedValue(this.translations, key) || key;
        
        // Replace parameters in translation
        Object.keys(params).forEach(param => {
            translation = translation.replace(new RegExp(`{${param}}`, 'g'), params[param]);
        });
        
        return translation;
    }

    getNestedValue(obj, key) {
        return key.split('.').reduce((current, keyPart) => {
            return current && current[keyPart] !== undefined ? current[keyPart] : null;
        }, obj);
    }

    applyTranslations() {
        // Translate elements with data-i18n-key attribute
        const elements = document.querySelectorAll('[data-i18n-key]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n-key');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });

        // Translate elements with data-i18n-placeholder attribute
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        // Translate elements with data-i18n-title attribute
        const titleElements = document.querySelectorAll('[data-i18n-title]');
        titleElements.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });
    }

    updateDirection() {
        const isRTL = this.rtlLanguages.includes(this.currentLang);
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.body.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    }

    updateLanguageSelector() {
        const currentLanguageElement = document.getElementById('current-language');
        if (currentLanguageElement) {
            const languageNames = {
                'en': 'English',
                'de': 'Deutsch',
                'es': 'Español',
                'fr': 'Français',
                'hi': 'हिन्दी / Hindī',
                'id': 'Bahasa Indonesia',
                'it': 'Italiano',
                'ko': '한국어',
                'ja': '日本語',
                'my': 'Myanmar (မြန်မာ)',
                'ms': 'Malay',
                'fil': 'Filipino',
                'pt': 'Português',
                'ru': 'Русский',
                'th': 'ไทย',
                'tr': 'Türkçe',
                'vi': 'Tiếng Việt',
                'zh-CN': '简体中文',
                'zh-TW': '繁體中文',
                'ar': 'عربي',
                'bn': 'বাঙালি'
            };
            
            currentLanguageElement.textContent = languageNames[this.currentLang] || 'English';
        }
    }

    async changeLanguage(lang) {
        if (lang === this.currentLang) return;
        
        this.currentLang = lang;
        localStorage.setItem('language', lang);
        
        await this.loadTranslations(lang);
        this.applyTranslations();
        this.updateDirection();
        this.updateLanguageSelector();
        
        // Emit language change event
        document.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: lang } 
        }));
    }

    // Format numbers according to locale
    formatNumber(number, options = {}) {
        try {
            return new Intl.NumberFormat(this.getLocale(), options).format(number);
        } catch (error) {
            return number.toString();
        }
    }

    // Format dates according to locale
    formatDate(date, options = {}) {
        try {
            return new Intl.DateTimeFormat(this.getLocale(), options).format(date);
        } catch (error) {
            return date.toString();
        }
    }

    // Format file sizes with localized units
    formatFileSize(bytes) {
        if (bytes === 0) return this.t('fileSize.zero');
        
        const k = 1024;
        const sizes = [
            this.t('fileSize.bytes'),
            this.t('fileSize.kb'),
            this.t('fileSize.mb'),
            this.t('fileSize.gb'),
            this.t('fileSize.tb')
        ];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
        
        return `${this.formatNumber(size)} ${sizes[i]}`;
    }

    getLocale() {
        const localeMap = {
            'en': 'en-US',
            'de': 'de-DE',
            'es': 'es-ES',
            'fr': 'fr-FR',
            'hi': 'hi-IN',
            'id': 'id-ID',
            'it': 'it-IT',
            'ko': 'ko-KR',
            'ja': 'ja-JP',
            'my': 'my-MM',
            'ms': 'ms-MY',
            'fil': 'fil-PH',
            'pt': 'pt-PT',
            'ru': 'ru-RU',
            'th': 'th-TH',
            'tr': 'tr-TR',
            'vi': 'vi-VN',
            'zh-CN': 'zh-CN',
            'zh-TW': 'zh-TW',
            'ar': 'ar-SA',
            'bn': 'bn-BD'
        };
        
        return localeMap[this.currentLang] || 'en-US';
    }

    // Get current language
    getCurrentLanguage() {
        return this.currentLang;
    }

    // Check if current language is RTL
    isRTL() {
        return this.rtlLanguages.includes(this.currentLang);
    }

    // Update URL with new language code
    updateURLWithLanguage(newLang) {
        const pathname = window.location.pathname;
        const languageMapping = {
            'ko': 'kr',
            'zh-CN': 'cn',
            'zh-TW': 'tw'
        };

        // Convert to short code for URL
        const urlLang = languageMapping[newLang] || newLang;

        // Supported language codes (including short codes)
        const allLangCodes = [
            'en', 'de', 'es', 'fr', 'hi', 'id', 'it', 'ko', 'kr', 'ja',
            'my', 'ms', 'fil', 'pt', 'ru', 'th', 'tr', 'vi',
            'zh-CN', 'zh-TW', 'cn', 'tw', 'ar', 'bn'
        ];

        // Pattern 1: /{lang}/{from}-to-{to}
        const conversionMatch = pathname.match(/^\/([^\/]+)\/([a-z0-9]+)-to-([a-z0-9]+)\/?$/i);
        if (conversionMatch && allLangCodes.includes(conversionMatch[1])) {
            window.location.href = `/${urlLang}/${conversionMatch[2]}-to-${conversionMatch[3]}`;
            return;
        }

        // Pattern 2: /{from}-to-{to} (no language)
        const conversionOnlyMatch = pathname.match(/^\/([a-z0-9]+)-to-([a-z0-9]+)\/?$/i);
        if (conversionOnlyMatch) {
            window.location.href = `/${urlLang}/${conversionOnlyMatch[1]}-to-${conversionOnlyMatch[2]}`;
            return;
        }

        // Pattern 3: /{lang} (homepage with language)
        const langOnlyMatch = pathname.match(/^\/([^\/]+)\/?$/);
        if (langOnlyMatch && langOnlyMatch[1] !== 'index.html' && allLangCodes.includes(langOnlyMatch[1])) {
            window.location.href = `/${urlLang}`;
            return;
        }

        // Pattern 4: / (root homepage)
        if (pathname === '/' || pathname === '/index.html') {
            window.location.href = `/${urlLang}`;
            return;
        }

        // Default: stay on current page, just change language
        // (for other pages that don't follow the pattern)
    }
}

// Initialize i18n when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    window.i18n = new I18n();

    // Set up language change handlers
    const languageOptions = document.getElementById('language-options');
    if (languageOptions) {
        languageOptions.addEventListener('click', async (e) => {
            if (e.target.dataset.lang) {
                e.preventDefault(); // Prevent default <a> tag behavior
                const newLang = e.target.dataset.lang;

                // Close language selector
                const languageSwitcher = e.target.closest('.language-switcher');
                if (languageSwitcher) {
                    languageSwitcher.classList.remove('open');
                }

                // Update URL with new language (this will navigate)
                window.i18n.updateURLWithLanguage(newLang);

                // If updateURLWithLanguage didn't navigate (stayed on same page),
                // change language without reload
                if (window.location.pathname === window.location.pathname) {
                    await window.i18n.changeLanguage(newLang);
                }
            }
        });
    }
});

// Global translation function
function t(key, params = {}) {
    return window.i18n ? window.i18n.t(key, params) : key;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = I18n;
}