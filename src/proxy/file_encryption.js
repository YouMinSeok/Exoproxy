// src/proxy/file_encryption.js
const fs = require('fs');
const path = require('path');
const { encrypt, decrypt } = require('./encryption');

// 파일 암호화 예시
function encryptFile(filePath) {
    const data = fs.readFileSync(filePath, 'utf8');
    const encryptedData = encrypt(data);
    fs.writeFileSync(`${filePath}.enc`, JSON.stringify(encryptedData));
}

function decryptFile(encryptedFilePath, outputPath) {
    const encryptedData = JSON.parse(fs.readFileSync(encryptedFilePath, 'utf8'));
    const decryptedData = decrypt(encryptedData);
    fs.writeFileSync(outputPath, decryptedData);
}

module.exports = {
    encryptFile,
    decryptFile,
};
