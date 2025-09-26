// Internationalization (i18n) Module for HQMX Converter
class I18n {
    constructor() {
        this.currentLang = 'en';
        this.translations = {};
        this.rtlLanguages = ['ar', 'he', 'fa', 'ur'];
        this.init();
    }

    async init() {
        // Get saved language or detect from browser
        this.currentLang = localStorage.getItem('language') || this.detectLanguage();
        
        // Load translations
        await this.loadTranslations(this.currentLang);
        
        // Apply translations
        this.applyTranslations();
        this.updateDirection();
        this.updateLanguageSelector();
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
            const response = await fetch(`locales/${lang}.json`);
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
}

// Initialize i18n when DOM is loaded
let i18n;

document.addEventListener('DOMContentLoaded', async () => {
    i18n = new I18n();
    
    // Set up language change handlers
    const languageOptions = document.getElementById('language-options');
    if (languageOptions) {
        languageOptions.addEventListener('click', async (e) => {
            if (e.target.dataset.lang) {
                await i18n.changeLanguage(e.target.dataset.lang);
                
                // Close language selector
                const languageSwitcher = e.target.closest('.language-switcher');
                if (languageSwitcher) {
                    languageSwitcher.classList.remove('open');
                }
            }
        });
    }
});

// Global translation function
function t(key, params = {}) {
    return i18n ? i18n.t(key, params) : key;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = I18n;
}