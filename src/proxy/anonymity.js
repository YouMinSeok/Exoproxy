function ensureAnonymity(req) {
    req.headers['Forwarded'] = null;
    req.headers['Via'] = null;
}

module.exports = { ensureAnonymity };
