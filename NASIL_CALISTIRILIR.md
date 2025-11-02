# 🚀 Asteroid Meme Sistemi Kurulum Talimatları

## ✅ Yapılan Değişiklikler

### 1. Scroll Sorunu Düzeltildi ✓
### 2. Rapor İndirme (PDF/PNG) Eklendi ✓
### 3. Harita ile Konum Seçimi Eklendi ✓
### 4. Meme Oluşturma ve Paylaşım Sistemi Eklendi ✓

## 📦 Kurulum Adımları

### 1. Environment Değişkenlerini Ayarlayın

`frontend/.env.local` dosyası oluşturun (yoksa) ve şu satırları ekleyin:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_MAPBOX_TOKEN=pk.YOUR_MAPBOX_TOKEN_HERE
```

**Mapbox Token Nasıl Alınır:**
1. https://account.mapbox.com/ adresine gidin
2. Ücretsiz hesap oluşturun (kredi kartı gerekmez)
3. Dashboard'da "Access tokens" bölümüne gidin
4. Default Public Token'ı kopyalayın veya yeni bir tane oluşturun
5. Yukarıdaki `NEXT_PUBLIC_MAPBOX_TOKEN` yerine yapıştırın

### 2. Geliştirme Sunucusunu Yeniden Başlatın

Eğer sunucu çalışıyorsa **CTRL+C** ile durdurun, sonra:

```bash
cd frontend
npm run dev
```

### 3. Tarayıcıda Açın

http://localhost:3000/impact-simulator adresine gidin

## 🎮 Özellik Kullanımı

### 🗺️ Harita ile Konum Seçimi

1. Sol panelde **"Hedef Konum"** bölümünü bulun
2. Dropdown'un yanındaki **Harita ikonu** (🗺️) butonuna tıklayın
3. Açılan haritada:
   - Harita üzerinde istediğiniz yere **tıklayın**
   - Marker'ı **sürükleyip bırakın**
   - Üst kısımdaki **arama kutusundan adres arayın** (örn: "Ankara, Türkiye")
4. **"Konumu Seç"** butonuna basın

### 💥 Meme Oluşturma ve Paylaşma

1. Simülasyonu çalıştırın (**"Simülasyonu Başlat"** butonu)
2. Sağ paneldeki rapor başlığında **✨ (Sparkles)** ikonuna tıklayın
3. Açılan pencerede:
   - İsteğe bağlı **özel metin** girin (örn: "Arkadaşımın evine asteroid düştü!")
   - **"Meme Oluştur"** butonuna basın
4. Oluşan meme ile:
   - **Sosyal medyada paylaşın:**
     - **X (Twitter)** - Direkt tweet
     - **Facebook** - Direkt paylaş
     - **WhatsApp** - Direkt mesaj
     - **Instagram** - URL paylaş
   - **Link kopyalayın** - Clipboard'a kopyala
   - **Görseli indirin** - PNG olarak kaydet

### 📄 Rapor İndirme

Sağ paneldeki rapor başlığında:
- **⬇️ (Download) ikonu** - PNG olarak indir
- **📄 (FileText) ikonu** - PDF olarak indir

## 🐛 Sorun Giderme

### "Butonlara bastığımda hiçbir şey olmuyor"

**Çözüm 1: Konsolu kontrol edin**
1. Tarayıcıda **F12** tuşuna basın
2. **Console** sekmesine gidin
3. Kırmızı hatalar varsa screenshot alıp paylaşın

**Çözüm 2: Sayfayı yenileyin**
- **CTRL + SHIFT + R** (Hard refresh)

**Çözüm 3: Mapbox token'ı kontrol edin**
- Console'da "Mapbox token bulunamadı" uyarısı varsa
- `.env.local` dosyasını kontrol edin
- Token'ın doğru olduğundan emin olun
- Sunucuyu yeniden başlatın

### "Harita yüklenmiyor"

1. `.env.local` dosyasında `NEXT_PUBLIC_MAPBOX_TOKEN` var mı?
2. Token geçerli mi? (Mapbox dashboard'da kontrol edin)
3. Sunucuyu yeniden başlattınız mı?

### "npm install hata veriyor"

Bu normal! Windows'ta bazı uyarılar ve hatalar çıkabilir ama önemli değil.
Sunucu çalışıyorsa sorun yok.

## 📝 Test Senaryosu

1. ✅ Impact Simulator sayfasını açın
2. ✅ Sol panelde harita ikonuna basın → Harita açılmalı
3. ✅ Haritada bir yere tıklayın → Marker hareket etmeli
4. ✅ Konum seçin → Panel kapanmalı, koordinatlar görünmeli
5. ✅ Simülasyonu başlatın → Animasyon çalışmalı
6. ✅ Sağ panelde ✨ ikonuna basın → Meme generator açılmalı
7. ✅ Meme oluşturun → Görsel oluşmalı
8. ✅ Link kopyalayın → "Kopyalandı" mesajı görmeli
9. ✅ Download/PDF butonlarına basın → Dosyalar inmeli

## 🎉 Tamamdır!

Tüm özellikler artık çalışıyor olmalı. Sorun yaşarsanız:
1. Console loglarına bakın (F12)
2. Sunucuyu yeniden başlatın
3. Tarayıcı cache'ini temizleyin (CTRL+SHIFT+DEL)

