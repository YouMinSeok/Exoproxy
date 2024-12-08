// src/proxy/masterKey.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let electronApp; // Electron의 app 객체를 저장할 변수

/**
 * Electron app 초기화 함수
 * @param {Object} masterApp - Electron의 app 객체
 */
function init(masterApp) {
    electronApp = masterApp;
}

/**
 * 마스터 키 파일 경로 반환 함수
 * @returns {string} - 마스터 키 파일 경로
 */
function keyPath() {
    if (!electronApp) {
        throw new Error('Electron app is not initialized in masterKey module');
    }
    return path.join(electronApp.getPath('userData'), 'masterKey.json');
}

/**
 * 마스터 키 생성 함수
 */
function generateMasterKey() {
    if (fs.existsSync(keyPath())) {
        console.log('마스터키가 이미 생성되었습니다.');
        return;
    }

    const masterKey = crypto.randomBytes(32).toString('hex');
    const keyData = { EXOPROXY_MASTER_KEY: masterKey };

    fs.writeFileSync(keyPath(), JSON.stringify(keyData));
    console.log('마스터키가 생성되었습니다. masterKey.json 파일을 안전한 장소에 백업하세요.');
    console.log(`마스터키: ${masterKey}`);
}

/**
 * 마스터 키 로드 함수
 * @returns {string|null} - 마스터 키 또는 null
 */
function loadMasterKey() {
    if (fs.existsSync(keyPath())) {
        const keyData = JSON.parse(fs.readFileSync(keyPath()));
        return keyData.EXOPROXY_MASTER_KEY;
    } else {
        console.error('마스터키 파일이 없습니다. 애플리케이션을 다시 설치하거나 지원팀에 문의하세요.');
        return null;
    }
}

module.exports = {
    init,
    generateMasterKey,
    loadMasterKey,
};
