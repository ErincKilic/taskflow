# TaskFlow — Kanban Proje Yönetim Tahtası

Sürükle-bırak, kalıcı sıralama, kimlik doğrulama ve mobil uyumluluk odaklı bir Kanban board uygulaması.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Supabase](https://img.shields.io/badge/Supabase-Auth+Postgres-green)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black)

## Canlı Demo

[taskflow-xxx.vercel.app](https://taskflow-rho-one.vercel.app/auth)

## Özellikler

### Temel
- **Kimlik doğrulama** — Supabase Auth ile e-posta/şifre kayıt ve giriş
- **Board yönetimi** — Oluştur, sil; her board varsayılan 3 sütunla başlar
- **Sütun yönetimi** — Ekle, sil, çift tıkla yeniden adlandır, dinamik renk ataması
- **Kart yönetimi** — Ekle, düzenle (başlık + açıklama), sil, sütunlar arası taşı
- **Sürükle-bırak** — Custom pointer events ile (mobil + masaüstü)
- **Kalıcı sıralama** — Fractional positioning, sayfa yenilemede korunur

### Kart Detayları
- **Teslim tarihi (Due Date)** — Tarih seçici ile atanır; kartlarda renkli rozet:
  - 🔴 Kırmızı: süresi geçmiş
  - 🟡 Sarı: 2 gün içinde
  - ⚪ Gri: uzak tarih
- **Renk etiketleri (Labels)** — 6 renk seçeneği: Acil, Önemli, Orta, Düşük, Bilgi, Fikir

### UX İyileştirmeleri
- **Kart arama** — Board header'ında anlık filtreleme (başlık ve açıklama üzerinden)
- **Silme onayı** — Sütun silinmeden önce onay dialogu (içindeki kart sayısını gösterir)
- **Mobil uyumluluk** — Touch delay (200ms), drag handle, responsive yatay scroll
- **Görsel ipuçları** — Sürükleme sırasında overlay (döndürme + gölge), drop indicator (mavi çizgi), kaynak kart placeholder
- **Otomatik scroll** — Kart kenar yakınına sürüklendiğinde yatay kaydırma
- **Dinamik sütun renkleri** — Her sütun sırasına göre farklı renk alır

### Güvenlik
- **Row Level Security (RLS)** — Her kullanıcı yalnızca kendi verilerini görebilir
- **Middleware koruması** — Giriş yapmamış kullanıcılar auth sayfasına yönlendirilir

## Mimari Kararlar

### Neden Custom Pointer Events?

| Seçenek | Karar |
|---------|-------|
| HTML5 Drag & Drop | ❌ Mobilde çalışmaz, stil sınırlı |
| react-beautiful-dnd | ❌ Artık bakım yapılmıyor (deprecated) |
| @hello-pangea/dnd | ⚠️ Fork, aktif ama sınırlı esneklik |
| **Custom Pointer Events (dnd-kit yaklaşımı)** | ✅ Tam kontrol, mobil uyumlu, hafif |

dnd-kit'in çekirdek mantığını (pointer sensor, activation constraint, overlay pattern) custom olarak implemente ettik. Avantajları:
- Sıfır harici bağımlılık (bundle boyutu küçük)
- Mobil ve masaüstü aynı kodla çalışır
- Drag overlay, drop indicator gibi görsel ipuçları üzerinde tam kontrol
- Touch: 200ms basılı tutma aktivasyonu, 8px hareket toleransı (scroll ile çakışmayı önler)
- Mouse: 5px mesafe ile aktivasyon

### Neden Fractional Positioning?

Integer sıralama (0, 1, 2, 3) kullanılsaydı her taşıma işleminde tüm kartların sırası yeniden hesaplanması gerekirdi → O(n). Bunun yerine **float position** kullanıyoruz:

```
Kart A: position = 65536
Kart B: position = 131072
→ Araya ekleme: position = (65536 + 131072) / 2 = 98304
→ Sadece 1 satır güncellenir: O(1)
```

Bu yaklaşım, modern ürünlerde sık kullanılan araya ekleme stratejilerine benzer şekilde çalışır. Teorik olarak ~52 ardışık aynı noktaya ekleme sonrası precision kaybı olabilir (IEEE 754 limiti) ama pratik kullanımda bu aşılmaz.

### Optimistic Updates

Tüm mutasyonlar önce UI'da uygulanır, sonra arka planda Supabase'e yazılır. Bu sayede kullanıcı gecikme hissetmez. Başarısız olursa state rollback yapılır.

### Veri Modeli

```
User (Supabase Auth)
  └─ Board (id, user_id, title)
       └─ Column (id, board_id, title, position)
            └─ Card (id, column_id, title, description, position, due_date, label)
```

Her seviye cascade delete ile bağlı. RLS politikaları ile kullanıcı sadece kendi verilerini görebilir.

## Teknoloji Stack'i

| Katman | Teknoloji | Neden |
|--------|-----------|-------|
| Frontend | Next.js 16 (App Router) | Vercel entegrasyonu, Server Actions |
| Stil | Tailwind CSS 3.4 | Hızlı, tutarlı, responsive |
| İkonlar | Lucide React | Hafif, tree-shakeable |
| Auth | Supabase Auth | Hazır e-posta/şifre akışı, JWT |
| Veritabanı | Supabase (PostgreSQL) | RLS, realtime potansiyeli, ücretsiz tier |
| Deploy | Vercel | Sıfır konfigürasyon, otomatik deploy |
| Dil | TypeScript (strict) | Tip güvenliği, daha az hata |

## Kurulum

### 1. Supabase Projesi

1. [supabase.com](https://supabase.com) üzerinde yeni proje oluştur
2. **SQL Editor**'a git, `supabase/schema.sql` içeriğini yapıştır ve çalıştır
3. Ardından ek sütunları ekle:
   ```sql
   ALTER TABLE public.cards ADD COLUMN due_date date;
   ALTER TABLE public.cards ADD COLUMN label text;
   ```
4. **Authentication > Settings** altından e-posta auth'un aktif olduğunu kontrol et

### 2. Ortam Değişkenleri

```bash
cp .env.local.example .env.local
```

`.env.local` dosyasını Supabase projenizin bilgileriyle doldurun (Settings > API):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 3. Geliştirme

```bash
npm install
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) açılır.

### 4. Vercel'e Deploy

GitHub'a push'layın, [vercel.com](https://vercel.com) üzerinden import edin, env değişkenlerini ekleyin.

## Proje Yapısı

```
taskflow/
├── app/
│   ├── auth/page.tsx          # Giriş / Kayıt sayfası
│   ├── dashboard/page.tsx     # Board listesi (server component)
│   ├── board/[id]/page.tsx    # Kanban board (server component)
│   ├── layout.tsx             # Root layout
│   └── globals.css            # Tailwind + animasyonlar
├── components/
│   ├── kanban-board.tsx       # Ana board + DnD + arama + onay
│   ├── dashboard-client.tsx   # Dashboard client bileşeni
│   └── card-modal.tsx         # Kart detay modalı (due date + labels)
├── actions/
│   ├── boards.ts              # Board server actions
│   ├── columns.ts             # Sütun server actions
│   └── cards.ts               # Kart server actions
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Browser Supabase client
│   │   ├── server.ts          # Server Supabase client
│   │   └── middleware.ts      # Auth middleware helper
│   └── utils.ts               # Position hesaplama
├── types/
│   └── database.ts            # TypeScript tipleri
├── supabase/
│   └── schema.sql             # DB şeması + RLS politikaları
└── middleware.ts               # Next.js route koruması
```

## Mobil Deneyim

- **Touch activation:** 200ms basılı tutma ile sürükleme başlar
- **Tolerance:** 8px hareket = scroll olarak algılanır, sürükleme iptal
- **Drag handle:** Her kartta sol tarafta grip ikonu
- **Responsive layout:** Sütunlar yatay scroll ile kaydırılır
- **Auto-scroll:** Kart kenar yakınına getirildiğinde otomatik kaydırma

## Özellikler 

Bu projede öncelik, çekirdek Kanban akışını güvenilir ve tutarlı şekilde sunmaktı.

1. ✅ Sürükle-bırak akıcı çalışıyor (görsel ipuçları, doğru sıralama)
2. ✅ Kalıcılık sağlam (sayfa yenilemede sıralama korunuyor)
3. ✅ Veri modeli tutarlı (board → sütun → kart, cascade delete, RLS)
4. ✅ Mobilde kullanılabilir (touch delay, drag handle, responsive)
5. ✅ Ek özellikler (due date, labels, arama, silme onayı) çekirdek bozulmadan eklendi

## Gelecek Geliştirmeler

- [ ] Sütun sürükle-bırak (aynı DnD mantığı ile)
- [ ] Board başlık düzenleme
- [ ] Supabase Realtime ile çoklu kullanıcı senkronizasyonu
- [ ] Board paylaşımı (public link ile görüntüleme)
- [ ] Aktivite geçmişi (kart hareketleri log)
- [ ] Kart yorumları
