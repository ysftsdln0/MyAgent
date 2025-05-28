const vosk = require('vosk');
const path = require('node:path');

const MODEL_PATH = path.join(__dirname, '..', '..', 'model', 'vosk-model-small-tr-0.3');

// Vosk modelini yükle
vosk.setLogLevel(0); // Log seviyesini ayarla (0 en az loglama)
const model = new vosk.Model(MODEL_PATH);
const recognizer = new vosk.Recognizer({ model: model, sampleRate: 16000 }); // Örnekleme hızını belirt

function processAudioChunk(audioChunk) {
  // Ses parçasını Vosk tanıyıcısına besle
  if (recognizer.acceptWaveform(audioChunk)) {
    // Tam bir sonuç mevcut
    const result = recognizer.result();
    console.log('Vosk Tam Sonuç:', result);
    return result.text; // Metin sonucunu döndür
  } else {
    // Kısmi sonuç mevcut
    const partialResult = recognizer.partialResult();
    console.log('Vosk Kısmi Sonuç:', partialResult);
    // Kısmi sonuçları işlemek isterseniz buradan döndürebilirsiniz
    return null; // Şimdilik sadece tam sonuçları döndürelim
  }
}

function resetRecognizer() {
    recognizer.reset();
}

// Model ve tanıyıcıyı dışa aktar
module.exports = {
  processAudioChunk,
  resetRecognizer
}; 