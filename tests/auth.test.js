'use strict';

const { loadApp } = require('./helpers/loadApp');

const SECTIONS = ['home', 'login', 'analytics'];

function loginFixture() {
  const sections = SECTIONS.map(id => `<div id="section-${id}" class="section"></div>`).join('');
  return `
    <input id="login-tin" value="" />
    <input id="login-pass" value="" />
    <p id="login-error" hidden></p>
    <button class="auth-submit"></button>
    ${sections}
  `;
}

describe('handleLogin', () => {
  test('shows an inline error when fields are empty', async () => {
    loadApp(loginFixture());
    await handleLogin();
    const err = document.getElementById('login-error');
    expect(err.hidden).toBe(false);
    expect(err.textContent).toContain('TIN');
  });

  test('logs a user in with valid credentials', () => {
    jest.useFakeTimers();
    loadApp(loginFixture());
    saveTable('utaps_users', [
      { _id: 'u1', tin: 'TIN-1', email: 'user@gmail.com', password: 'pass1234', bizName: 'Acme', role: 'user' }
    ]);
    document.getElementById('login-tin').value = 'user@gmail.com';
    document.getElementById('login-pass').value = 'pass1234';
    handleLogin();
    jest.advanceTimersByTime(500);
    expect(isLoggedIn()).toBe(true);
    expect(document.querySelector('#section-home.active')).not.toBeNull();
    jest.useRealTimers();
  });

  test('routes an admin to the analytics dashboard', () => {
    jest.useFakeTimers();
    loadApp(loginFixture());
    saveTable('utaps_users', [
      { _id: 'a1', tin: 'ADMIN-001', email: 'admin@gmail.com', password: 'admin1234', bizName: 'Gov', role: 'admin' }
    ]);
    document.getElementById('login-tin').value = 'admin@gmail.com';
    document.getElementById('login-pass').value = 'admin1234';
    handleLogin();
    jest.advanceTimersByTime(500);
    expect(document.querySelector('#section-analytics.active')).not.toBeNull();
    jest.useRealTimers();
  });

  test('shows an error for invalid credentials', () => {
    jest.useFakeTimers();
    loadApp(loginFixture());
    saveTable('utaps_users', [
      { _id: 'u1', tin: 'TIN-1', email: 'user@gmail.com', password: 'pass1234', role: 'user' }
    ]);
    document.getElementById('login-tin').value = 'user@gmail.com';
    document.getElementById('login-pass').value = 'wrong';
    handleLogin();
    jest.advanceTimersByTime(500);
    expect(isLoggedIn()).toBe(false);
    expect(document.getElementById('login-error').textContent).toContain('Invalid credentials');
    jest.useRealTimers();
  });
});

describe('togglePassword', () => {
  test('switches between password and text and updates the icon', () => {
    loadApp(`
      <input id="pw" type="password" />
      <button id="toggle"><i class="ti ti-eye"></i></button>
    `);
    const input = document.getElementById('pw');
    const btn = document.getElementById('toggle');
    togglePassword('pw', btn);
    expect(input.type).toBe('text');
    expect(btn.querySelector('i').className).toBe('ti ti-eye-off');
    togglePassword('pw', btn);
    expect(input.type).toBe('password');
    expect(btn.querySelector('i').className).toBe('ti ti-eye');
  });

  test('does nothing when the input does not exist', () => {
    loadApp('<button id="toggle"><i></i></button>');
    expect(() => togglePassword('missing', document.getElementById('toggle'))).not.toThrow();
  });
});
