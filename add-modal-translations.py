#!/usr/bin/env python3
import json
import os

# 번역 데이터 (기계 번역 + 검토 필요)
translations = {
    "ja": {
        "title_cancel": "変換の停止",
        "message_cancel": "<strong>{fileName}</strong>の変換を停止しますか？<br>すべての変換進行状況が削除されます。",
        "button_cancel": "キャンセル",
        "button_confirm_cancel": "停止",
        "title_delete": "ファイルの削除",
        "message_delete": "<strong>{fileName}</strong>は現在変換中です。<br>変換を停止してファイルを削除しますか？",
        "button_continue": "変換を続ける",
        "button_confirm_delete": "削除"
    },
    "zh": {
        "title_cancel": "停止转换",
        "message_cancel": "是否要停止 <strong>{fileName}</strong> 的转换？<br>所有转换进度将被删除。",
        "button_cancel": "取消",
        "button_confirm_cancel": "停止",
        "title_delete": "删除文件",
        "message_delete": "<strong>{fileName}</strong> 正在转换中。<br>是否要停止转换并删除文件？",
        "button_continue": "继续转换",
        "button_confirm_delete": "删除"
    },
    "es": {
        "title_cancel": "Detener Conversión",
        "message_cancel": "¿Desea detener la conversión de <strong>{fileName}</strong>?<br>Todo el progreso de conversión será eliminado.",
        "button_cancel": "Cancelar",
        "button_confirm_cancel": "Detener",
        "title_delete": "Eliminar Archivo",
        "message_delete": "<strong>{fileName}</strong> se está convirtiendo actualmente.<br>¿Desea detener la conversión y eliminar el archivo?",
        "button_continue": "Continuar Convirtiendo",
        "button_confirm_delete": "Eliminar"
    },
    "fr": {
        "title_cancel": "Arrêter la Conversion",
        "message_cancel": "Voulez-vous arrêter la conversion de <strong>{fileName}</strong>?<br>Toute la progression de la conversion sera supprimée.",
        "button_cancel": "Annuler",
        "button_confirm_cancel": "Arrêter",
        "title_delete": "Supprimer le Fichier",
        "message_delete": "<strong>{fileName}</strong> est en cours de conversion.<br>Voulez-vous arrêter la conversion et supprimer le fichier?",
        "button_continue": "Continuer la Conversion",
        "button_confirm_delete": "Supprimer"
    },
    "de": {
        "title_cancel": "Konvertierung Stoppen",
        "message_cancel": "Möchten Sie die Konvertierung von <strong>{fileName}</strong> stoppen?<br>Alle Konvertierungsfortschritte werden gelöscht.",
        "button_cancel": "Abbrechen",
        "button_confirm_cancel": "Stoppen",
        "title_delete": "Datei Löschen",
        "message_delete": "<strong>{fileName}</strong> wird gerade konvertiert.<br>Möchten Sie die Konvertierung stoppen und die Datei löschen?",
        "button_continue": "Konvertierung Fortsetzen",
        "button_confirm_delete": "Löschen"
    },
    "pt": {
        "title_cancel": "Parar Conversão",
        "message_cancel": "Deseja parar a conversão de <strong>{fileName}</strong>?<br>Todo o progresso de conversão será excluído.",
        "button_cancel": "Cancelar",
        "button_confirm_cancel": "Parar",
        "title_delete": "Excluir Arquivo",
        "message_delete": "<strong>{fileName}</strong> está sendo convertido no momento.<br>Deseja parar a conversão e excluir o arquivo?",
        "button_continue": "Continuar Convertendo",
        "button_confirm_delete": "Excluir"
    },
    "ru": {
        "title_cancel": "Остановить Конвертацию",
        "message_cancel": "Вы хотите остановить конвертацию <strong>{fileName}</strong>?<br>Весь прогресс конвертации будет удален.",
        "button_cancel": "Отмена",
        "button_confirm_cancel": "Остановить",
        "title_delete": "Удалить Файл",
        "message_delete": "<strong>{fileName}</strong> в данный момент конвертируется.<br>Вы хотите остановить конвертацию и удалить файл?",
        "button_continue": "Продолжить Конвертацию",
        "button_confirm_delete": "Удалить"
    },
    "ar": {
        "title_cancel": "إيقاف التحويل",
        "message_cancel": "هل تريد إيقاف تحويل <strong>{fileName}</strong>؟<br>سيتم حذف جميع تقدم التحويل.",
        "button_cancel": "إلغاء",
        "button_confirm_cancel": "إيقاف",
        "title_delete": "حذف الملف",
        "message_delete": "<strong>{fileName}</strong> قيد التحويل حاليًا.<br>هل تريد إيقاف التحويل وحذف الملف؟",
        "button_continue": "متابعة التحويل",
        "button_confirm_delete": "حذف"
    },
    "hi": {
        "title_cancel": "रूपांतरण रोकें",
        "message_cancel": "क्या आप <strong>{fileName}</strong> का रूपांतरण रोकना चाहते हैं?<br>सभी रूपांतरण प्रगति हटा दी जाएगी।",
        "button_cancel": "रद्द करें",
        "button_confirm_cancel": "रोकें",
        "title_delete": "फ़ाइल हटाएं",
        "message_delete": "<strong>{fileName}</strong> वर्तमान में रूपांतरित हो रही है।<br>क्या आप रूपांतरण रोकना और फ़ाइल हटाना चाहते हैं?",
        "button_continue": "रूपांतरण जारी रखें",
        "button_confirm_delete": "हटाएं"
    },
    "it": {
        "title_cancel": "Interrompi Conversione",
        "message_cancel": "Vuoi interrompere la conversione di <strong>{fileName}</strong>?<br>Tutto il progresso della conversione verrà eliminato.",
        "button_cancel": "Annulla",
        "button_confirm_cancel": "Interrompi",
        "title_delete": "Elimina File",
        "message_delete": "<strong>{fileName}</strong> è attualmente in conversione.<br>Vuoi interrompere la conversione ed eliminare il file?",
        "button_continue": "Continua Conversione",
        "button_confirm_delete": "Elimina"
    },
    "nl": {
        "title_cancel": "Conversie Stoppen",
        "message_cancel": "Wilt u de conversie van <strong>{fileName}</strong> stoppen?<br>Alle conversie voortgang wordt verwijderd.",
        "button_cancel": "Annuleren",
        "button_confirm_cancel": "Stoppen",
        "title_delete": "Bestand Verwijderen",
        "message_delete": "<strong>{fileName}</strong> wordt momenteel geconverteerd.<br>Wilt u de conversie stoppen en het bestand verwijderen?",
        "button_continue": "Doorgaan met Converteren",
        "button_confirm_delete": "Verwijderen"
    },
    "pl": {
        "title_cancel": "Zatrzymaj Konwersję",
        "message_cancel": "Czy chcesz zatrzymać konwersję <strong>{fileName}</strong>?<br>Cały postęp konwersji zostanie usunięty.",
        "button_cancel": "Anuluj",
        "button_confirm_cancel": "Zatrzymaj",
        "title_delete": "Usuń Plik",
        "message_delete": "<strong>{fileName}</strong> jest obecnie konwertowany.<br>Czy chcesz zatrzymać konwersję i usunąć plik?",
        "button_continue": "Kontynuuj Konwersję",
        "button_confirm_delete": "Usuń"
    },
    "tr": {
        "title_cancel": "Dönüştürmeyi Durdur",
        "message_cancel": "<strong>{fileName}</strong> dosyasının dönüştürülmesini durdurmak istiyor musunuz?<br>Tüm dönüştürme ilerlemesi silinecektir.",
        "button_cancel": "İptal",
        "button_confirm_cancel": "Durdur",
        "title_delete": "Dosyayı Sil",
        "message_delete": "<strong>{fileName}</strong> şu anda dönüştürülüyor.<br>Dönüştürmeyi durdurup dosyayı silmek istiyor musunuz?",
        "button_continue": "Dönüştürmeye Devam Et",
        "button_confirm_delete": "Sil"
    },
    "vi": {
        "title_cancel": "Dừng Chuyển Đổi",
        "message_cancel": "Bạn có muốn dừng chuyển đổi <strong>{fileName}</strong>?<br>Tất cả tiến trình chuyển đổi sẽ bị xóa.",
        "button_cancel": "Hủy",
        "button_confirm_cancel": "Dừng",
        "title_delete": "Xóa Tệp",
        "message_delete": "<strong>{fileName}</strong> đang được chuyển đổi.<br>Bạn có muốn dừng chuyển đổi và xóa tệp?",
        "button_continue": "Tiếp Tục Chuyển Đổi",
        "button_confirm_delete": "Xóa"
    },
    "th": {
        "title_cancel": "หยุดการแปลง",
        "message_cancel": "คุณต้องการหยุดการแปลง <strong>{fileName}</strong> หรือไม่?<br>ความคืบหน้าการแปลงทั้งหมดจะถูกลบ",
        "button_cancel": "ยกเลิก",
        "button_confirm_cancel": "หยุด",
        "title_delete": "ลบไฟล์",
        "message_delete": "<strong>{fileName}</strong> กำลังถูกแปลงอยู่<br>คุณต้องการหยุดการแปลงและลบไฟล์หรือไม่?",
        "button_continue": "ดำเนินการแปลงต่อ",
        "button_confirm_delete": "ลบ"
    },
    "id": {
        "title_cancel": "Hentikan Konversi",
        "message_cancel": "Apakah Anda ingin menghentikan konversi <strong>{fileName}</strong>?<br>Semua kemajuan konversi akan dihapus.",
        "button_cancel": "Batal",
        "button_confirm_cancel": "Hentikan",
        "title_delete": "Hapus File",
        "message_delete": "<strong>{fileName}</strong> sedang dikonversi.<br>Apakah Anda ingin menghentikan konversi dan menghapus file?",
        "button_continue": "Lanjutkan Konversi",
        "button_confirm_delete": "Hapus"
    },
    "sv": {
        "title_cancel": "Stoppa Konvertering",
        "message_cancel": "Vill du stoppa konverteringen av <strong>{fileName}</strong>?<br>All konverteringsframsteg kommer att raderas.",
        "button_cancel": "Avbryt",
        "button_confirm_cancel": "Stoppa",
        "title_delete": "Ta Bort Fil",
        "message_delete": "<strong>{fileName}</strong> konverteras för närvarande.<br>Vill du stoppa konverteringen och ta bort filen?",
        "button_continue": "Fortsätt Konvertera",
        "button_confirm_delete": "Ta Bort"
    },
    "da": {
        "title_cancel": "Stop Konvertering",
        "message_cancel": "Vil du stoppe konverteringen af <strong>{fileName}</strong>?<br>Al konverteringsfremgang vil blive slettet.",
        "button_cancel": "Annuller",
        "button_confirm_cancel": "Stop",
        "title_delete": "Slet Fil",
        "message_delete": "<strong>{fileName}</strong> konverteres i øjeblikket.<br>Vil du stoppe konverteringen og slette filen?",
        "button_continue": "Fortsæt Konvertering",
        "button_confirm_delete": "Slet"
    },
    "fi": {
        "title_cancel": "Pysäytä Muunnos",
        "message_cancel": "Haluatko pysäyttää tiedoston <strong>{fileName}</strong> muunnoksen?<br>Kaikki muunnosedistyminen poistetaan.",
        "button_cancel": "Peruuta",
        "button_confirm_cancel": "Pysäytä",
        "title_delete": "Poista Tiedosto",
        "message_delete": "<strong>{fileName}</strong> on parhaillaan muunnoksessa.<br>Haluatko pysäyttää muunnoksen ja poistaa tiedoston?",
        "button_continue": "Jatka Muunnosta",
        "button_confirm_delete": "Poista"
    }
}

# 언어 파일 업데이트
locales_dir = "frontend/locales"

for lang_code, trans in translations.items():
    file_path = os.path.join(locales_dir, f"{lang_code}.json")

    if not os.path.exists(file_path):
        print(f"⚠️  {file_path} not found, skipping...")
        continue

    # 파일 읽기
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # modal 섹션 추가
    data['modal'] = {
        "cancelConversion": {
            "title": trans["title_cancel"],
            "message": trans["message_cancel"],
            "buttonCancel": trans["button_cancel"],
            "buttonConfirm": trans["button_confirm_cancel"]
        },
        "deleteFile": {
            "title": trans["title_delete"],
            "message": trans["message_delete"],
            "buttonCancel": trans["button_continue"],
            "buttonConfirm": trans["button_confirm_delete"]
        }
    }

    # 파일 쓰기
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ {lang_code}.json updated")

print("\n✅ All language files updated!")
