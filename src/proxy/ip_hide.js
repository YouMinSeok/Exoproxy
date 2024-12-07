function hideClientIP(req) {
    req.headers['X-Forwarded-For'] = null;
    req.headers['Via'] = null;
    req.headers['User-Agent'] = 'AnonymousProxy';
}

module.exports = { hideClientIP };
