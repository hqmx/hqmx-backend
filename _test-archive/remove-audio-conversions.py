#!/usr/bin/env python3
"""
conversions.json에서 오디오 변환을 제거하는 스크립트
AudioContext API 제약과 실제 인코딩 불가능으로 인한 제거
"""
import json

# conversions.json 읽기
with open('frontend/_scripts/conversions.json', 'r', encoding='utf-8') as f:
    conversions = json.load(f)

print(f"🔍 원본 변환 개수: {len(conversions)}")

# 오디오 변환 제거
audio_removed = []
filtered_conversions = []

for conv in conversions:
    from_cat = conv.get('fromCategory')
    to_cat = conv.get('toCategory')

    # audio 관련 변환은 모두 제거
    if from_cat == 'audio' or to_cat == 'audio':
        audio_removed.append(f"{conv['from']} → {conv['to']}")
    else:
        filtered_conversions.append(conv)

print(f"\n❌ 제거된 오디오 변환 ({len(audio_removed)}개):")
for i, conv in enumerate(audio_removed, 1):
    print(f"  {i}. {conv}")

print(f"\n✅ 남은 변환 개수: {len(filtered_conversions)}")
print(f"  - 이미지 변환: {sum(1 for c in filtered_conversions if c['fromCategory'] == 'image' and c['toCategory'] == 'image')}")
print(f"  - 이미지 ↔ 문서: {sum(1 for c in filtered_conversions if (c['fromCategory'] == 'image' and c['toCategory'] == 'document') or (c['fromCategory'] == 'document' and c['toCategory'] == 'image'))}")
print(f"  - 문서 변환: {sum(1 for c in filtered_conversions if c['fromCategory'] == 'document' and c['toCategory'] == 'document')}")

# conversions.json에 저장
with open('frontend/_scripts/conversions.json', 'w', encoding='utf-8') as f:
    json.dump(filtered_conversions, f, indent=2, ensure_ascii=False)
    f.write('\n')  # 파일 끝에 개행 추가

print(f"\n💾 conversions.json 업데이트 완료!")
print(f"📦 백업: conversions.json.backup-before-audio-removal")
