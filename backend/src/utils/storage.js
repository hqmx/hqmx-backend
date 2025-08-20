// Cloudflare R2 스토리지 유틸리티 함수들

/**
 * 파일을 R2에 업로드
 * @param {R2Bucket} bucket - R2 버킷
 * @param {string} key - 파일 키  
 * @param {ReadableStream|ArrayBuffer|string} data - 파일 데이터
 * @param {Object} metadata - 메타데이터
 * @returns {Promise<boolean>}
 */
export async function uploadFile(bucket, key, data, metadata = {}) {
  try {
    await bucket.put(key, data, {
      httpMetadata: {
        contentType: metadata.contentType || 'application/octet-stream',
        cacheControl: 'public, max-age=3600'
      },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        ...metadata
      }
    });
    return true;
  } catch (error) {
    console.error('파일 업로드 실패:', error);
    return false;
  }
}

/**
 * R2에서 파일 다운로드
 * @param {R2Bucket} bucket - R2 버킷
 * @param {string} key - 파일 키
 * @returns {Promise<R2Object | null>}
 */
export async function downloadFile(bucket, key) {
  try {
    const object = await bucket.get(key);
    return object;
  } catch (error) {
    console.error('파일 다운로드 실패:', error);
    return null;
  }
}

/**
 * R2에서 파일 삭제
 * @param {R2Bucket} bucket - R2 버킷
 * @param {string} key - 파일 키
 * @returns {Promise<boolean>}
 */
export async function deleteFile(bucket, key) {
  try {
    await bucket.delete(key);
    return true;
  } catch (error) {
    console.error('파일 삭제 실패:', error);
    return false;
  }
}

/**
 * 만료된 파일들 정리
 * @param {R2Bucket} bucket - R2 버킷
 * @param {number} retentionHours - 보존 시간 (시간)
 * @returns {Promise<number>}
 */
export async function cleanupExpiredFiles(bucket, retentionHours = 24) {
  try {
    const cutoffDate = new Date(Date.now() - (retentionHours * 60 * 60 * 1000));
    const objects = await bucket.list();
    
    let deletedCount = 0;
    
    for (const object of objects.objects || []) {
      if (object.uploaded < cutoffDate) {
        await deleteFile(bucket, object.key);
        deletedCount++;
      }
    }
    
    console.log(`정리된 만료 파일 수: ${deletedCount}`);
    return deletedCount;
  } catch (error) {
    console.error('파일 정리 실패:', error);
    return 0;
  }
}

/**
 * 고유한 파일 키 생성
 * @param {string} originalName - 원본 파일명
 * @param {string} extension - 파일 확장자
 * @returns {string}
 */
export function generateFileKey(originalName, extension) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${timestamp}_${random}_${safeName}.${extension}`;
}

/**
 * 파일 키에서 정보 추출
 * @param {string} key - 파일 키
 * @returns {Object}
 */
export function parseFileKey(key) {
  const parts = key.split('_');
  if (parts.length >= 3) {
    const timestamp = parseInt(parts[0]);
    const random = parts[1];
    const nameWithExt = parts.slice(2).join('_');
    const lastDotIndex = nameWithExt.lastIndexOf('.');
    const name = lastDotIndex > 0 ? nameWithExt.substring(0, lastDotIndex) : nameWithExt;
    const extension = lastDotIndex > 0 ? nameWithExt.substring(lastDotIndex + 1) : '';
    
    return {
      timestamp,
      random,
      name,
      extension,
      uploadedAt: new Date(timestamp)
    };
  }
  
  return {
    timestamp: 0,
    random: '',
    name: key,
    extension: '',
    uploadedAt: new Date(0)
  };
}