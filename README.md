# MyAgent (Electron)

Sesli komutlarla çalışan bir yapay zeka ajanı masaüstü uygulaması.

## Kurulum

1.  Projeyi klonlayın veya indirin.
2.  Terminalde proje dizinine gidin.
3.  Gerekli bağımlılıkları yükleyin:

    ```bash
    npm install
    ```

4.  Bir `.env` dosyası oluşturun ve OpenAI API anahtarınızı ekleyin:

    ```
    OPENAI_API_KEY=sk-Your-OpenAI-API-Key-Here
    ```

    `sk-Your-OpenAI-API-Key-Here` kısmını kendi OpenAI API anahtarınızla değiştirin.
    
5.  `.gitignore` dosyanıza `.env` ekleyerek API anahtarınızın versiyon kontrolüne dahil olmasını engelleyin.

## Çalıştırma

Terminalde proje dizinindeyken aşağıdaki komutu çalıştırın:

```bash
npm start
```

Bu komut Electron uygulamasını başlatacaktır.

## Kullanım

Uygulama arayüzündeki "Mikrofon Başlat" butonuna tıklayın ve komutunuzu söyleyin. Konuşma metne dönüştürülecek, LLM'e gönderilecek ve gelen yanıt hem yazılı hem de sesli olarak size iletilecektir.

Örnek Komutlar:

*   "Safari aç"
*   "Terminal aç"
*   "Bana bir espri anlat"

## Alternatifler

*   **Speech-to-Text (STT)**: Web Speech API yerine OpenAI Whisper API, Google Cloud Speech-to-Text veya platforma özel çözümler (örneğin macOS için Speech Recognition framework'ü) kullanılabilir.
*   **Text-to-Speech (TTS)**: macOS 'say' komutu yerine tarayıcı Web Speech API, Google Cloud Text-to-Speech, ElevenLabs gibi daha doğal sesler sunan servisler veya platforma özel kütüphaneler kullanılabilir.
*   **LLM**: OpenAI dışında Anthropic Claude, Google Gemini gibi farklı LLM servisleri entegre edilebilir.

## Geliştirme

*   Daha gelişmiş komut işleme ve eşleştirme mekanizmaları ekleyin.
*   Sistem komutlarını daha güvenli bir şekilde çalıştırmak için Electron'ın güvenli API'lerini kullanın.
*   Hata yönetimi ve kullanıcı geri bildirimini iyileştirin.
*   Uygulama ayarları (API anahtarı, dil seçimi, seslendirme seçenekleri) için bir arayüz ekleyin.

## Katkıda Bulunma

Katkılarınızı bekliyoruz! Lütfen pull request göndermeden önce değişikliklerinizi test ettiğinizden emin olun. 