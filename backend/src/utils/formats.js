// 지원되는 파일 형식 및 변환 도구 매핑

/**
 * 지원되는 파일 형식 정의
 * @type {Record<string, SupportedFormat>}
 */
export const SUPPORTED_FORMATS = {
  // 비디오 형식
  'mp4': { extension: 'mp4', mimeType: 'video/mp4', category: 'video', tools: ['ffmpeg'] },
  'avi': { extension: 'avi', mimeType: 'video/x-msvideo', category: 'video', tools: ['ffmpeg'] },
  'mov': { extension: 'mov', mimeType: 'video/quicktime', category: 'video', tools: ['ffmpeg'] },
  'mkv': { extension: 'mkv', mimeType: 'video/x-matroska', category: 'video', tools: ['ffmpeg'] },
  'webm': { extension: 'webm', mimeType: 'video/webm', category: 'video', tools: ['ffmpeg'] },
  'flv': { extension: 'flv', mimeType: 'video/x-flv', category: 'video', tools: ['ffmpeg'] },
  'wmv': { extension: 'wmv', mimeType: 'video/x-ms-wmv', category: 'video', tools: ['ffmpeg'] },
  '3gp': { extension: '3gp', mimeType: 'video/3gpp', category: 'video', tools: ['ffmpeg'] },
  'm4v': { extension: 'm4v', mimeType: 'video/x-m4v', category: 'video', tools: ['ffmpeg'] },
  'mpg': { extension: 'mpg', mimeType: 'video/mpeg', category: 'video', tools: ['ffmpeg'] },
  'mpeg': { extension: 'mpeg', mimeType: 'video/mpeg', category: 'video', tools: ['ffmpeg'] },
  'ogv': { extension: 'ogv', mimeType: 'video/ogg', category: 'video', tools: ['ffmpeg'] },

  // 오디오 형식
  'mp3': { extension: 'mp3', mimeType: 'audio/mpeg', category: 'audio', tools: ['ffmpeg'] },
  'wav': { extension: 'wav', mimeType: 'audio/wav', category: 'audio', tools: ['ffmpeg'] },
  'flac': { extension: 'flac', mimeType: 'audio/flac', category: 'audio', tools: ['ffmpeg'] },
  'aac': { extension: 'aac', mimeType: 'audio/aac', category: 'audio', tools: ['ffmpeg'] },
  'ogg': { extension: 'ogg', mimeType: 'audio/ogg', category: 'audio', tools: ['ffmpeg'] },
  'm4a': { extension: 'm4a', mimeType: 'audio/mp4', category: 'audio', tools: ['ffmpeg'] },
  'wma': { extension: 'wma', mimeType: 'audio/x-ms-wma', category: 'audio', tools: ['ffmpeg'] },
  'aiff': { extension: 'aiff', mimeType: 'audio/aiff', category: 'audio', tools: ['ffmpeg'] },
  'au': { extension: 'au', mimeType: 'audio/basic', category: 'audio', tools: ['ffmpeg'] },
  'ra': { extension: 'ra', mimeType: 'audio/x-realaudio', category: 'audio', tools: ['ffmpeg'] },
  'amr': { extension: 'amr', mimeType: 'audio/amr', category: 'audio', tools: ['ffmpeg'] },
  'ac3': { extension: 'ac3', mimeType: 'audio/ac3', category: 'audio', tools: ['ffmpeg'] },

  // 이미지 형식
  'jpg': { extension: 'jpg', mimeType: 'image/jpeg', category: 'image', tools: ['imagemagick'] },
  'jpeg': { extension: 'jpeg', mimeType: 'image/jpeg', category: 'image', tools: ['imagemagick'] },
  'png': { extension: 'png', mimeType: 'image/png', category: 'image', tools: ['imagemagick'] },
  'gif': { extension: 'gif', mimeType: 'image/gif', category: 'image', tools: ['imagemagick'] },
  'webp': { extension: 'webp', mimeType: 'image/webp', category: 'image', tools: ['imagemagick'] },
  'svg': { extension: 'svg', mimeType: 'image/svg+xml', category: 'image', tools: ['imagemagick'] },
  'bmp': { extension: 'bmp', mimeType: 'image/bmp', category: 'image', tools: ['imagemagick'] },
  'tiff': { extension: 'tiff', mimeType: 'image/tiff', category: 'image', tools: ['imagemagick'] },
  'tga': { extension: 'tga', mimeType: 'image/x-tga', category: 'image', tools: ['imagemagick'] },
  'ico': { extension: 'ico', mimeType: 'image/x-icon', category: 'image', tools: ['imagemagick'] },
  'psd': { extension: 'psd', mimeType: 'image/vnd.adobe.photoshop', category: 'image', tools: ['imagemagick'] },
  'raw': { extension: 'raw', mimeType: 'image/x-canon-cr2', category: 'image', tools: ['imagemagick'] },

  // 문서 형식
  'pdf': { extension: 'pdf', mimeType: 'application/pdf', category: 'document', tools: ['libreoffice', 'imagemagick'] },
  'doc': { extension: 'doc', mimeType: 'application/msword', category: 'document', tools: ['libreoffice'] },
  'docx': { extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: 'document', tools: ['libreoffice'] },
  'ppt': { extension: 'ppt', mimeType: 'application/vnd.ms-powerpoint', category: 'document', tools: ['libreoffice'] },
  'pptx': { extension: 'pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', category: 'document', tools: ['libreoffice'] },
  'xls': { extension: 'xls', mimeType: 'application/vnd.ms-excel', category: 'document', tools: ['libreoffice'] },
  'xlsx': { extension: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', category: 'document', tools: ['libreoffice'] },
  'txt': { extension: 'txt', mimeType: 'text/plain', category: 'document', tools: ['libreoffice'] },
  'rtf': { extension: 'rtf', mimeType: 'application/rtf', category: 'document', tools: ['libreoffice'] },
  'odt': { extension: 'odt', mimeType: 'application/vnd.oasis.opendocument.text', category: 'document', tools: ['libreoffice'] },
  'ods': { extension: 'ods', mimeType: 'application/vnd.oasis.opendocument.spreadsheet', category: 'document', tools: ['libreoffice'] },
  'odp': { extension: 'odp', mimeType: 'application/vnd.oasis.opendocument.presentation', category: 'document', tools: ['libreoffice'] },

  // 아카이브 형식  
  'zip': { extension: 'zip', mimeType: 'application/zip', category: 'archive', tools: ['7zip'] },
  'rar': { extension: 'rar', mimeType: 'application/vnd.rar', category: 'archive', tools: ['7zip'] },
  '7z': { extension: '7z', mimeType: 'application/x-7z-compressed', category: 'archive', tools: ['7zip'] },
  'tar': { extension: 'tar', mimeType: 'application/x-tar', category: 'archive', tools: ['7zip'] },
  'gz': { extension: 'gz', mimeType: 'application/gzip', category: 'archive', tools: ['7zip'] },
  'bz2': { extension: 'bz2', mimeType: 'application/x-bzip2', category: 'archive', tools: ['7zip'] },
  'xz': { extension: 'xz', mimeType: 'application/x-xz', category: 'archive', tools: ['7zip'] },
  'tar.gz': { extension: 'tar.gz', mimeType: 'application/x-tar+gzip', category: 'archive', tools: ['7zip'] },
  'tar.bz2': { extension: 'tar.bz2', mimeType: 'application/x-tar+bzip2', category: 'archive', tools: ['7zip'] },
  'tar.xz': { extension: 'tar.xz', mimeType: 'application/x-tar+xz', category: 'archive', tools: ['7zip'] }
};

/**
 * 파일 확장자로 형식 정보 가져오기
 * @param {string} extension - 파일 확장자
 * @returns {SupportedFormat | null}
 */
export function getFormatInfo(extension) {
  const normalizedExt = extension.toLowerCase().replace('.', '');
  return SUPPORTED_FORMATS[normalizedExt] || null;
}

/**
 * 변환 가능한지 확인
 * @param {string} inputFormat - 입력 형식
 * @param {string} outputFormat - 출력 형식  
 * @returns {boolean}
 */
export function isConversionSupported(inputFormat, outputFormat) {
  const inputInfo = getFormatInfo(inputFormat);
  const outputInfo = getFormatInfo(outputFormat);
  
  if (!inputInfo || !outputInfo) {
    return false;
  }
  
  // 같은 카테고리 내에서는 변환 가능
  if (inputInfo.category === outputInfo.category) {
    return true;
  }
  
  // 특별한 변환 규칙들
  const specialConversions = [
    // 비디오에서 오디오 추출
    { from: 'video', to: 'audio' },
    // 문서를 이미지로 변환
    { from: 'document', to: 'image' },
    // 이미지를 문서로 변환 (OCR)
    { from: 'image', to: 'document' }
  ];
  
  return specialConversions.some(rule => 
    rule.from === inputInfo.category && rule.to === outputInfo.category
  );
}

/**
 * 카테고리별 형식 목록 가져오기
 * @param {string} category - 카테고리
 * @returns {string[]}
 */
export function getFormatsByCategory(category) {
  return Object.entries(SUPPORTED_FORMATS)
    .filter(([, info]) => info.category === category)
    .map(([ext]) => ext);
}