const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onModeChanged: (callback) => ipcRenderer.on('mode-changed', (event, mode) => callback(mode)),
    poweroff: () => ipcRenderer.send('poweroff'),
    runPACSetup: () => ipcRenderer.send('run-pac-setup'),
    onPACSetupDone: (callback) => ipcRenderer.on('pac-setup-done', (event, data) => callback(data))
});
