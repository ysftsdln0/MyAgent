const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
require('dotenv').config()
const voice = require('./src/modules/voice')
// const speechToText = require('./src/modules/speechToText') // Vosk kaldırıldı
const googleSpeech = require('./src/modules/googleSpeech') // Google Cloud eklendi

let recognizeStream = null; // Google Cloud akışını tutmak için

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      enableRemoteModule: false,
      // Web Speech API artık kullanılmıyor, bu özellik kaldırılabilir
      // experimentalFeatures: true,
      // enableBlinkFeatures: 'SpeechRecognition' 
    }
  })

  // Geliştirici araçları artık otomatik açılmayacak
  // mainWindow.webContents.openDevTools()
  
  mainWindow.loadFile(path.join(__dirname, 'src/renderer/index.html'))
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.on('send-command-to-llm', async (event, command) => {
    console.log('main.js: Komut alındı ->', command);
    const llm = require('./src/modules/llm');
    try {
        const response = await llm.getLlmResponse(command);
        console.log('main.js: LLM yanıtı alındı ->', response);
        event.reply('llm-response-received', response);
    } catch (error) {
        console.error('main.js: LLM hatası ->', error);
        event.reply('llm-error', error.message);
    }
});

// Renderer sürecinden ses verisini al ve Google Cloud'a gönder
// Renderer, kaydı başlattığında 'start-audio-stream' gönderecek.
// Ardından ses parçalarını 'audio-chunk' olarak göndermeye devam edecek.
ipcMain.on('start-audio-stream', (event) => {
    console.log('main.js: Ses akışı başlatma isteği alındı.');
    // Önceki akış varsa kapat
    if (recognizeStream) {
        recognizeStream.end();
    }
    // Yeni Google Cloud akışını başlat
    recognizeStream = googleSpeech.streamToRecognize() // streamToRecognize fonksiyonunu ipcMain içinde çağırıyoruz
        .on('error', (error) => {
            console.error('main.js: Google Cloud Akış Hatası:', error);
            event.sender.send('google-cloud-error', error.message);
        })
        .on('data', (data) => {
            if (data.results && data.results[0] && data.results[0].alternatives && data.results[0].alternatives[0]) {
                const transcript = data.results[0].alternatives[0].transcript;
                console.log('main.js: Google Cloud Tam Sonuç:', transcript);
                // Tanınan metni renderer sürecine gönder
                event.sender.send('google-cloud-result', transcript);
            }
             // Kısmi sonuçları göndermek isterseniz:
            // if (data.results && data.results[0] && data.results[0].isFinal === false) {
            //      const partialTranscript = data.results[0].alternatives[0].transcript;
            //      event.sender.send('google-cloud-partial-result', partialTranscript);
            // }
        });
});

ipcMain.on('audio-chunk', (event, chunk) => {
    // Renderer'dan gelen ses parçasını Google Cloud akışına yaz
    if (recognizeStream) {
        recognizeStream.write(Buffer.from(chunk)); // Uint8Array'i Buffer'a çevir
    }
});

ipcMain.on('stop-audio-stream', (event) => {
    console.log('main.js: Ses akışı durdurma isteği alındı.');
    // Akışı sonlandır
    if (recognizeStream) {
        recognizeStream.end();
        recognizeStream = null;
    }
});

ipcMain.on('execute-system-command', (event, command) => {
    console.log('main.js: Sistem komutu alındı ->', command);
    const commands = require('./src/modules/commands');
    try {
        commands.executeCommand(command);
        event.reply('system-command-executed', `Komut başarıyla çalıştırıldı: ${command}`);
    } catch (error) {
        console.error('main.js: Sistem komutu hatası ->', error);
        event.reply('system-command-error', error.message);
    }
});

ipcMain.on('speak-text', (event, text) => {
    console.log('main.js: Seslendirme isteği alındı ->', text);
    voice.speakText(text);
});

// Uygulama kapatılırken akışı temizle
app.on('will-quit', () => {
    if (recognizeStream) {
        recognizeStream.end();
    }
    // Vosk temizleme kaldırıldı
    // speechToText.resetRecognizer();
    // speechToText.model.free();
}); 