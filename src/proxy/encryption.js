const crypto = require('crypto');
const masterKeyModule = require('./masterKey');

let masterKey;

function initEncryption() {
    const masterKeyHex = masterKeyModule.loadMasterKey();
    if (!masterKeyHex) {
        throw new Error('마스터키를 로드할 수 없습니다.');
    }
    masterKey = Buffer.from(masterKeyHex, 'hex');
}

const algorithm = 'aes-256-cbc';

function encrypt(text) {
    if (!masterKey) {
        throw new Error('Encryption module not initialized');
    }
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, masterKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return {
        iv: iv.toString('hex'),
        content: encrypted,
    };
}

function decrypt(encryptedData) {
    if (!masterKey) {
        throw new Error('Encryption module not initialized');
    }
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, masterKey, iv);
    let decrypted = decipher.update(encryptedData.content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

module.exports = {
    initEncryption,
    encrypt,
    decrypt,
};
