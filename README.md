# Haven Ankara: Çay, Döner ve Code Jam

Hack Club Haven Ankara için yapılmış, hikâyeli 2D pixel art aksiyon-platform oyunu.
Code jam teması **BOUNCE BACK**: Akın, maskot kirpi Devin ile birlikte Bug Lord'un kaçırdığı Özgür'ün peşine düşer. Demo çöker, ekip düşer, ama her seferinde geri sekip kalkar.

## ▶ Oyna

**https://akintaha2010-cloud.github.io/g-k-z-n-sol-ta-a-/**

Yedek link: https://raw.githack.com/akintaha2010-cloud/g-k-z-n-sol-ta-a-/main/index.html

## Modlar

- **MACERA:** 5 bölümlük hikâye modu (Kapılar Açılıyor, Kızılay Kaosu, Tunalı Görevi, Sessiz Yürüyüş, Showcase Finali). Bölümler oynadıkça açılır.
- **HİKÂYE:** Gördüğün cutscene'leri tekrar izle.
- **KALE KAPMACA:** Kale avlusunda 3 bota karşı dövüş. "Son Kalan Kazanır" ya da "Taç Kapışı".
- **ÇOK OYUNCULU:** Oda kodlu online maç (en fazla 4 kişi) ya da aynı klavyede iki kişi. "KARAKTERİM" ile kendi karakterini yap.

**Oyna:** `index.html` dosyasını bir web sunucusundan aç (ör. GitHub Pages ya da `python3 -m http.server`).
Derleme adımı ve bağımlılık yok; bütün grafikler ve sesler kodla üretilir.

## İçerik

- 5 bölüm: **Kapılar Açılıyor** (Çankaya Gençlik Merkezi), **Kızılay Kaosu**, **Tunalı Görevi**, **Sessiz Yürüyüş** (Anıtkabir yolu, savaşsız yürüyüş) ve **Showcase Finali**
- Bosslar: Deadline Goblin, Döner Overlord, Spam Mage (iki aşamalı) ve üç formlu Bug Lord
- Motor içi sinematikler: konuşma balonları, kamera hareketleri, boss tanıtımları; **Hikâye** menüsünden tekrar izlenir
- **GERİ SEK:** darbe yedikten sonra yere değmeden (ya da değdiği anda) zıplarsan geri seker, kısa süre dokunulmaz olur ve biraz enerji kazanırsın
- Düşmanlar: Glitch Slime, Merge Conflict Imp, Spam Bot, Laptop Şövalyesi, Yorum Trolü
- Üçlü kombo, tekme, havaya kaldırma, hava saldırısı, yere çakılma, atılma, "Ship It" özel saldırısı
- Silahlar: topaç, sapan, klavye. Güçlendirmeler: çay, döner, simit
- Zıplama yayları, arena dalgaları, kayıt noktaları, gizli rozetler, hareketli platformlar, dükkân ve otomatik kayıt
- Klavye ve dokunmatik kontroller; telefon, tablet ve masaüstünde çalışır

## Kontroller

| Tuş | İşlev |
| --- | --- |
| A / D veya oklar | Yürü |
| Boşluk / W | Zıpla (iki kez) |
| J | Yumruk (üçlü kombo) |
| K | Tekme, havada yere çakıl |
| S + K | Havaya kaldır |
| Shift | Atıl |
| L | Silahı fırlat |
| Q | Ship It (enerji dolunca) |
| S + Boşluk | Platformdan in |
| Esc | Duraklat |
| Darbe sonrası Boşluk | GERİ SEK (yere değmeden zıpla) |

## Kod yapısı

- `src/gfx.js` piksel tamponu, piksel font
- `src/heroes.js` insan biçimli karakterlerin sprite üreticisi
- `src/art.js` düşmanlar, eşyalar, karolar, arka planlar
- `src/levels.js` bölüm düzenleri ve ipuçları
- `src/story.js` sinematik senaryoları
- `src/cutscene.js` sinematik oynatıcı
- `src/game.js` fizik, dövüş, düşman yapay zekâsı, çizim
- `src/ui.js` HUD, menüler ve ekranlar
- `src/audio.js` ses efektleri ve müzik
- `src/main.js` giriş, kayıt, oyun akışı
