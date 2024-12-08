require('dotenv').config();

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const masterKeyModule = require('../proxy/masterKey'); // 마스터키 관련 모듈
const { initEncryption } = require('../proxy/encryption'); // 암호화 모듈
const { autoUpdater } = require('electron-updater');
const isDev = require('is-dev'); // 개발 모드 확인을 위한 패키지

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

    // 스플래시 화면 로드
    mainWindow.loadFile(path.join(__dirname, '../../public/splash.html'));

    // 3초 후 메인 UI 로드
    setTimeout(() => {
        if (!mainWindow.isDestroyed()) {
            mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));
        }
    }, 3000);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    try {
        console.log('Initializing masterKeyModule...');
        masterKeyModule.init(app);
        masterKeyModule.generateMasterKey();

        console.log('Initializing encryption...');
        initEncryption();

        // 이전에는 여기서 setPAC()를 호출했으나 제거하였습니다.
        // 이제 PAC 설정은 Forward 모드 진입 후 렌더러에서 runPACSetup IPC를 통해 진행합니다.

        if (!isDev) {
            console.log('Checking for updates...');
            autoUpdater.checkForUpdatesAndNotify();
        } else {
            console.log('Development mode: Skipping auto-updater.');
        }

        console.log('Creating window...');
        createWindow();
    } catch (error) {
        console.error('앱 초기화 중 오류 발생:', error);
        app.quit();
    }
});

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    console.log(`Certificate error detected for URL: ${url}`);
    if (isDev && url.startsWith('https://localhost:5000')) {
        console.log(`Ignoring certificate error for: ${url}`);
        event.preventDefault();
        callback(true);
    } else {
        callback(false);
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Poweroff IPC 이벤트
ipcMain.on('poweroff', (event) => {
    // 우아하게 종료
    app.quit();
});

// PAC 설정 IPC 이벤트 추가
ipcMain.on('run-pac-setup', (event) => {
    const scriptPath = path.join(__dirname, '../../scripts/setupPAC.js');
    exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error('PAC 설정 실패:', stderr);
            event.reply('pac-setup-done', { success: false, message: stderr });
        } else {
            console.log('PAC 설정 완료:', stdout);
            event.reply('pac-setup-done', { success: true, message: 'PAC 자동 설정 완료' });
        }
    });
});

// 자동 업데이트
autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall();
});
