const speech = require('@google-cloud/speech');

// Google Cloud Speech-to-Text client oluştur
const client = new speech.SpeechClient();

async function streamToRecognize() {
  console.log('Google Cloud Speech-to-Text akışı başlatılıyor...');

  const request = {
    config: {
      encoding: 'LINEAR16', // RAW PCM 16-bit mono
      sampleRateHertz: 16000, // Web Audio API'de ayarladığımız örnekleme hızı
      languageCode: 'tr-TR',
    },
    interimResults: false,
  };

  // Akış tanıma isteği
  const recognizeStream = client
    .streamingRecognize(request)
    .on('error', (error) => {
        console.error('Google Cloud Streaming Recognize Hatası:', error);
        // Hata durumunda main.js'te IPC ile renderer'a bildirim yapılacak.
    })
    .on('data', (data) => {
      if (data.results && data.results[0] && data.results[0].alternatives && data.results[0].alternatives[0]) {
        const result = data.results[0].alternatives[0].transcript;
        console.log('Google Cloud Tam Sonuç:', result);
        // Tam sonucu main.js'e döndürmek yerine, event.sender.send() main.js'te çağırılacak.
      } else {
          // Kısmi sonuçlar veya boş veri
           if (data.results && data.results[0] && data.results[0].isFinal === false && data.results[0].alternatives && data.results[0].alternatives[0].transcript) {
               console.log('Google Cloud Kısmi Sonuç:', data.results[0].alternatives[0].transcript);
               // Kısmi sonuçları işlemek isterseniz buradan gönderebilirsiniz
           }
      }
    });

  // Ses akışını döndür (main.js bu akışa ses baytlarını yazacak)
  return recognizeStream;
}

module.exports = {
  streamToRecognize
}; 