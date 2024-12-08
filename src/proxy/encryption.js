// src/proxy/encryption.js

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 마스터 키 로드 또는 생성
let masterKey;
const masterKeyPath = path.join(__dirname, 'masterKey.json');

function initEncryption() {
    if (fs.existsSync(masterKeyPath)) {
        const data = fs.readFileSync(masterKeyPath);
        const parsed = JSON.parse(data);
        masterKey = Buffer.from(parsed.key, 'hex');
        console.log('Encryption key loaded.');
    } else {
        masterKey = crypto.randomBytes(32); // 256비트 키
        fs.writeFileSync(masterKeyPath, JSON.stringify({ key: masterKey.toString('hex') }, null, 2));
        console.log('Encryption key generated and saved.');
    }
}

function encrypt(text) {
    const iv = crypto.randomBytes(16); // 128비트 IV
    const cipher = crypto.createCipheriv('aes-256-cbc', masterKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return { content: encrypted, iv: iv.toString('hex') };
}

function decrypt({ content, iv }) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', masterKey, Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

module.exports = {
    initEncryption,
    encrypt,
    decrypt
};
