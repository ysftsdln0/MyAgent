document.addEventListener('DOMContentLoaded', () => {
    const micButton = document.getElementById('micButton');
    const commandInput = document.getElementById('commandInput');
    const responseDiv = document.getElementById('response');
    const statusDiv = document.getElementById('status');

    let isRecording = false;
    const recognition = new webkitSpeechRecognition(); // Web Speech API
    recognition.continuous = false;
    recognition.lang = 'tr-TR'; // Türkçe dil ayarı

    micButton.addEventListener('click', () => {
        if (isRecording) {
            recognition.stop();
            isRecording = false;
            micButton.textContent = 'Mikrofon Başlat';
            statusDiv.textContent = 'Kayıt Durduruldu.';
        } else {
            commandInput.value = ''; // Yeni kayıt için metni temizle
            recognition.start();
            isRecording = true;
            micButton.textContent = 'Kaydı Durdur';
            statusDiv.textContent = 'Dinleniyor...';
        }
    });

    recognition.onresult = (event) => {
        const last = event.results.length - 1;
        const command = event.results[last][0].transcript;
        commandInput.value = command;
        statusDiv.textContent = 'Komut algılandı. İşleniyor...';
        
        // Komutu ana sürece gönder
        window.electronAPI.sendLLMCommand(command);
    };

    recognition.onerror = (event) => {
        console.error('Web Speech API Hatası:', event.error);
        statusDiv.textContent = `Hata: ${event.error}`;
        isRecording = false;
        micButton.textContent = 'Mikrofon Başlat';
    };

    recognition.onend = () => {
        isRecording = false;
        micButton.textContent = 'Mikrofon Başlat';
        if (!statusDiv.textContent.startsWith('Komut algılandı') && !statusDiv.textContent.startsWith('Hata')){
             statusDiv.textContent = 'Bekleniyor...';
        }
    };

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
        // İsteğe bağlı: Kullanıcıya geri bildirim gösterebilirsiniz
    });

     window.electronAPI.onSystemCommandError((error) => {
        console.error('Sistem Komutu Hatası:', error);
        // İsteğe bağlı: Kullanıcıya hata gösterebilirsiniz
    });
}); 