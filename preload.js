const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  sendLLMCommand: (command) => ipcRenderer.send('send-command-to-llm', command),
  onLLMResponse: (callback) => ipcRenderer.on('llm-response-received', (event, response) => callback(response)),
  onLLMError: (callback) => ipcRenderer.on('llm-error', (event, error) => callback(error)),
  
  executeSystemCommand: (command) => ipcRenderer.send('execute-system-command', command),
  onSystemCommandExecuted: (callback) => ipcRenderer.on('system-command-executed', (event, message) => callback(message)),
  onSystemCommandError: (callback) => ipcRenderer.on('system-command-error', (event, error) => callback(error)),

  speakText: (text) => ipcRenderer.send('speak-text', text),

  // Google Cloud Speech-to-Text için yeni IPC kanalları
  startAudioStream: () => ipcRenderer.send('start-audio-stream'),
  stopAudioStream: () => ipcRenderer.send('stop-audio-stream'),
  sendAudioChunk: (chunk) => ipcRenderer.send('audio-chunk', chunk),
  onGoogleCloudResult: (callback) => ipcRenderer.on('google-cloud-result', (event, text) => callback(text)),
  onGoogleCloudError: (callback) => ipcRenderer.on('google-cloud-error', (event, error) => callback(error))
}) 