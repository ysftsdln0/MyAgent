const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getLlmResponse(prompt) {
    if (!openai.apiKey) {
        throw new Error("OpenAI API key bulunamadı. Lütfen .env dosyasını kontrol edin veya OPENAI_API_KEY ortam değişkenini ayarlayın.");
    }
    
    console.log('LLM için istek gönderiliyor...');
    try {
        const chatCompletion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // İstediğiniz modeli belirtebilirsiniz, gpt-4 daha maliyetli olabilir
            messages: [
                { role: "system", content: "Sen yardımcı bir yapay zeka asistanısın." },
                { role: "user", content: prompt },
            ],
        });
        console.log('LLM yanıtı alındı.');
        return chatCompletion.choices[0].message.content;
    } catch (error) {
        console.error('LLM API hatası:', error);
        if (error.response) {
            console.error('Hata durumu:', error.response.status);
            console.error('Hata verisi:', error.response.data);
        } else {
            console.error('Hata mesajı:', error.message);
        }
        throw new Error(`LLM API'den yanıt alınamadı: ${error.message}`);
    }
}

module.exports = {
    getLlmResponse
}; 