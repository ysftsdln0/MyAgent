document.addEventListener('DOMContentLoaded', () => {
    const micButton = document.getElementById('micButton');
    const commandInput = document.getElementById('commandInput');
    const responseDiv = document.getElementById('response');
    const statusDiv = document.getElementById('status');
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mainContent = document.getElementById('mainContent');
    const dragbar = document.getElementById('dragbar');
    const themeButton = document.getElementById('themeButton');
    const settingsButton = document.getElementById('settingsButton');
    const userButton = document.getElementById('userButton');
    const profileButton = document.getElementById('profileButton');
    const sidebarHome = document.getElementById('sidebarHome');
    const sidebarSettings = document.getElementById('sidebarSettings');
    const sidebarHelp = document.getElementById('sidebarHelp');

    let isRecording = false;
    let audioContext = null;
    let mediaStreamSource = null;
    let scriptProcessor = null; // veya AudioWorkletNode
    let audioStream = null;
    let sidebarVisible = true;
    let isDragging = false;
    let sidebarWidth = 320;

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

    // Sidebar aç/kapa
    sidebarToggle.addEventListener('click', () => {
        sidebarVisible = !sidebarVisible;
        if (!sidebarVisible) {
            sidebar.style.width = '0px';
            sidebar.style.minWidth = '0px';
            sidebar.style.overflow = 'hidden';
            dragbar.style.display = 'none';
        } else {
            sidebar.style.width = sidebarWidth + 'px';
            sidebar.style.minWidth = '';
            sidebar.style.overflow = '';
            dragbar.style.display = '';
        }
    });

    // Sürüklenebilir divider
    dragbar.addEventListener('mousedown', (e) => {
        isDragging = true;
        document.body.style.cursor = 'col-resize';
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const minWidth = 200;
        const maxWidth = 400;
        const sidebarRect = sidebar.getBoundingClientRect();
        const newWidth = Math.min(maxWidth, Math.max(minWidth, e.clientX - sidebarRect.left));
        sidebarWidth = newWidth;
        sidebar.style.width = newWidth + 'px';
    });
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = '';
        }
    });

    // Tema geçişi
    if (themeButton) themeButton.addEventListener('click', () => {
        document.body.classList.toggle('dark');
    });

    // Demo sayfa gösterimi
    function showDemo(title, desc, isHome = false) {
        if (isHome) {
            mainContent.innerHTML = `<h2 class="text-[28px] font-bold leading-tight px-4 text-center pb-3 pt-5 dark:text-slate-100">${title}</h2><p class="text-base font-normal leading-normal pb-3 pt-1 px-4 text-center dark:text-slate-200">${desc}</p><div class='flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3'><label class='flex flex-col min-w-40 flex-1'><input id='commandInput' placeholder='Sorunuzu buraya yazın...' class='form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#131118] focus:outline-0 focus:ring-0 border border-[#dedbe6] bg-white dark:bg-[#232a47] dark:text-slate-100 dark:border-[#232a47] h-14 placeholder:text-[#6b6189] p-[15px] text-base font-normal leading-normal' value='' /></label></div><div class='flex justify-end overflow-hidden px-5 pb-5'><button id='micButton' class='flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 bg-[#6a3eee] text-white text-base font-bold leading-normal tracking-[0.015em] min-w-0 px-2 gap-4 pl-4 pr-6'><div class='text-white'><svg xmlns='http://www.w3.org/2000/svg' width='24px' height='24px' fill='currentColor' viewBox='0 0 256 256'><path d='M128,176a48.05,48.05,0,0,0,48-48V64a48,48,0,0,0-96,0v64A48.05,48.05,0,0,0,128,176ZM96,64a32,32,0,0,1,64,0v64a32,32,0,0,1-64,0Zm40,143.6V232a8,8,0,0,1-16,0V207.6A80.11,80.11,0,0,1,48,128a8,8,0,0,1,16,0,64,64,0,0,0,128,0,8,8,0,0,1,16,0A80.11,80.11,0,0,1,136,207.6Z'></path></svg></div></button></div>`;
        } else {
            mainContent.innerHTML = `<h2 class="text-[28px] font-bold leading-tight px-4 text-center pb-3 pt-5 dark:text-slate-100">${title}</h2><p class="text-base font-normal leading-normal pb-3 pt-1 px-4 text-center dark:text-slate-200">${desc}</p>`;
        }
        // Sadece ana içerikteki input ve mikrofon butonuna event ata
        const micButton = document.getElementById('micButton');
        const commandInput = document.getElementById('commandInput');
        if (micButton) micButton.addEventListener('click', () => { console.log('Mikrofon butonuna tıklandı'); });
        if (commandInput) commandInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                console.log('Metin gönderildi:', commandInput.value);
            }
        });
    }

    if (sidebarHome) sidebarHome.addEventListener('click', () => {
        showDemo('Ana Sayfa', 'Burası ana sayfa demo içeriğidir.', true);
    });
    if (sidebarSettings) sidebarSettings.addEventListener('click', () => {
        showDemo('Ayarlar', 'Burada ayarlarla ilgili demo içerik görebilirsiniz.');
    });
    if (sidebarHelp) sidebarHelp.addEventListener('click', () => {
        showDemo('Yardım', 'Yardım ve sıkça sorulan sorular burada listelenir.');
    });
    if (settingsButton) settingsButton.addEventListener('click', () => {
        showDemo('Ayarlar', 'Burada ayarlarla ilgili demo içerik görebilirsiniz.');
    });
    if (userButton) userButton.addEventListener('click', () => {
        showDemo('Kullanıcı', 'Kullanıcı profil ve hesap bilgileri burada.');
    });
    if (profileButton) profileButton.addEventListener('click', () => {
        showDemo('Profil', 'Profil resmi ve kullanıcı detayları burada.');
    });
}); 