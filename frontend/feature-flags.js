/**
 * Feature Flags Configuration
 * 기능 활성화/비활성화를 중앙에서 관리
 */

const FEATURES = {
    // Social Media 다운로드 기능 (YouTube, TikTok 등)
    SOCIAL_MEDIA: false,  // true로 변경하면 활성화

    // 향후 추가 기능들
    CLOUD_STORAGE: true,   // Dropbox, Google Drive
    BATCH_CONVERSION: true, // 배치 변환
    ADVANCED_SETTINGS: true, // 고급 설정

    // 실험적 기능
    AI_ENHANCEMENT: false, // AI 기반 향상 (미래)
    REALTIME_PREVIEW: false // 실시간 미리보기 (미래)
};

// 전역으로 사용 가능하도록
window.FEATURES = FEATURES;
