// proxy/anonymity.js

function hideClientIP(req) {
    // 클라이언트 IP를 숨기기 위해 헤더 수정
    delete req.headers['x-forwarded-for'];
    req.headers['x-real-ip'] = '0.0.0.0';
}

function ensureAnonymity(req) {
    // 추가적인 익명성 보장 로직을 구현하세요.
    // 예: User-Agent 변경, Referer 제거 등
    req.headers['user-agent'] = 'ExoProxy';
    delete req.headers['referer'];
}

module.exports = {
    hideClientIP,
    ensureAnonymity
};
