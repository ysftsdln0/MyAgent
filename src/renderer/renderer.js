document.addEventListener('DOMContentLoaded', () => {
    const micButton = document.getElementById('micButton');
    const commandInput = document.getElementById('commandInput');
    const responseDiv = document.getElementById('response');
    const statusDiv = document.getElementById('status');

    let isRecording = false;
    // Yeni ses tanıma çözümü entegre edilecek

    micButton.addEventListener('click', async () => {
        if (isRecording) {
            console.log('Kayıt durduruluyor...');
            // Yeni çözüm durdurma mantığı buraya gelecek
            isRecording = false;
            micButton.textContent = 'Mikrofon Başlat';
            micButton.classList.remove('bg-red-600', 'hover:bg-red-700', 'focus:ring-red-500'); // Kırmızı sınıfları kaldır
            micButton.classList.add('bg-blue-600', 'hover:bg-blue-700', 'focus:ring-blue-500'); // Mavi sınıfları ekle
            statusDiv.textContent = 'Kayıt Durduruldu.';
        } else {
            console.log('Mikrofon izni isteniyor...');
            // Mikrofon izni ve yeni çözüm başlatma mantığı buraya gelecek
            // Şimdilik sadece durumu güncelleyelim
            statusDiv.textContent = 'Dinleniyor...';
            micButton.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'focus:ring-blue-500'); // Mavi sınıfları kaldır
            micButton.classList.add('bg-red-600', 'hover:bg-red-700', 'focus:ring-red-500'); // Kırmızı sınıfları ekle
            isRecording = true;
            micButton.textContent = 'Kaydı Durdur';

            // Geçici olarak LLM'e boş bir komut gönderme kaldırıldı
        }
    });

    // Ana süreçten gelen LLM yanıtını dinle
    window.electronAPI.onLLMResponse((response) => {
        responseDiv.textContent = response;
        statusDiv.textContent = 'Yanıt Alındı.';
        // Yanıtı seslendir
        window.electronAPI.speakText(response);
    });

    // Ana süreçten gelen LLM hatasını dinle
    window.electronAPI.onLLMError((error) => {
        responseDiv.textContent = `LLM Hatası: ${error}`;
        statusDiv.textContent = 'LLM Hatası Oluştu.';
        window.electronAPI.speakText(`LLM hatası oluştu: ${error}`);
    });

    // Ana süreçten gelen sistem komutu sonuçlarını dinle
    window.electronAPI.onSystemCommandExecuted((message) => {
        console.log(message);
        statusDiv.textContent = message;
    });

    window.electronAPI.onSystemCommandError((error) => {
        console.error('Sistem Komutu Hatası:', error);
        statusDiv.textContent = `Sistem Komutu Hatası: ${error}`;
    });
}); 