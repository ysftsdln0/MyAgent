const { exec } = require('child_process');

const commandMap = {
    'safari aç': 'open -a Safari',
    'terminal aç': 'open -a Terminal',
    // Diğer komutlar buraya eklenebilir
};

function executeCommand(commandText) {
    const lowercasedCommand = commandText.lowercased().trim();
    const systemCommand = commandMap[lowercasedCommand];

    if (systemCommand) {
        console.log(`Sistem komutu çalıştırılıyor: ${systemCommand}`);
        exec(systemCommand, (error, stdout, stderr) => {
            if (error) {
                console.error(`Sistem komutu çalıştırılırken hata oluştu: ${error}`);
                return;
            }
            console.log(`Sistem komutu çıktısı: ${stdout}`);
        });
    } else {
        console.log(`Tanınmayan sistem komutu: ${commandText}`);
    }
}

module.exports = {
    executeCommand
}; 