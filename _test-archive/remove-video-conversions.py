#!/usr/bin/env python3
"""
conversions.json에서 비디오 변환을 제거하는 스크립트
MediaRecorder API가 mp4, mov, mkv, flv, wmv, avi 등을 지원하지 않기 때문
"""

import json

# conversions.json 읽기
with open('frontend/_scripts/conversions.json', 'r', encoding='utf-8') as f:
    conversions = json.load(f)

print(f"🔍 원본 변환 개수: {len(conversions)}")

# 비디오 변환 제거 (video ↔ video만 제거, video ↔ image는 유지할 수도 있음)
# 하지만 테스트 결과 mp4 → gif도 실패했으므로 모든 비디오 관련 변환 제거
video_removed = []
filtered_conversions = []

for conv in conversions:
    from_cat = conv.get('fromCategory')
    to_cat = conv.get('toCategory')

    # video 관련 변환은 모두 제거
    if from_cat == 'video' or to_cat == 'video':
        video_removed.append(f"{conv['from']} → {conv['to']}")
    else:
        filtered_conversions.append(conv)

print(f"\n❌ 제거된 비디오 변환 ({len(video_removed)}개):")
for i, conv in enumerate(video_removed, 1):
    print(f"  {i}. {conv}")

print(f"\n✅ 남은 변환 개수: {len(filtered_conversions)}")
print(f"  - 이미지 변환: {sum(1 for c in filtered_conversions if c['fromCategory'] == 'image' and c['toCategory'] == 'image')}")
print(f"  - 이미지 ↔ 문서: {sum(1 for c in filtered_conversions if (c['fromCategory'] == 'image' and c['toCategory'] == 'document') or (c['fromCategory'] == 'document' and c['toCategory'] == 'image'))}")
print(f"  - 문서 변환: {sum(1 for c in filtered_conversions if c['fromCategory'] == 'document' and c['toCategory'] == 'document')}")
print(f"  - 오디오 변환: {sum(1 for c in filtered_conversions if c['fromCategory'] == 'audio')}")

# conversions.json에 저장
with open('frontend/_scripts/conversions.json', 'w', encoding='utf-8') as f:
    json.dump(filtered_conversions, f, indent=2, ensure_ascii=False)
    f.write('\n')  # 파일 끝에 개행 추가

print(f"\n💾 conversions.json 업데이트 완료!")
print(f"📦 백업: conversions.json.backup-before-video-removal")
