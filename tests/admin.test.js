'use strict';

const { loadApp } = require('./helpers/loadApp');

const adminFixture = `
  <span id="admin-stat-reg"></span>
  <span id="admin-stat-paid"></span>
  <span id="admin-stat-out"></span>
  <div id="admin-defaulters-list"></div>
  <div id="admin-enterprise-list"></div>
  <div id="admin-feedback-list"></div>
`;

describe('loadAdminDashboard', () => {
  test('does nothing for a non-admin user', () => {
    jest.useFakeTimers();
    loadApp(adminFixture);
    saveSession({ _id: 'u1', role: 'user' });
    loadAdminDashboard();
    jest.advanceTimersByTime(500);
    expect(document.getElementById('admin-stat-reg').textContent).toBe('');
    jest.useRealTimers();
  });

  test('aggregates stats, defaulters, enterprises and feedback for admins', () => {
    jest.useFakeTimers();
    loadApp(adminFixture);
    saveSession({ _id: 'a1', role: 'admin' });
    saveTable('utaps_users', [
      { _id: 'a1', role: 'admin', entityType: 'Government' },
      { _id: 'u1', role: 'user', bizName: 'Acme', tin: 'TIN-1', entityType: 'Shop', location: 'Aba Road', status: 'active' },
      { _id: 'u2', role: 'user', bizName: 'Beta', tin: 'TIN-2', entityType: 'Plaza', location: 'Umuahia', status: 'active' }
    ]);
    saveTable('utaps_payments', [
      { _id: 'p1', userId: 'u1', taxType: 'CIT', amount: 2000000, status: 'paid', paidAt: '2026-01-15T00:00:00.000Z' },
      { _id: 'p2', userId: 'u2', taxType: 'PAYE', amount: 500000, status: 'overdue', dueDate: '2026-06-30' },
      { _id: 'p3', userId: 'u2', taxType: 'BPL', amount: 300000, status: 'due', dueDate: '2026-07-31' }
    ]);
    saveTable('utaps_feedbacks', [
      { _id: 'f1', userName: 'Acme', rating: 4, comment: 'Nice', category: 'Usability', createdAt: '2026-02-01T00:00:00.000Z' }
    ]);
    loadAdminDashboard();
    jest.advanceTimersByTime(400);

    expect(document.getElementById('admin-stat-reg').textContent).toBe('2');
    expect(document.getElementById('admin-stat-paid').textContent).toBe('₦2.0M');
    expect(document.getElementById('admin-stat-out').textContent).toBe('₦0.8M');
    expect(document.getElementById('admin-defaulters-list').innerHTML).toContain('Beta');
    expect(document.getElementById('admin-enterprise-list').innerHTML).toContain('Acme');
    expect(document.getElementById('admin-feedback-list').innerHTML).toContain('Nice');
    jest.useRealTimers();
  });

  test('renders empty-state messages when there is no data', () => {
    jest.useFakeTimers();
    loadApp(adminFixture);
    saveSession({ _id: 'a1', role: 'admin' });
    saveTable('utaps_users', [{ _id: 'a1', role: 'admin', entityType: 'Government' }]);
    saveTable('utaps_payments', []);
    saveTable('utaps_feedbacks', []);
    loadAdminDashboard();
    jest.advanceTimersByTime(400);
    expect(document.getElementById('admin-defaulters-list').textContent).toContain('No defaulters');
    expect(document.getElementById('admin-enterprise-list').textContent).toContain('No enterprises');
    expect(document.getElementById('admin-feedback-list').textContent).toContain('No feedbacks');
    jest.useRealTimers();
  });
});

describe('buildAdminCharts', () => {
  test('returns early when Chart.js is not loaded', () => {
    loadApp('<canvas id="adminRevenueChart"></canvas>');
    expect(typeof Chart).toBe('undefined');
    expect(() => buildAdminCharts({ monthlyAnalytics: {}, entityBreakdown: {} })).not.toThrow();
  });
});

const navFixture = `
  <button class="btn-nav-login"></button>
  <button class="btn-nav-signup"></button>
  <a class="protected-link"></a>
  <a class="admin-link"></a>
  <button id="hero-reg-btn"></button>
  <button id="hero-analytics-btn"></button>
  <div id="home-quick-checker-card"></div>
  <button id="tab-register-enterprise" class="active"></button>
  <button id="tab-file-returns"></button>
  <div id="section-home" class="section"></div>
  <div id="section-login" class="section"></div>
  <div id="section-register" class="section"></div>
`;

describe('updateNavForAuth', () => {
  test('shows sign-in/register controls and hides protected links when logged out', () => {
    loadApp(navFixture);
    updateNavForAuth();
    expect(document.querySelector('.btn-nav-login').textContent).toBe('Sign in');
    expect(document.querySelector('.btn-nav-signup').textContent).toBe('Register');
    expect(document.querySelector('.protected-link').style.display).toBe('none');
    expect(document.querySelector('.admin-link').style.display).toBe('none');
    expect(document.getElementById('hero-reg-btn').style.display).toBe('inline-flex');
  });

  test('the logged-out login and register buttons navigate to their sections', () => {
    loadApp(navFixture);
    updateNavForAuth();
    document.querySelector('.btn-nav-login').onclick();
    expect(document.querySelector('#section-login.active')).not.toBeNull();
    document.querySelector('.btn-nav-signup').onclick();
    expect(document.querySelector('#section-register.active')).not.toBeNull();
  });

  test('reveals protected links and a sign-out button for a logged-in user', () => {
    loadApp(navFixture);
    saveSession({ _id: 'u1', role: 'user' });
    updateNavForAuth();
    expect(document.querySelector('.btn-nav-login').style.display).toBe('none');
    expect(document.querySelector('.btn-nav-signup').textContent).toBe('Sign out');
    expect(document.querySelector('.protected-link').style.display).toBe('flex');
    expect(document.querySelector('.admin-link').style.display).toBe('none');
    expect(document.getElementById('hero-analytics-btn').style.display).toBe('none');
  });

  test('exposes admin links and the analytics button for an admin', () => {
    loadApp(navFixture);
    saveSession({ _id: 'a1', role: 'admin' });
    updateNavForAuth();
    expect(document.querySelector('.admin-link').style.display).toBe('flex');
    expect(document.getElementById('hero-analytics-btn').style.display).toBe('inline-flex');
  });
});
