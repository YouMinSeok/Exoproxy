// src/proxy/__tests__/proxy.test.js
const request = require('supertest');
const app = require('../index.js');

describe('Proxy Server', () => {
    it('should serve PAC file', async () => {
        const res = await request(app).get('/proxy.pac');
        expect(res.statusCode).toEqual(200);
        expect(res.headers['content-type']).toContain('application/x-ns-proxy-autoconfig');
        expect(res.text).toContain('PROXY localhost:5000');
    });

    it('should return API status', async () => {
        const res = await request(app).get('/status');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('apiStatus');
    });

    // 추가적인 테스트 케이스 작성
});
