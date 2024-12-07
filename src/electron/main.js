const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// 서버 로드
const serverApp = require('../proxy/index.js');
const masterKeyModule = require('../proxy/masterKey');
const { initEncryption } = require('../proxy/encryption');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#1e1e2f',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // 스플래시 화면 먼저 로딩
    mainWindow.loadFile(path.join(__dirname, '../../public/splash.html'));

    // 3초 후 메인 화면 전환
    setTimeout(() => {
        if (!mainWindow.isDestroyed()) {
            mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));
        }
    }, 3000);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    // masterKey 초기화 및 마스터키 생성
    masterKeyModule.init(app);
    masterKeyModule.generateMasterKey();
    initEncryption();

    // 서버 시작
    serverApp.listen(5000, () => {
        console.log('Exo Proxy server running on port 5000');
    });

    createWindow();
});

app.on('window-all-closed', () => {
    app.quit();
});

// IPC 파워오프 처리
ipcMain.on('poweroff', (event) => {
    // 우아하게 종료
    app.quit();
});
