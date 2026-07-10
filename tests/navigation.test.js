'use strict';

const { loadApp } = require('./helpers/loadApp');

const SECTIONS = ['home', 'login', 'register', 'enterprise', 'legal', 'pay', 'status', 'analytics', 'feedback', 'forms'];

function navFixture() {
  const sections = SECTIONS.map(id => `<div id="section-${id}" class="section"></div>`).join('');
  const links = SECTIONS.map(id => `<a class="nav-link" data-section="${id}"></a>`).join('');
  return sections + links;
}

function activeSection() {
  const el = document.querySelector('.section.active');
  return el ? el.id.replace('section-', '') : null;
}

describe('showSection', () => {
  test('activates a public section and its nav link', () => {
    loadApp(navFixture());
    showSection('home');
    expect(activeSection()).toBe('home');
    const active = document.querySelector('.nav-link.active');
    expect(active.getAttribute('data-section')).toBe('home');
  });

  test('redirects to login for protected sections when logged out', () => {
    loadApp(navFixture());
    showSection('pay');
    expect(activeSection()).toBe('login');
    expect(document.getElementById('toast-container').textContent).toContain('sign in');
  });

  test('redirects non-admins away from analytics to home', () => {
    loadApp(navFixture());
    saveSession({ _id: 'u1', role: 'user' });
    showSection('analytics');
    expect(activeSection()).toBe('home');
    expect(document.getElementById('toast-container').textContent).toContain('Admin access required');
  });

  test('allows an admin to open analytics', () => {
    loadApp(navFixture());
    saveSession({ _id: 'a1', role: 'admin' });
    showSection('analytics');
    expect(activeSection()).toBe('analytics');
  });

  test('returns false so inline handlers can prevent default', () => {
    loadApp(navFixture());
    expect(showSection('home')).toBe(false);
  });
});

describe('switchTab', () => {
  const tabsFixture = `
    <div class="tabs">
      <button class="tab active" id="t1" aria-selected="true"></button>
      <button class="tab" id="t2" aria-selected="false"></button>
    </div>
    <div id="panel1" class="active"></div>
    <div id="panel2" hidden></div>
  `;

  test('activates the clicked tab and reveals its panel', () => {
    loadApp(tabsFixture);
    const t2 = document.getElementById('t2');
    switchTab(t2, 'panel2');
    expect(t2.classList.contains('active')).toBe(true);
    expect(t2.getAttribute('aria-selected')).toBe('true');
    expect(document.getElementById('t1').classList.contains('active')).toBe(false);
    const p2 = document.getElementById('panel2');
    expect(p2.hidden).toBe(false);
    expect(document.getElementById('panel1').hidden).toBe(true);
  });

  test('does nothing when the element is not inside a .tabs container', () => {
    loadApp('<button id="lonely"></button><div id="panel1"></div>');
    expect(() => switchTab(document.getElementById('lonely'), 'panel1')).not.toThrow();
  });
});

describe('handleCard', () => {
  beforeEach(() => loadApp(navFixture()));

  test('navigates on Enter key', () => {
    const evt = { key: 'Enter', preventDefault: jest.fn() };
    handleCard(evt, 'register');
    expect(evt.preventDefault).toHaveBeenCalled();
    expect(activeSection()).toBe('register');
  });

  test('ignores unrelated keys', () => {
    const evt = { key: 'a', preventDefault: jest.fn() };
    handleCard(evt, 'register');
    expect(evt.preventDefault).not.toHaveBeenCalled();
  });
});

describe('toggleMobileNav', () => {
  test('toggles the mobile-open class and aria-expanded', () => {
    loadApp('<div id="main-nav"></div><button id="hamburger" aria-expanded="false"></button>');
    const nav = document.getElementById('main-nav');
    const btn = document.getElementById('hamburger');
    toggleMobileNav();
    expect(nav.classList.contains('mobile-open')).toBe(true);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    toggleMobileNav();
    expect(nav.classList.contains('mobile-open')).toBe(false);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('selectPayMethod', () => {
  test('marks the chosen method active and clears the others', () => {
    loadApp(`
      <div class="pay-method active" id="m1" aria-pressed="true"></div>
      <div class="pay-method" id="m2" aria-pressed="false"></div>
    `);
    selectPayMethod(document.getElementById('m2'));
    expect(document.getElementById('m2').classList.contains('active')).toBe(true);
    expect(document.getElementById('m2').getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('m1').classList.contains('active')).toBe(false);
    expect(document.getElementById('m1').getAttribute('aria-pressed')).toBe('false');
  });
});
