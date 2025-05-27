const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
require('dotenv').config()
const voice = require('./src/modules/voice')

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