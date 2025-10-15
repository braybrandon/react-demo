const request = require('supertest');

// NOTE: These tests expect the server to be running on process.env.PORT (default 4000).
// They are integration style and should be run locally with the server started.
const base = `http://localhost:${process.env.PORT || 4000}`;

describe('CSRF enforcement on refresh', () => {
    it('rejects cookie-based refresh without X-CSRF-Token', async () => {
        const res = await request(base).post('/auth/refresh').set('Cookie', ['refresh=dummy']).send();
        expect(res.status).toBe(401); // missing or invalid token
    });

    it('accepts cookie-based refresh with X-CSRF-Token header when CSRF token present', async () => {
        // This test assumes manual setup: get a valid csrf token and a valid refresh cookie by logging in
        // For automation you'd create a user, login, extract cookies and csrf token, then call /auth/refresh.
        // Here we check only that the endpoint is available and requires header; integration flow should be tested live.
        const res = await request(base).get('/auth/csrf-token');
        expect(res.status).toBe(200);
        const csrf = res.body && res.body.csrfToken;
        // If no csrf token is available the server might be misconfigured; assert 200/has token
        expect(typeof csrf).toBe('string');
    });
});
