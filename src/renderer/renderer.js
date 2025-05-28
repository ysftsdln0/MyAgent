document.addEventListener('DOMContentLoaded', () => {
    const micButton = document.getElementById('micButton');
    const commandInput = document.getElementById('commandInput');
    const responseDiv = document.getElementById('response');
    const statusDiv = document.getElementById('status');

    let isRecording = false;
    let audioContext = null;
    let mediaStreamSource = null;
    let scriptProcessor = null; // veya AudioWorkletNode
    let audioStream = null;

    // Google Cloud Speech-to-Text entegrasyonu (RAW PCM)
    const desiredSampleRate = 16000; // Google Cloud için genellikle 16000 Hz

    // Ses parçasını ana sürece gönderme fonksiyonu
    const sendAudioChunk = (chunk) => {
        // chunk Float32Array formatında gelecek, 16-bit IntArrayBuffer'a dönüştür
        const int16Array = convertFloat32ToInt16(chunk);
        window.electronAPI.sendAudioChunk(int16Array);
    };

    // Float32Array'i Int16Array'e dönüştürme fonksiyonu
    function convertFloat32ToInt16(buffer) {
        let l = buffer.length;
        const buf = new Int16Array(l);
        while (l--) {
            buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
        }
        return buf;
    }

    micButton.addEventListener('click', async () => {
        if (isRecording) {
            console.log('Kayıt durduruluyor...');
            // Web Audio API durdurulacak
            if (scriptProcessor) {
                scriptProcessor.disconnect();
                scriptProcessor = null;
            }
            if (mediaStreamSource) {
                mediaStreamSource.disconnect();
                mediaStreamSource = null;
            }
            if (audioContext) {
                audioContext.close();
                audioContext = null;
            }
            if (audioStream) {
                audioStream.getTracks().forEach(track => track.stop());
                audioStream = null;
            }

            isRecording = false;
            micButton.textContent = 'Mikrofon Başlat';
            micButton.classList.remove('bg-red-600', 'hover:bg-red-700', 'focus:ring-red-500');
            micButton.classList.add('bg-blue-600', 'hover:bg-blue-700', 'focus:ring-blue-500');
            statusDiv.textContent = 'Kayıt Durduruldu.';

            // Akışı durdurma isteğini ana sürece gönder
            window.electronAPI.stopAudioStream();

        } else {
            console.log('Mikrofon izni isteniyor (Web Audio API ile)...');
            try {
                // Mikrofon izni al
                audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log('Mikrofon izni alındı.');

                // AudioContext oluştur ve mikrofon streamini bağla
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const sourceSampleRate = audioContext.sampleRate; // Cihazın varsayılan örnekleme hızı
                mediaStreamSource = audioContext.createMediaStreamSource(audioStream);

                // ScriptProcessorNode oluştur
                // Buffer boyutu (4096) ve kanal sayısı (1 - mono) ayarları
                scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

                // Ses verisi geldikçe çalışacak event handler
                scriptProcessor.onaudioprocess = (event) => {
                    const inputBuffer = event.inputBuffer.getChannelData(0); // Mono kanal verisini al
                    
                    // Eğer örnekleme hızları farklıysa yeniden örnekle (re-sampling)
                    // Bu basit bir yeniden örnekleme örneğidir, daha gelişmiş yöntemler gerekebilir.
                    if (sourceSampleRate !== desiredSampleRate) {
                         // Basit lineer interpolasyon ile yeniden örnekleme
                         const newLength = Math.round(inputBuffer.length * desiredSampleRate / sourceSampleRate);
                         const resampledBuffer = new Float32Array(newLength);
                         const ratio = sourceSampleRate / desiredSampleRate;
                         for (let i = 0; i < newLength; i++) {
                             const index = i * ratio;
                             const indexLow = Math.floor(index);
                             const indexHigh = Math.ceil(index);
                             const low = inputBuffer[indexLow];
                             const high = inputBuffer[indexHigh];
                             const weight = index - indexLow;
                             resampledBuffer[i] = low * (1 - weight) + high * weight;
                         }
                         sendAudioChunk(resampledBuffer);
                    } else {
                         sendAudioChunk(inputBuffer);
                    }
                };

                // Audio düğümlerini bağla: source -> script processor -> destination (isteğe bağlı, sesi duymak için)
                mediaStreamSource.connect(scriptProcessor);
                // scriptProcessor.connect(audioContext.destination); // Sesi hoparlörden duymak isterseniz

                statusDiv.textContent = 'Dinleniyor...';
                micButton.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'focus:ring-blue-500');
                micButton.classList.add('bg-red-600', 'hover:bg-red-700', 'focus:ring-red-500');
                isRecording = true;
                micButton.textContent = 'Kaydı Durdur';
                commandInput.value = ''; // Input alanını temizle

                // Kaydı başlatma isteğini ana sürece gönder
                 window.electronAPI.startAudioStream();

            } catch (error) {
                console.error('Mikrofon erişimi veya Web Audio API hatası:', error);
                statusDiv.textContent = `Mikrofon hatası: ${error.message}`;
                isRecording = false;
                micButton.textContent = 'Mikrofon Başlat';
                micButton.classList.remove('bg-red-600', 'hover:bg-red-700', 'focus:ring-red-500');
                micButton.classList.add('bg-blue-600', 'hover:bg-blue-700', 'focus:ring-blue-500');
                 if (audioStream) {
                    audioStream.getTracks().forEach(track => track.stop());
                }
                 if (audioContext) {
                    audioContext.close();
                }
            }
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

    // Ana süreçten gelen Google Cloud sonucunu dinle
    window.electronAPI.onGoogleCloudResult((text) => {
       console.log('Google Cloud Sonucu Rendererda:', text);
       commandInput.value = text; // Tanınan metni input alanına yaz
       statusDiv.textContent = 'Komut algılandı. İşleniyor...';
       // Otomatik olarak LLM'e göndermek için:
       window.electronAPI.sendLLMCommand(text); // LLM'e komutu gönder
       // Tanıma tamamlandıktan sonra kaydı durdur (isteğe bağlı olarak etkinleştirilebilir)
       // isRecording = false; 
       // micButton.textContent = 'Mikrofon Başlat';
       // micButton.classList.remove('bg-red-600', 'hover:bg-red-700', 'focus:ring-red-500');
       // micButton.classList.add('bg-blue-600', 'hover:bg-blue-700', 'focus:ring-blue-500');
       // window.electronAPI.stopAudioStream(); // Akışı durdur
    });

    // Ana süreçten gelen Google Cloud hatasını dinle
    window.electronAPI.onGoogleCloudError((error) => {
        console.error('Google Cloud STT Hatası Rendererda:', error);
        statusDiv.textContent = `STT Hatası: ${error}`;
        // Hata durumunda kaydı durdur
        if (isRecording) {
             if (scriptProcessor) {
                scriptProcessor.disconnect();
                scriptProcessor = null;
            }
            if (mediaStreamSource) {
                mediaStreamSource.disconnect();
                mediaStreamSource = null;
            }
             if (audioContext) {
                audioContext.close();
                audioContext = null;
            }
            if (audioStream) {
                audioStream.getTracks().forEach(track => track.stop());
                 audioStream = null;
            }
            isRecording = false;
            micButton.textContent = 'Mikrofon Başlat';
            micButton.classList.remove('bg-red-600', 'hover:bg-red-700', 'focus:ring-red-500');
            micButton.classList.add('bg-blue-600', 'hover:bg-blue-700', 'focus:ring-blue-500');
            window.electronAPI.stopAudioStream();
        }
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