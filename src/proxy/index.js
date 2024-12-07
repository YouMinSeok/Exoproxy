require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');
const { encrypt, decrypt } = require('./encryption');
const { hideClientIP } = require('./ip_hide');
const { ensureAnonymity } = require('./anonymity');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(require('cors')());

// 경로 관리 로직
const routesPath = path.join(__dirname, 'utils', 'routes.json');
let routes = {
    frontend: [],
    currentIndex: 0,
};

if (fs.existsSync(routesPath)) {
    const data = fs.readFileSync(routesPath);
    routes = JSON.parse(data);
}

function saveRoutes() {
    fs.writeFileSync(routesPath, JSON.stringify(routes, null, 2));
}

function addFrontendUrl(url) {
    routes.frontend.push(url);
    saveRoutes();
}

// 기능 상태 관리
let features = {
    ipHide: false,
    anonymity: false,
    encrypt: false,
    dataEncrypt: false,
    fileEncrypt: false,
    randomDistribution: false,
};

// 상태 API
app.get('/status', (req, res) => {
    const apiStatus = routes.frontend.length > 0 ? 'ON' : 'OFF';
    res.json({ apiStatus });
});

// 기능 상태 조회 API
app.get('/features', (req, res) => {
    res.json(features);
});

// 프론트엔드 URL 등록 API
app.post('/register', (req, res) => {
    const { frontendUrl } = req.body;
    if (!frontendUrl || !frontendUrl.startsWith('http')) {
        return res.status(400).json({ message: '유효하지 않은 URL 형식입니다.' });
    }
    addFrontendUrl(frontendUrl);
    logger.info(`프론트엔드 URL이 등록되었습니다: ${frontendUrl}`);
    res.json({ message: '프론트엔드 URL이 등록되었습니다!' });
});

// 기능 토글 API
app.post('/toggle-feature', (req, res) => {
    const { feature, enabled } = req.body;
    if (features.hasOwnProperty(feature)) {
        features[feature] = enabled;
        logger.info(`${feature} 기능이 ${enabled ? '활성화' : '비활성화'}되었습니다.`);
        return res.json({ message: `${feature} 기능이 ${enabled ? '활성화' : '비활성화'}되었습니다.` });
    }
    res.status(400).json({ message: '유효하지 않은 기능입니다.' });
});

// 커맨드 실행 API
app.post('/command', (req, res) => {
    const { command } = req.body;
    if (!command) {
        return res.status(400).json({ message: '명령어를 입력하세요.' });
    }

    if (command.trim() === 'api list') {
        if (routes.frontend.length === 0) {
            return res.json({ output: '등록된 API(프론트엔드 URL)가 없습니다.' });
        }
        return res.json({ output: `등록된 API(URL):\n${routes.frontend.join('\n')}` });
    }

    if (command.trim() === 'poweroff') {
        return res.json({ output: '시스템 종료 중...' });
    }

    return res.json({ output: `알 수 없는 명령어: ${command}` });
});

// 파워오프 API
app.post('/poweroff', (req, res) => {
    // 상태 초기화: routes.json 삭제하여 재시작 시 초기상태
    if (fs.existsSync(routesPath)) {
        fs.unlinkSync(routesPath);
    }
    // features 초기화
    features = {
        ipHide: false,
        anonymity: false,
        encrypt: false,
        dataEncrypt: false,
        fileEncrypt: false,
        randomDistribution: false,
    };
    res.json({ message: '시스템 종료 중...' });
    // 클라이언트에서 ipcRenderer.send('poweroff')로 Electron 종료 요청
});

// 암호화된 경로 처리
app.all('/encrypted/:encryptedPath', (req, res, next) => {
    try {
        const { encryptedPath } = req.params;
        const { iv } = req.query;

        if (!features.encrypt) {
            return res.status(400).json({ message: '경로 암호화 비활성화 상태입니다.' });
        }

        const decryptedPath = decrypt({
            content: encryptedPath,
            iv: iv,
        });

        logger.info(`복호화된 경로: ${decryptedPath}`);
        req.url = decryptedPath;
        next();
    } catch (error) {
        console.error('경로 복호화 실패:', error);
        res.status(400).json({ message: '경로 복호화 실패', error: error.message });
    }
});

// 프록시 요청 처리
app.use('/', (req, res, next) => {
    if (features.ipHide) {
        hideClientIP(req);
    }
    if (features.anonymity) {
        ensureAnonymity(req);
    }

    if (features.encrypt) {
        const { encrypt } = require('./encryption');
        const encryptedPathData = encrypt(req.path);
        req.url = `/encrypted/${encryptedPathData.content}?iv=${encryptedPathData.iv}`;
    }

    if (features.dataEncrypt && req.body) {
        const { encrypt } = require('./encryption');
        const encryptedData = encrypt(JSON.stringify(req.body));
        req.body = encryptedData;
    }

    let target;
    if (routes.frontend.length > 0) {
        if (features.randomDistribution) {
            target = routes.frontend[Math.floor(Math.random() * routes.frontend.length)];
        } else {
            target = routes.frontend[routes.currentIndex];
            routes.currentIndex = (routes.currentIndex + 1) % routes.frontend.length;
            saveRoutes();
        }
    } else {
        return res.status(503).send('등록된 프론트엔드 URL이 없습니다.');
    }

    logger.info(`요청을 다음으로 라우팅 중: ${target}`);

    createProxyMiddleware({
        target: target,
        changeOrigin: true,
        selfHandleResponse: false,
    })(req, res, next);
});

module.exports = app;
