const { exec } = require('child_process');

const commandMap = {
    'safari aç': 'open -a Safari',
    'terminal aç': 'open -a Terminal',
    // Buraya daha fazla komut eklenebilir
};

function executeCommand(commandText) {
    const lowercasedCommand = commandText.lowercased().trim();
    const systemCommand = commandMap[lowercasedCommand];

    if (systemCommand) {
        console.log(`Sistem komutu çalıştırılıyor: ${systemCommand}`);
        exec(systemCommand, (error, stdout, stderr) => {
            if (error) {
                console.error(`Sistem komutu çalıştırılırken hata oluştu: ${error}`);
                // Hata durumunu ana sürece bildirebiliriz
                return;
            }
            console.log(`Sistem komutu çıktısı: ${stdout}`);
            // Başarı durumunu ana sürece bildirebiliriz
        });
    } else {
        console.log(`Tanınmayan sistem komutu: ${commandText}`);
        // Tanınmayan komut durumunu ana sürece bildirebiliriz
    }
}

module.exports = {
    executeCommand
}; 