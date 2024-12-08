// proxy/logger.js

const { createLogger, format, transports } = require('winston');
const path = require('path');

// 로그 디렉토리 생성 (없을 경우)
const fs = require('fs');
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: path.join(logDir, 'server.log') })
    ],
});

module.exports = logger;
