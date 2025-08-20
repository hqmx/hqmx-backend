import { generateFileKey, uploadFile } from '../utils/storage.js';
import { getFormatInfo, isConversionSupported } from '../utils/formats.js';
import { generateTaskId } from '../utils/helpers.js';
import { ConverterFactory } from '../utils/converter-factory.js';
import { 
  isSuspiciousFile, 
  isFileExtensionAllowed, 
  isMimeTypeAllowed,
  isFileSizeValid,
  ALLOWED_FILE_EXTENSIONS,
  ALLOWED_MIME_TYPES 
} from '../utils/security.js';

/**
 * 파일 변환 요청 처리
 * @param {Context} c - Hono 컨텍스트
 * @returns {Promise<Response>}
 */
export async function convertHandler(c) {
  try {
    const env = c.env;
    
    // 요청 검증
    const formData = await c.req.formData();
    const file = formData.get('file');
    const outputFormat = formData.get('outputFormat');
    const settingsStr = formData.get('settings');
    
    if (!file || !outputFormat) {
      return c.json({ 
        error: '파일과 출력 형식이 필요합니다',
        details: { file: !!file, outputFormat: !!outputFormat }
      }, 400);
    }
    
    // 파일 보안 검증
    if (isSuspiciousFile(file.name)) {
      return c.json({ 
        error: '보안상 허용되지 않는 파일입니다',
        filename: file.name
      }, 400);
    }
    
    if (!isFileExtensionAllowed(file.name, ALLOWED_FILE_EXTENSIONS)) {
      return c.json({ 
        error: '지원되지 않는 파일 확장자입니다',
        filename: file.name,
        allowedExtensions: ALLOWED_FILE_EXTENSIONS
      }, 400);
    }
    
    if (!isMimeTypeAllowed(file.type, ALLOWED_MIME_TYPES)) {
      return c.json({ 
        error: '지원되지 않는 파일 형식입니다',
        mimeType: file.type,
        allowedTypes: ALLOWED_MIME_TYPES
      }, 400);
    }
    
    // 파일 크기 검증
    const maxSize = parseInt(env.MAX_FILE_SIZE || '104857600'); // 100MB
    if (!isFileSizeValid(file.size, maxSize)) {
      return c.json({ 
        error: `파일 크기가 유효하지 않습니다. 최대 ${Math.round(maxSize / 1024 / 1024)}MB까지 지원됩니다`,
        maxSize: maxSize,
        actualSize: file.size
      }, 400);
    }
    
    // 파일 형식 검증
    const inputExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const inputFormat = getFormatInfo(inputExtension);
    const outputFormatInfo = getFormatInfo(outputFormat);
    
    if (!inputFormat || !outputFormatInfo) {
      return c.json({ 
        error: '지원되지 않는 파일 형식입니다',
        inputFormat: inputExtension,
        outputFormat: outputFormat,
        supported: !!inputFormat && !!outputFormatInfo
      }, 400);
    }
    
    // 변환 가능성 검증
    if (!ConverterFactory.isConversionSupported(inputExtension, outputFormat)) {
      return c.json({ 
        error: `${inputFormat.category}에서 ${outputFormatInfo.category}로의 변환은 지원되지 않습니다`,
        inputCategory: inputFormat.category,
        outputCategory: outputFormatInfo.category
      }, 400);
    }
    
    // 설정 파싱
    let settings = {};
    if (settingsStr) {
      try {
        settings = JSON.parse(settingsStr);
      } catch (e) {
        return c.json({ 
          error: '잘못된 설정 형식입니다',
          details: e.message
        }, 400);
      }
    }
    
    // 변환 설정 검증
    const settingsValidation = ConverterFactory.validateConversionSettings(
      inputExtension, 
      outputFormat, 
      settings
    );
    
    if (!settingsValidation.valid) {
      return c.json({ 
        error: '잘못된 변환 설정입니다',
        details: settingsValidation.errors
      }, 400);
    }
    
    // 작업 ID 생성
    const taskId = generateTaskId();
    
    // 입력 파일을 R2에 업로드
    const inputFileKey = generateFileKey(file.name, inputExtension);
    const uploadSuccess = await uploadFile(
      env.STORAGE,
      inputFileKey,
      file.stream(),
      {
        contentType: file.type,
        originalName: file.name,
        taskId: taskId,
        inputFormat: inputExtension,
        outputFormat: outputFormat
      }
    );
    
    if (!uploadSuccess) {
      return c.json({ 
        error: '파일 업로드에 실패했습니다'
      }, 500);
    }
    
    // 변환 작업 정보 생성
    const conversionTask = {
      id: taskId,
      status: 'pending',
      progress: 0,
      inputFormat: inputExtension,
      outputFormat: outputFormat,
      settings: settings,
      inputFileKey: inputFileKey,
      outputFileKey: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      originalFileName: file.name
    };
    
    // Durable Object를 통한 진행률 추적 초기화
    const progressTrackerId = env.PROGRESS_TRACKER.idFromName(taskId);
    const progressTracker = env.PROGRESS_TRACKER.get(progressTrackerId);
    
    await progressTracker.fetch('http://localhost/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(conversionTask)
    });
    
    // 백그라운드에서 변환 작업 시작
    c.executionCtx.waitUntil(processConversion(env, conversionTask));
    
    return c.json({ 
      task_id: taskId,
      status: 'pending',
      message: '변환 작업이 시작되었습니다'
    });
    
  } catch (error) {
    console.error('변환 요청 처리 오류:', error);
    return c.json({ 
      error: '내부 서버 오류가 발생했습니다',
      details: error.message
    }, 500);
  }
}

/**
 * 백그라운드 변환 작업 처리
 * @param {Object} env - 환경 변수
 * @param {ConversionTask} task - 변환 작업
 */
async function processConversion(env, task) {
  try {
    // Progress Tracker 가져오기
    const progressTrackerId = env.PROGRESS_TRACKER.idFromName(task.id);
    const progressTracker = env.PROGRESS_TRACKER.get(progressTrackerId);
    
    // 상태 업데이트: 처리 중
    await progressTracker.fetch('http://localhost/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'processing',
        progress: 10,
        message: '변환 도구 준비 중...'
      })
    });
    
    // 실제 변환 로직 실행
    await performActualConversion(env, progressTracker, task);
    
  } catch (error) {
    console.error('변환 처리 오류:', error);
    
    // 오류 상태 업데이트
    const progressTrackerId = env.PROGRESS_TRACKER.idFromName(task.id);
    const progressTracker = env.PROGRESS_TRACKER.get(progressTrackerId);
    
    await progressTracker.fetch('http://localhost/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'error',
        progress: 0,
        message: error.message || '변환 중 오류가 발생했습니다'
      })
    });
  }
}

/**
 * 실제 변환 과정 수행
 * @param {Object} env - 환경 변수
 * @param {DurableObjectStub} progressTracker - 진행률 추적기
 * @param {ConversionTask} task - 변환 작업
 */
async function performActualConversion(env, progressTracker, task) {
  // 변환기 생성
  const converter = ConverterFactory.createConverter(
    task.inputFormat,
    task.outputFormat,
    task.settings
  );
  
  if (!converter) {
    throw new Error('지원되지 않는 변환입니다');
  }
  
  // 진행률 콜백 설정
  converter.setProgressCallback(async (update) => {
    await progressTracker.fetch('http://localhost/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'processing',
        progress: update.progress,
        message: update.message
      })
    });
  });
  
  // 입력 파일 다운로드
  const inputObject = await env.STORAGE.get(task.inputFileKey);
  if (!inputObject) {
    throw new Error('입력 파일을 찾을 수 없습니다');
  }
  
  const inputData = await inputObject.arrayBuffer();
  
  // 변환 실행
  const outputData = await converter.convert(inputData);
  
  // 출력 파일 키 생성
  const outputFileKey = generateFileKey(
    task.originalFileName,
    task.outputFormat
  );
  
  // 출력 파일 업로드
  const uploadSuccess = await uploadFile(
    env.STORAGE,
    outputFileKey,
    outputData,
    {
      contentType: `application/octet-stream`, // 실제로는 형식에 맞는 MIME 타입 사용
      taskId: task.id,
      inputFormat: task.inputFormat,
      outputFormat: task.outputFormat
    }
  );
  
  if (!uploadSuccess) {
    throw new Error('출력 파일 업로드에 실패했습니다');
  }
  
  // 최종 완료 상태 업데이트
  await progressTracker.fetch('http://localhost/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'completed',
      progress: 100,
      message: '변환이 완료되었습니다!',
      outputFileKey: outputFileKey
    })
  });
}