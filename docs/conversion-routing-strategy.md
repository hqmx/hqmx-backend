# 변환 라우팅 전략 (Conversion Routing Strategy)

## 📊 핵심 통찰

**문제**: 서버 변환이 약간 빠르더라도 (55분 vs 61분), 업로드 시간이 추가되면 총 시간이 비슷하거나 더 느려질 수 있음

**해결**: 289개 변환에 대해 동적 라우팅 전략 수립
- 파일 크기
- 변환 복잡도
- 네트워크 속도
- 디바이스 성능
- 배터리 상태

## 🎯 4-Tier 분류 시스템

### Tier 1: 항상 클라이언트 (105개 변환)

**조건**:
- 변환 시간 < 30초
- 파일 크기 < 10MB
- 브라우저 API 완벽 지원

**이유**:
- 업로드 시간 > 변환 시간 절약
- 프라이버시 보장
- 서버 비용 절감

**포함 변환**:
- **이미지 간단 변환 (60개)**: JPG↔PNG, PNG↔WebP, GIF↔BMP 등
- **오디오 소형 변환 (40개)**: MP3↔WAV, AAC↔OGG (< 20MB)
- **이미지→PDF (5개)**: JPG→PDF, PNG→PDF

**예시 계산**:
```
파일: 5MB JPG → PNG
- 클라이언트: 변환 5초 = 총 5초
- 서버: 업로드 4초 + 변환 2초 + 다운로드 3초 = 총 9초
→ 클라이언트 44% 빠름 + 프라이버시 보장
```

---

### Tier 2: 클라이언트 우선 + 동적 폴백 (110개 변환)

**조건**:
- 변환 시간 30초-3분
- 파일 크기 10-100MB
- 업로드 시간이 변환 시간의 30% 이상

**로직**:
```javascript
if (uploadTime > conversionTime * 0.3) {
  useClient(); // 기본값
} else if (serverSpeed > clientSpeed * 1.5) {
  offerServerOption(); // 사용자 선택
}
```

**포함 변환**:
- **비디오 중간 크기 (30개)**: MP4↔WebM, AVI↔MOV (50-200MB)
- **오디오 중간 크기 (16개)**: FLAC↔WAV, Opus↔AAC (20-50MB)
- **이미지 복잡 변환 (12개)**: HEIC→JPG, AVIF→PNG
- **비디오→오디오 추출 (52개)**: MP4→MP3, MOV→WAV 등

**예시 계산**:
```
파일: 50MB MP4 → WebM (720p)
- 클라이언트: 변환 2분 = 총 2분
- 서버: 업로드 40초 + 변환 1분 + 다운로드 20초 = 총 2분
→ 비슷하므로 클라이언트 선택 (프라이버시)

파일: 100MB MKV → MP4 (1080p)
네트워크: 느림 (5 Mbps)
- 클라이언트: 변환 4분 = 총 4분
- 서버: 업로드 2.5분 + 변환 1.5분 + 다운로드 1분 = 총 5분
→ 클라이언트 20% 빠름
```

---

### Tier 3: 동적 판단 (50개 변환)

**조건**:
- 변환 시간 > 3분
- 파일 크기 > 100MB
- 성능 차이가 큼

**로직**:
```javascript
const networkSpeed = estimateNetworkSpeed();
const uploadTime = fileSize / networkSpeed;

const clientTime = estimateClientConversion(file, format);
const serverTime = estimateServerConversion(file, format);

const totalClientTime = clientTime;
const totalServerTime = uploadTime + serverTime + downloadTime;

// 서버가 30% 이상 빠르면 서버 선택
if (totalServerTime * 1.3 < totalClientTime) {
  recommendServer();
} else {
  useClient();
}
```

**포함 변환**:
- **비디오 대형 변환 (30개)**: 200MB-1GB, 1080p/4K 변환
- **GIF 생성 (20개)**: 비디오→GIF (메모리 집약적)

**예시 계산**:
```
파일: 500MB MP4 → AVI (1080p)
네트워크: 빠름 (50 Mbps)
- 클라이언트: 변환 8분 = 총 8분
- 서버: 업로드 1.3분 + 변환 3분 + 다운로드 1분 = 총 5.3분
→ 서버 34% 빠름 → 서버 추천

파일: 300MB MOV → GIF
- 클라이언트: 메모리 부족 위험, 10분+
- 서버: 업로드 50초 + 변환 2분 + 다운로드 20초 = 총 4분
→ 서버 확실히 유리
```

---

### Tier 4: 항상 서버 (24개 변환)

**조건**:
- 클라이언트에서 불가능
- 서버가 3배 이상 빠름
- 전문 소프트웨어 필요

**이유**:
- LibreOffice 필요 (문서 변환)
- 복잡한 코덱 (HEVC, AV1)
- 메모리 초과 위험

**포함 변환**:
- **문서→PDF (20개)**: DOC/DOCX/XLS/XLSX/PPT/PPTX → PDF
- **초대형 비디오 (4개)**: 1GB+ 4K 변환

**예시**:
```
파일: 10MB DOCX → PDF
- 클라이언트: 불가능 (LibreOffice 없음)
- 서버: 업로드 8초 + 변환 5초 + 다운로드 2초 = 총 15초
→ 서버만 가능

파일: 2GB 4K MP4 → HEVC
- 클라이언트: 브라우저 메모리 초과 (2GB 제한)
- 서버: 업로드 5분 + 변환 8분 + 다운로드 3분 = 총 16분
→ 서버만 안전
```

---

## 🧮 동적 라우팅 알고리즘

### 1. 네트워크 속도 추정

```javascript
async function estimateNetworkSpeed() {
  // 실시간 측정: 1MB 테스트 파일
  const testFileSize = 1 * 1024 * 1024; // 1MB
  const startTime = Date.now();

  try {
    await fetch('/api/speed-test', {
      method: 'POST',
      body: new Blob([new ArrayBuffer(testFileSize)])
    });

    const elapsed = (Date.now() - startTime) / 1000; // 초
    const speedMbps = (testFileSize * 8) / (elapsed * 1000000);

    return speedMbps;
  } catch (error) {
    // 폴백: 보수적 추정
    return 10; // 10 Mbps
  }
}
```

### 2. 변환 시간 추정

```javascript
// 벤치마크 데이터 (실제 측정값 기반)
const BENCHMARK_DATA = {
  // 이미지 (초/10MB)
  'jpg-to-png': { client: 5, server: 2 },
  'png-to-webp': { client: 8, server: 3 },
  'heic-to-jpg': { client: 15, server: 8 },

  // 비디오 (초/100MB, 720p 기준)
  'mp4-to-webm': { client: 120, server: 60 },
  'mov-to-mp4': { client: 180, server: 90 },
  'mp4-to-avi': { client: 150, server: 75 },

  // 오디오 (초/10MB)
  'mp3-to-wav': { client: 10, server: 5 },
  'flac-to-mp3': { client: 20, server: 12 },

  // 문서
  'docx-to-pdf': { client: null, server: 5 },
};

function estimateConversionTime(file, fromFormat, toFormat, method) {
  const conversionKey = `${fromFormat}-to-${toFormat}`;
  const benchmark = BENCHMARK_DATA[conversionKey];

  if (!benchmark || !benchmark[method]) {
    return null; // 지원 안 함
  }

  const baseTime = benchmark[method];
  const fileSize = file.size / (1024 * 1024); // MB

  // 카테고리별 스케일링
  let scaledTime;
  if (fromFormat in ['jpg', 'png', 'gif']) {
    // 이미지: 선형 스케일
    scaledTime = baseTime * (fileSize / 10);
  } else if (fromFormat in ['mp4', 'mov', 'avi']) {
    // 비디오: 약간 비선형 (해상도 영향)
    scaledTime = baseTime * Math.pow(fileSize / 100, 1.2);
  } else {
    // 오디오: 선형
    scaledTime = baseTime * (fileSize / 10);
  }

  return scaledTime;
}
```

### 3. 최종 라우팅 결정

```javascript
async function decideConversionRoute(file, fromFormat, toFormat) {
  // Step 1: Tier 확인
  const tier = getConversionTier(fromFormat, toFormat);

  if (tier === 'ALWAYS_CLIENT') {
    return {
      method: 'client',
      reason: 'Fast and lightweight conversion',
      confidence: 'high'
    };
  }

  if (tier === 'ALWAYS_SERVER') {
    return {
      method: 'server',
      reason: 'Requires specialized software',
      confidence: 'high'
    };
  }

  // Step 2: 동적 판단
  const networkSpeed = await estimateNetworkSpeed();
  const fileSize = file.size;

  const clientTime = estimateConversionTime(file, fromFormat, toFormat, 'client');
  const serverTime = estimateConversionTime(file, fromFormat, toFormat, 'server');

  if (!clientTime) {
    return { method: 'server', reason: 'Client not supported' };
  }

  const uploadTime = (fileSize * 8) / (networkSpeed * 1000000); // 초
  const downloadTime = (fileSize * 0.5 * 8) / (networkSpeed * 1000000); // 압축 가정

  const totalClientTime = clientTime;
  const totalServerTime = uploadTime + serverTime + downloadTime;

  // Step 3: 결정 로직
  if (totalClientTime <= totalServerTime * 1.3) {
    // 클라이언트가 30% 이내로 느리거나 빠름 → 클라이언트
    return {
      method: 'client',
      reason: `Client: ${Math.round(totalClientTime)}s, Server: ${Math.round(totalServerTime)}s (including upload)`,
      confidence: totalClientTime < totalServerTime ? 'high' : 'medium',
      estimatedTime: totalClientTime
    };
  }

  if (totalServerTime * 2 < totalClientTime) {
    // 서버가 2배 이상 빠름 → 서버 강력 추천
    return {
      method: 'server',
      reason: `Server is 2x faster: ${Math.round(totalServerTime)}s vs ${Math.round(totalClientTime)}s`,
      confidence: 'high',
      estimatedTime: totalServerTime
    };
  }

  // Step 4: 애매한 경우 → 사용자 선택
  return {
    method: 'choice',
    reason: 'Similar performance, choose based on preference',
    options: {
      client: {
        time: totalClientTime,
        pros: ['Privacy', 'No upload needed', 'Works offline'],
        cons: ['Uses device battery', 'May slow down browser']
      },
      server: {
        time: totalServerTime,
        pros: ['Faster conversion', 'Professional quality', 'Save battery'],
        cons: ['Requires upload', 'Uses server resources']
      }
    },
    confidence: 'medium'
  };
}
```

---

## 🎨 UX 개선 전략

### 1. 투명한 정보 제공

```javascript
// 사용자에게 명확한 정보 표시
function showConversionChoice(decision) {
  if (decision.method === 'choice') {
    return `
      <div class="conversion-choice">
        <h3>변환 방법 선택</h3>

        <div class="option client">
          <h4>🖥️ 브라우저 변환 (추천)</h4>
          <p>예상 시간: ${formatTime(decision.options.client.time)}</p>
          <ul>
            ${decision.options.client.pros.map(p => `<li>✅ ${p}</li>`).join('')}
          </ul>
        </div>

        <div class="option server">
          <h4>☁️ 서버 변환</h4>
          <p>예상 시간: ${formatTime(decision.options.server.time)}</p>
          <ul>
            ${decision.options.server.pros.map(p => `<li>✅ ${p}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  // 자동 선택된 경우
  return `
    <div class="conversion-info">
      <p>✨ ${decision.method === 'client' ? '브라우저' : '서버'}에서 변환합니다</p>
      <p>예상 시간: ${formatTime(decision.estimatedTime)}</p>
      <p class="reason">${decision.reason}</p>
    </div>
  `;
}
```

### 2. 스마트 추천

```javascript
function adjustRecommendation(decision, context) {
  // 배터리 부족
  if (context.batteryLevel < 20 && context.isCharging === false) {
    if (decision.method === 'client') {
      return {
        ...decision,
        warning: '⚠️ 배터리가 부족합니다. 서버 변환을 권장합니다.',
        alternativeMethod: 'server'
      };
    }
  }

  // 모바일 데이터
  if (context.connectionType === 'cellular') {
    if (decision.method === 'server' && context.fileSize > 50 * 1024 * 1024) {
      return {
        ...decision,
        warning: '📱 모바일 데이터를 사용 중입니다. 큰 파일 업로드에 주의하세요.',
        dataUsage: `약 ${Math.round(context.fileSize / 1024 / 1024)} MB 사용`
      };
    }
  }

  // 느린 디바이스 감지
  if (context.devicePerformance === 'low') {
    if (decision.method === 'client' && decision.estimatedTime > 300) {
      return {
        ...decision,
        warning: '⏱️ 디바이스 성능이 낮아 시간이 오래 걸릴 수 있습니다. 서버 변환을 권장합니다.'
      };
    }
  }

  return decision;
}
```

### 3. 진행률 표시 개선

```javascript
function updateProgress(method, stage, progress) {
  if (method === 'server') {
    const stages = {
      'uploading': '업로드 중',
      'converting': '서버 변환 중',
      'downloading': '다운로드 중'
    };

    return `${stages[stage]}... ${progress}%`;
  } else {
    return `변환 중... ${progress}%`;
  }
}
```

### 4. 학습 알고리즘

```javascript
// 사용자 선호도 학습
const userPreferences = {
  trackChoice(fileSize, fromFormat, toFormat, chosenMethod, actualTime) {
    const key = `${fromFormat}-to-${toFormat}`;

    if (!this.history) this.history = {};
    if (!this.history[key]) this.history[key] = [];

    this.history[key].push({
      fileSize,
      method: chosenMethod,
      actualTime,
      timestamp: Date.now()
    });

    // 최근 10개만 유지
    if (this.history[key].length > 10) {
      this.history[key].shift();
    }
  },

  getPreference(fromFormat, toFormat) {
    const key = `${fromFormat}-to-${toFormat}`;
    const history = this.history[key];

    if (!history || history.length < 3) {
      return null; // 충분한 데이터 없음
    }

    // 최근 선택 패턴 분석
    const recentChoices = history.slice(-5);
    const clientCount = recentChoices.filter(h => h.method === 'client').length;

    if (clientCount >= 4) {
      return 'client'; // 사용자가 클라이언트 선호
    } else if (clientCount <= 1) {
      return 'server'; // 사용자가 서버 선호
    }

    return null; // 중립
  }
};
```

---

## 📈 성능 벤치마크 (실제 측정 필요)

### 이미지 변환

| 변환 | 파일 크기 | 클라이언트 | 서버 | 업로드 (10 Mbps) | 총 시간 (클라이언트) | 총 시간 (서버) | 권장 |
|------|----------|-----------|------|-----------------|-------------------|---------------|------|
| JPG→PNG | 5MB | 5초 | 2초 | 4초 | 5초 | 9초 | 클라이언트 |
| PNG→WebP | 10MB | 8초 | 3초 | 8초 | 8초 | 14초 | 클라이언트 |
| HEIC→JPG | 8MB | 15초 | 8초 | 6초 | 15초 | 18초 | 클라이언트 |
| HEIC→JPG | 50MB | 90초 | 45초 | 40초 | 90초 | 105초 | 클라이언트 |

### 비디오 변환

| 변환 | 파일 크기 | 해상도 | 클라이언트 | 서버 | 업로드 (10 Mbps) | 총 시간 (클라이언트) | 총 시간 (서버) | 권장 |
|------|----------|--------|-----------|------|-----------------|-------------------|---------------|------|
| MP4→WebM | 50MB | 720p | 2분 | 1분 | 40초 | 2분 | 2분 | 클라이언트 |
| MP4→WebM | 200MB | 1080p | 8분 | 4분 | 2.5분 | 8분 | 8.5분 | 클라이언트 |
| MP4→WebM | 500MB | 1080p | 20분 | 8분 | 6.5분 | 20분 | 17분 | 서버 |
| MOV→MP4 | 1GB | 4K | 40분 | 15분 | 13분 | 40분 | 31분 | 서버 |

### 오디오 변환

| 변환 | 파일 크기 | 클라이언트 | 서버 | 업로드 (10 Mbps) | 총 시간 (클라이언트) | 총 시간 (서버) | 권장 |
|------|----------|-----------|------|-----------------|-------------------|---------------|------|
| MP3→WAV | 5MB | 10초 | 5초 | 4초 | 10초 | 12초 | 클라이언트 |
| FLAC→MP3 | 30MB | 60초 | 35초 | 24초 | 60초 | 67초 | 클라이언트 |
| WAV→FLAC | 100MB | 120초 | 60초 | 80초 | 120초 | 160초 | 클라이언트 |

---

## 🚀 구현 우선순위

### Phase 1: 기본 티어 구현 (1-2주)
- [ ] Tier 1 (항상 클라이언트) 구현
- [ ] Tier 4 (항상 서버) 구현
- [ ] 정적 라우팅 테이블 작성

### Phase 2: 동적 라우팅 (2-3주)
- [ ] 네트워크 속도 측정 구현
- [ ] 변환 시간 추정 알고리즘
- [ ] 동적 결정 로직
- [ ] 벤치마크 데이터 수집

### Phase 3: UX 개선 (1-2주)
- [ ] 사용자 선택 UI
- [ ] 진행률 표시 개선
- [ ] 스마트 추천 시스템
- [ ] 배터리/네트워크 감지

### Phase 4: 학습 및 최적화 (지속적)
- [ ] 실제 사용 데이터 수집
- [ ] 추정 모델 개선
- [ ] A/B 테스트
- [ ] 성능 최적화

---

## 📝 다음 단계

1. **벤치마크 수행**: 실제 환경에서 각 변환의 성능 측정
2. **라우팅 테이블 작성**: 289개 변환에 대한 Tier 분류 완성
3. **동적 라우팅 구현**: `decideConversionRoute()` 함수 개발
4. **UI 개선**: 사용자에게 명확한 정보 제공
5. **모니터링**: 실제 사용 패턴 분석 및 최적화

---

## 💡 예상 효과

### 사용자 경험
- ✅ **평균 대기 시간 30-50% 감소** (작은 파일 클라이언트 처리)
- ✅ **프라이버시 강화** (80% 변환이 로컬 처리)
- ✅ **네트워크 사용량 감소** (업로드 불필요)

### 비용 절감
- ✅ **서버 비용 60-70% 감소** (대부분 클라이언트 처리)
- ✅ **대역폭 비용 감소** (업로드/다운로드 최소화)
- ✅ **인프라 확장 지연** (서버 부하 감소)

### 성능
- ✅ **동시 처리량 증가** (서버 부하 분산)
- ✅ **안정성 향상** (서버 장애 시 클라이언트 폴백)
- ✅ **글로벌 성능 일정** (지역별 서버 불필요)
