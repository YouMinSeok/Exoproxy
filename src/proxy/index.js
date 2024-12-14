// index.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const httpProxy = require('http-proxy');
const cors = require('cors');
const compression = require('compression');
const https = require('https');
const logger = require('./logger');
const { hideClientIP, ensureAnonymity } = require('./anonymity');
const isDev = require('is-dev'); 
const { decrypt } = require('./encryption');

const app = express();
const proxy = httpProxy.createProxyServer({});

// HTTPS 옵션 (자체 서명 인증서 사용 시 브라우저 경고 발생)
const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem')),
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: isDev ? '*' : 'https://your-production-domain.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(compression());

const configPath = path.join(__dirname, 'config.json');

let config = {
    mode: 'reverse', // 초기값 reverse
    frontend: []
};

if (fs.existsSync(configPath)) {
    const data = fs.readFileSync(configPath);
    config = JSON.parse(data);
} else {
    saveConfig();
}

function saveConfig() {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

let features = {
    ipHide: false,
    anonymity: false,
    encrypt: false,
    dataEncrypt: false,
    fileEncrypt: false,
    randomDistribution: false,
};

// 모든 요청 로깅
app.use((req, res, next) => {
    logger.info(`Received ${req.method} request for ${req.url}`);
    next();
});

// 상태 API
app.get('/status', (req, res) => {
    res.json({ success: true, mode: config.mode });
});

// 기능 상태 조회 API
app.get('/features', (req, res) => {
    res.json(features);
});

// 모드 전환 API
app.post('/set-mode', (req, res) => {
    const { mode } = req.body;
    if (mode !== 'forward' && mode !== 'reverse') {
        return res.status(400).json({ success: false, message: '유효하지 않은 모드입니다.' });
    }
    config.mode = mode;
    if (mode === 'forward') {
        // 포워드 모드에서는 frontend URL 필요없음
        config.frontend = [];
    }
    saveConfig();
    logger.info(`운영 모드가 ${mode}으로 변경되었습니다.`);
    notifyModeChange(mode);
    res.json({ success: true, message: `운영 모드가 ${mode}으로 변경되었습니다.` });
});

// /enable-proxy (forward 모드 활성화)
app.post('/enable-proxy', (req, res) => {
    config.mode = 'forward';
    config.frontend = [];
    saveConfig();
    logger.info('프록시 서버가 포워드 모드로 설정되었습니다.');
    notifyModeChange('forward');
    res.json({ success: true, message: '프록시 서버가 포워드 모드로 설정되었습니다.' });
});

// 기능 토글 API
app.post('/toggle-feature', (req, res) => {
    const { feature, enabled } = req.body;
    if (features.hasOwnProperty(feature)) {
        features[feature] = enabled;
        logger.info(`${feature} 기능이 ${enabled ? '활성화' : '비활성화'}되었습니다.`);
        return res.json({ success: true, message: `${feature} 기능이 ${enabled ? '활성화' : '비활성화'}되었습니다.` });
    }
    res.status(400).json({ success: false, message: '유효하지 않은 기능입니다.' });
});

// 명령어 처리 API
app.post('/command', (req, res) => {
    const { command } = req.body;
    if (!command) {
        return res.status(400).json({ success: false, message: '명령어를 입력하세요.' });
    }

    const trimmedCommand = command.trim();

    if (trimmedCommand === 'status') {
        return res.json({ success: true, output: `프록시 서버 모드: ${config.mode === 'forward' ? '포워드 프록시 (ON)' : '리버스 프록시 (OFF)'}` });
    }

    if (trimmedCommand === 'poweroff') {
        return res.json({ success: true, output: '시스템 종료 중...' });
    }

    if (trimmedCommand === 'api list') {
        if (config.frontend.length === 0) {
            return res.json({ success: true, output: '등록된 프론트엔드 URL이 없습니다.' });
        } else {
            return res.json({ success: true, output: `등록된 URL:\n${config.frontend.join('\n')}` });
        }
    }

    if (trimmedCommand === 'stat') {
        const urlCount = config.frontend.length;
        return res.json({ 
            success: true, 
            output: `현재 모드: ${config.mode}\n등록된 프론트엔드 URL 개수: ${urlCount}` 
        });
    }

    if (trimmedCommand === 'help') {
        const commands = [
            'status: 현재 프록시 모드 상태 표시',
            'poweroff: 시스템 종료',
            'api list: 등록된 프론트엔드 URL 목록 표시',
            'stat: 현재 모드 및 URL 수 표시',
            'help: 명령어 목록 표시'
        ];
        return res.json({ success: true, output: `사용 가능한 명령어:\n${commands.join('\n')}` });
    }

    return res.json({ success: false, output: `알 수 없는 명령어: ${command}` });
});

// Poweroff API
app.post('/poweroff', (req, res) => {
    res.json({ success: true, message: '시스템 종료 중...' });
    // Electron IPC를 통해 앱 종료 로직 수행
});

// PAC 파일 제공
app.get('/proxy.pac', (req, res) => {
    res.type('application/x-ns-proxy-autoconfig');
    res.send(`
        function FindProxyForURL(url, host) {
            if (host === 'localhost' || host === '127.0.0.1') {
                return 'DIRECT';
            }
            return 'PROXY localhost:5000';
        }
    `);
});

// Reverse 모드 URL 등록 API
app.post('/register', (req, res) => {
    if (config.mode !== 'reverse') {
        return res.status(400).json({ success: false, message: '현재 모드에서는 프론트엔드 URL을 등록할 수 없습니다.' });
    }
    const { frontendUrl } = req.body;
    if (!frontendUrl || !frontendUrl.startsWith('http')) {
        return res.status(400).json({ success: false, message: '유효하지 않은 URL 형식입니다.' });
    }
    config.frontend.push(frontendUrl);
    saveConfig();
    logger.info(`프론트엔드 URL이 등록되었습니다: ${frontendUrl}`);
    res.json({ success: true, message: '프론트엔드 URL이 등록되었습니다!' });
});

// 요청 처리 로직
app.use((req, res) => {
    if (config.mode === 'forward') {
        // Forward 모드
        const target = req.url.startsWith('http') ? req.url : `http://${req.headers.host}${req.url}`;
        logger.info(`[FORWARD] 요청 -> ${target}`);
        
        if (features.ipHide) hideClientIP(req);
        if (features.anonymity) ensureAnonymity(req);

        // secure: false 추가 (필요한 경우, HTTP 대상일 때)
        proxy.web(req, res, { target: target, changeOrigin: true, secure: false });

    } else if (config.mode === 'reverse') {
        // Reverse 모드
        if (config.frontend.length === 0) {
            return res.status(503).send('등록된 프론트엔드 URL이 없습니다.');
        }

        let target;
        if (features.randomDistribution) {
            target = config.frontend[Math.floor(Math.random() * config.frontend.length)];
        } else {
            target = config.frontend[0];
        }

        logger.info(`[REVERSE] 요청 -> ${target}`);

        if (features.ipHide) hideClientIP(req);
        if (features.anonymity) ensureAnonymity(req);

        // secure: false 추가, http://localhost:3000 같은 HTTP 대상 가능
        proxy.web(req, res, { target: target, changeOrigin: true, secure: false });
    } else {
        res.status(500).send('잘못된 프록시 모드입니다.');
    }
});

// 에러 핸들링
app.use((err, req, res, next) => {
    logger.error(`Error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// WebSocket 설정
const WebSocket = require('ws');
const httpsServer = https.createServer(sslOptions, app);
const wss = new WebSocket.Server({ server: httpsServer });

wss.on('connection', (ws) => {
    logger.info('WebSocket client connected');

    ws.on('message', (message) => {
        logger.info(`Received message: ${message}`);
    });

    ws.on('close', () => {
        logger.info('WebSocket client disconnected');
    });

    ws.send(JSON.stringify({ type: 'mode', mode: config.mode }));
});

function notifyModeChange(mode) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'mode', mode }));
        }
    });
}

// 암호화 경로 처리 (필요시 유지)
app.all('/encrypted/:encryptedPath', (req, res, next) => {
    try {
        const { encryptedPath } = req.params;
        const { iv } = req.query;

        if (!features.encrypt) {
            return res.status(400).json({ success: false, message: '경로 암호화 비활성화 상태입니다.' });
        }

        const decryptedPath = decrypt({ content: encryptedPath, iv: iv });
        logger.info(`복호화된 경로: ${decryptedPath}`);
        req.url = decryptedPath;
        next();
    } catch (error) {
        logger.error(`경로 복호화 실패: ${error.message}`);
        res.status(400).json({ success: false, message: '경로 복호화 실패', error: error.message });
    }
});

httpsServer.listen(5000, () => {
    logger.info('Exo Proxy HTTPS server running on port 5000');
});

module.exports = app;
