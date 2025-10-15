// demo.js - attaches handlers and performs fetches for the demo page
console.log('demo.js loaded');

function setStatus(id, msg, color) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.color = color || '#333';
  el.textContent = msg;
}

async function login() {
  setStatus('login-status', 'Logging in...');
  try {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    console.log('Attempting login for', email);

    const resp = await fetch('/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const text = await resp.text();
    let body;
    try { body = JSON.parse(text); } catch (e) { body = text; }

    console.log('Login response', resp.status, body);
    if (!resp.ok) {
      setStatus('login-status', `Login failed: ${resp.status} ${JSON.stringify(body)}`, 'crimson');
      return;
    }
    setStatus('login-status', 'Login successful — cookies should be set', 'green');
  } catch (err) {
    console.error('Login error', err);
    setStatus('login-status', 'Login error: ' + (err && err.message ? err.message : String(err)), 'crimson');
  }
}

async function getCsrf() {
  const r = await fetch('/auth/csrf-token', { credentials: 'include' });
  const j = await r.json();
  return j.csrfToken;
}

async function changePassword() {
  setStatus('change-status', 'Requesting CSRF token...');
  try {
    const current = document.getElementById('current').value;
    const newpw = document.getElementById('newpw').value;
    const csrf = await getCsrf();
    setStatus('change-status', 'Sending change-password request...');

    const r = await fetch('/auth/change-password', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ email: document.getElementById('email').value, currentPassword: current, newPassword: newpw }),
    });

    const text = await r.text();
    let j;
    try { j = JSON.parse(text); } catch (e) { j = text; }
    console.log('change-password response', r.status, j);
    if (!r.ok) {
      setStatus('change-status', `Failed: ${r.status} ${JSON.stringify(j)}`, 'crimson');
      return;
    }
    setStatus('change-status', `Success: ${JSON.stringify(j)}`, 'green');
  } catch (err) {
    console.error('change-password error', err);
    setStatus('change-status', 'Error: ' + (err && err.message ? err.message : String(err)), 'crimson');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready — attaching demo handlers');
  const loginBtn = document.getElementById('login');
  const changeBtn = document.getElementById('change');
  if (loginBtn) loginBtn.addEventListener('click', login);
  if (changeBtn) changeBtn.addEventListener('click', changePassword);

  // quick indicator that script executed
  const readyEl = document.getElementById('script-ready');
  if (readyEl) readyEl.textContent = 'Demo script loaded and running';
});
