# TaskFlow — Kanban Proje Yönetim Tahtası

Sürükle-bırak destekli, gerçek zamanlı kalıcılıkla çalışan bir Kanban board uygulaması.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Supabase](https://img.shields.io/badge/Supabase-Auth+Postgres-green)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

## Özellikler

- **Kimlik doğrulama** — Supabase Auth (e-posta/şifre)
- **Board yönetimi** — Oluştur, sil, varsayılan 3 sütunla başla
- **Sütun yönetimi** — Ekle, sil, çift tıkla yeniden adlandır
- **Kart yönetimi** — Ekle, düzenle (başlık + açıklama), sil, sütun değiştir
- **Sürükle-bırak** — Custom pointer events ile (mobil + masaüstü)
- **Kalıcı sıralama** — Fractional positioning, sayfa yenilemede korunur
- **Mobil uyumluluk** — Touch delay (200ms), drag handle, responsive layout
- **Güvenlik** — Row Level Security (RLS) ile veri izolasyonu

## Mimari Kararlar

### Neden Custom Pointer Events (dnd-kit yaklaşımı)?

| Seçenek | Karar |
|---------|-------|
| HTML5 Drag & Drop | ❌ Mobilde çalışmaz, stil sınırlı |
| react-beautiful-dnd | ❌ Artık bakım yapılmıyor (deprecated) |
| @hello-pangea/dnd | ⚠️ Fork, aktif ama sınırlı esneklik |
| **dnd-kit** | ✅ Modern, erişilebilir, modüler |

Bu projede dnd-kit'in çekirdek mantığını (pointer sensor, activation constraint, overlay pattern) custom olarak implemente ettik. Prodüksiyonda `@dnd-kit/core` + `@dnd-kit/sortable` paketi doğrudan kullanılabilir.

### Neden Fractional Positioning?

Integer sıralama (0, 1, 2, 3) kullanılsaydı her taşıma işleminde O(n) güncelleme gerekecekti. Bunun yerine **float position** kullanıyoruz:

```
Kart A: position = 65536
Kart B: position = 131072
→ Araya ekleme: position = (65536 + 131072) / 2 = 98304
→ Sadece 1 satır güncellenir: O(1)
```

Teorik olarak ~52 ardışık aynı noktaya ekleme sonrası precision kaybı olabilir (IEEE 754). Pratik kullanımda bu limit asla aşılmaz. Gerekirse periyodik reindex yapılabilir.

### Veri Modeli

```
User (Supabase Auth)
  └─ Board (id, user_id, title)
       └─ Column (id, board_id, title, position)
            └─ Card (id, column_id, title, description, position)
```

Her seviye cascade delete ile bağlı. RLS politikaları ile kullanıcı sadece kendi verilerini görebilir.

### Optimistic Updates

Tüm mutasyonlar **önce UI'da uygulanır**, sonra arka planda Supabase'e yazılır. Başarısız olursa rollback yapılır. Bu sayede UX gecikme hissetmez.

## Kurulum

### 1. Supabase Projesi

1. [supabase.com](https://supabase.com) üzerinde yeni proje oluştur
2. **SQL Editor**'a git
3. `supabase/schema.sql` dosyasının içeriğini yapıştır ve çalıştır
4. **Authentication > Settings** altından e-posta auth'un aktif olduğunu kontrol et

### 2. Ortam Değişkenleri

```bash
cp .env.local.example .env.local
```

`.env.local` dosyasını Supabase projenizin bilgileriyle doldurun:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Bu bilgileri **Supabase Dashboard > Settings > API** altında bulabilirsiniz.

### 3. Geliştirme

```bash
npm install
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) açılır.

### 4. Vercel'e Deploy

```bash
npx vercel
```

Veya GitHub reposunu Vercel'a bağlayın. Env değişkenlerini Vercel Dashboard'da ayarlayın.

## Proje Yapısı

```
taskflow/
├── app/
│   ├── auth/page.tsx          # Giriş / Kayıt sayfası
│   ├── dashboard/page.tsx     # Board listesi (server)
│   ├── board/[id]/page.tsx    # Kanban board (server)
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── kanban-board.tsx       # Ana board + DnD mantığı
│   ├── dashboard-client.tsx   # Dashboard client bileşeni
│   └── card-modal.tsx         # Kart detay modalı
├── actions/
│   ├── boards.ts              # Board server actions
│   ├── columns.ts             # Sütun server actions
│   └── cards.ts               # Kart server actions
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Browser client
│   │   ├── server.ts          # Server client
│   │   └── middleware.ts      # Auth middleware
│   └── utils.ts               # Position hesaplama
├── types/
│   └── database.ts            # TypeScript tipleri
├── supabase/
│   └── schema.sql             # DB şeması + RLS
└── middleware.ts               # Next.js route koruması
```

## Mobil Deneyim

- **Touch activation:** 200ms basılı tutma ile sürükleme başlar
- **Tolerance:** 8px hareket = scroll, sürükleme iptal
- **Drag handle:** Her kartta sol tarafta grip ikonu
- **Responsive:** Sütunlar yatay scroll ile kaydırılır
- **Auto-scroll:** Kart kenar yakınına getirildiğinde otomatik kaydırma

## Gelecek Geliştirmeler (zaman kalırsa)

- [ ] Kartlara due date alanı (DatePicker + görsel rozet)
- [ ] Renk etiketleri (basit enum: red, blue, green...)
- [ ] Sütun sürükle-bırak (aynı DnD mantığı ile)
- [ ] Board başlık düzenleme
- [ ] Supabase Realtime ile çoklu kullanıcı senkronizasyonu
