const { exec } = require('child_process');

function speakText(text) {
    // macOS'te metni seslendirmek için 'say' komutunu kullanır.
    const command = `say "${text}"`;
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`'say' komutu çalıştırılırken hata oluştu: ${error}`);
            return;
        }
        console.log(`'say' komutu çıktısı: ${stdout}`);
    });
}

module.exports = {
    speakText
}; 