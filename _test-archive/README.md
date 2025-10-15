# 테스트 파일 아카이브

**아카이브 일시**: 2025-10-15
**총 파일 수**: 49개
**목적**: 기존 테스트 스크립트 및 결과 파일 보관

## 📁 폴더 구조

이 폴더에는 HQMX Converter의 초기 테스트 과정에서 생성된 파일들이 보관되어 있습니다.

## 📄 포함된 파일 유형

### 1. 테스트 스크립트 (`.js`)
- `test-all-conversions.js` - 전체 변환 테스트
- `test-remaining-conversions.js` - 남은 변환만 테스트
- `test-single-conversion.js` - 단일 변환 테스트
- `test-fixed-conversions.js` - 수정된 변환 테스트
- `test-cross-category.js` - 크로스 카테고리 테스트
- `test-modal-workflow.js` - 모달 워크플로우 테스트
- 기타 다양한 테스트 스크립트들

### 2. 로그 파일 (`.log`)
- `test-output.log` - 테스트 출력 로그
- `test-remaining.log` - 남은 테스트 로그
- `test-fixed.log` - 수정된 테스트 로그
- `cross-category-test.log` - 크로스 카테고리 테스트 로그
- `debug-output.log` - 디버그 출력
- 기타 출력 로그 파일들

### 3. 리포트 (`.md`, `.json`)
- `test-remaining-report.md` - 남은 테스트 리포트
- `conversion-test-report.md` - 변환 테스트 리포트
- `test-remaining-results.json` - 테스트 결과 JSON
- `debug-results.json` - 디버그 결과

### 4. 스크린샷 (`.png`)
- `debug-*.png` - 디버그 스크린샷들
- `step-*.png` - 단계별 스크린샷
- `modal-test-*.png` - 모달 테스트 스크린샷
- 기타 테스트 스크린샷들

### 5. Python 스크립트 (`.py`)
- `remove-video-conversions.py` - 비디오 변환 제거 스크립트
- `remove-audio-conversions.py` - 오디오 변환 제거 스크립트

### 6. 백업 파일
- `conversions.json.backup*` - conversions.json 백업 파일들
- `test-output-partial.log.backup` - 부분 로그 백업

### 7. 기타 파일
- `page-structure.html` - 페이지 구조 분석
- `debug-format-buttons.js` - 포맷 버튼 디버그

## 🚀 새로운 테스트 시스템

기존 테스트 파일들을 대체하는 새로운 통합 테스트 시스템이 구축되었습니다:

### 현재 사용 중인 파일
- **`test-list.md`** - 54개 변환 체크리스트
- **`test-comprehensive.js`** - 포괄적인 통합 테스트 스크립트
- **`generate-dummy-files.js`** - 더미 파일 생성 유틸리티

### 주요 개선사항
1. **안정성**: 브라우저 닫힘 문제 해결
2. **자동화**: test-list.md 자동 업데이트
3. **진행률**: 실시간 진행률 및 예상 시간 표시
4. **필터링**: 카테고리별, 형식별 필터링 지원
5. **에러 처리**: 스크린샷 자동 캡처

## 📝 참고사항

이 폴더의 파일들은 참고용으로만 보관되며, 더 이상 사용되지 않습니다.
새로운 테스트를 실행하려면 프로젝트 루트의 `test-comprehensive.js`를 사용하세요.

## 🗑️ 정리 안내

이 폴더는 필요시 삭제 가능합니다. 하지만 테스트 기록 및 참고 자료로 보관하는 것을 권장합니다.

```bash
# 아카이브 폴더 전체 삭제 (선택사항)
rm -rf _test-archive/
```

---

**마지막 업데이트**: 2025-10-15
