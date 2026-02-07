import os
import json

json_path = 'games.json'
if not os.path.exists(json_path):
    print("games.json not found")
    exit()

with open(json_path, 'r', encoding='utf-8') as f:
    games = json.load(f)

updated_count = 0
for game in games:
    thumb_path = game['thumb']
    # التحقق من وجود الملف محلياً
    if not os.path.exists(thumb_path):
        # محاولة البحث عن أيقونة بديلة داخل مجلد اللعبة
        game_folder = os.path.dirname(thumb_path)
        found_alternative = False
        if os.path.exists(game_folder):
            for root, dirs, files in os.walk(game_folder):
                for file in files:
                    if file.lower() in ['icon.png', 'icon.jpg', 'thumbnail.png', 'logo.png']:
                        game['thumb'] = os.path.join(root, file)
                        found_alternative = True
                        updated_count += 1
                        break
                if found_alternative: break
        
        if not found_alternative:
            # إذا لم نجد أيقونة، نتركها كما هي وسيتعامل معها JavaScript بصورة افتراضية
            pass

with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(games, f, ensure_ascii=False, indent=4)

print(f"Verified icons. Updated {updated_count} paths.")
