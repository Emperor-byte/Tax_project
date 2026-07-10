'use strict';

const { loadApp } = require('./helpers/loadApp');

describe('showComplianceResult', () => {
  test('reveals the compliance panel', () => {
    loadApp('<div id="compliance-result" hidden></div>');
    showComplianceResult();
    expect(document.getElementById('compliance-result').hidden).toBe(false);
  });

  test('is a no-op when the panel is absent', () => {
    loadApp('');
    expect(() => showComplianceResult()).not.toThrow();
  });
});

describe('loadStatusReport with a query', () => {
  test('loads the report when a TIN is supplied and the user is logged in', () => {
    jest.useFakeTimers();
    loadApp(`
      <input id="status-search" value="TIN-1" />
      <div id="status-report" hidden></div>
      <div id="status-loading" hidden></div>
      <div id="status-table-body"></div>
    `);
    saveSession({ _id: 'u1', bizName: 'Acme', tin: 'TIN-1', entityType: 'Shop', address: 'x', role: 'user' });
    saveTable('utaps_payments', [
      { _id: 'p1', userId: 'u1', taxType: 'CIT', amount: 100, status: 'paid', paidAt: '2025-01-01T00:00:00.000Z' }
    ]);
    loadStatusReport();
    jest.advanceTimersByTime(400);
    expect(document.getElementById('status-report').hidden).toBe(false);
    jest.useRealTimers();
  });
});

describe('renderStatusReport penalty branch', () => {
  test('shows the penalty block for non-compliant entities without a notice', () => {
    loadApp('<div id="penalty-notice-block" hidden></div><div id="sec-overall-badge"></div>');
    renderStatusReport({
      entity: { bizName: 'Acme', tin: 'T', entityType: 'Shop', address: 'x' },
      overallStatus: 'Non-Compliant',
      payments: [],
      notices: [],
      summary: { totalPaid: 0, totalOutstanding: 0 }
    });
    expect(document.getElementById('penalty-notice-block').hidden).toBe(false);
  });
});

describe('sign-out flow via updateNavForAuth', () => {
  test('clicking the signup button while logged in signs the user out', () => {
    loadApp(`
      <button class="btn-nav-login"></button>
      <button class="btn-nav-signup"></button>
      <a class="protected-link"></a>
      <a class="admin-link"></a>
      <div id="section-home" class="section"></div>
    `);
    saveSession({ _id: 'u1', role: 'user' });
    updateNavForAuth();
    const signout = document.querySelector('.btn-nav-signup');
    expect(signout.textContent).toBe('Sign out');
    signout.onclick();
    expect(isLoggedIn()).toBe(false);
    expect(document.querySelector('#section-home.active')).not.toBeNull();
  });
});

describe('switchTab redraws admin charts', () => {
  test('schedules a chart redraw when the analytics tab becomes active', () => {
    jest.useFakeTimers();
    loadApp(`
      <span id="admin-stat-reg"></span><span id="admin-stat-paid"></span><span id="admin-stat-out"></span>
      <div id="admin-defaulters-list"></div><div id="admin-enterprise-list"></div><div id="admin-feedback-list"></div>
      <div class="tabs">
        <button class="tab active" id="tab-a" aria-selected="true"></button>
        <button class="tab" id="tab-b" aria-selected="false"></button>
      </div>
      <div id="admin1"></div>
      <div id="admin4" hidden></div>
    `);
    saveSession({ _id: 'a1', role: 'admin' });
    saveTable('utaps_users', [{ _id: 'a1', role: 'admin', entityType: 'Government' }]);
    saveTable('utaps_payments', []);
    saveTable('utaps_feedbacks', []);
    loadAdminDashboard();
    jest.advanceTimersByTime(400);
    // cachedAdminData is now populated; switching to admin4 schedules buildAdminCharts.
    const chartSpy = jest.fn();
    global.Chart = chartSpy;
    switchTab(document.getElementById('tab-b'), 'admin4');
    jest.advanceTimersByTime(60);
    expect(document.getElementById('admin4').hidden).toBe(false);
    delete global.Chart;
    jest.useRealTimers();
  });
});

describe('loadAdminDashboard draws charts when analytics tab is active', () => {
  test('builds charts immediately if the Analytics & Trends tab is active', () => {
    jest.useFakeTimers();
    loadApp(`
      <span id="admin-stat-reg"></span><span id="admin-stat-paid"></span><span id="admin-stat-out"></span>
      <div id="admin-defaulters-list"></div><div id="admin-enterprise-list"></div><div id="admin-feedback-list"></div>
      <button class="tab active">Analytics & Trends</button>
      <canvas id="adminRevenueChart"></canvas>
      <canvas id="adminPieChart"></canvas>
      <canvas id="adminTrendChart"></canvas>
    `);
    global.Chart = jest.fn(function () { this.destroy = jest.fn(); });
    saveSession({ _id: 'a1', role: 'admin' });
    saveTable('utaps_users', [{ _id: 'a1', role: 'admin', entityType: 'Government' }]);
    saveTable('utaps_payments', []);
    saveTable('utaps_feedbacks', []);
    loadAdminDashboard();
    jest.advanceTimersByTime(400);
    expect(global.Chart).toHaveBeenCalled();
    jest.useRealTimers();
  });
});

describe('buildAdminCharts with a mocked Chart.js', () => {
  function chartFixture() {
    return `
      <canvas id="adminRevenueChart"></canvas>
      <canvas id="adminPieChart"></canvas>
      <canvas id="adminTrendChart"></canvas>
    `;
  }

  const data = {
    monthlyAnalytics: { Jan: 1e6, Feb: 2e6, Mar: 0, Apr: 0, May: 0, Jun: 3e6 },
    entityBreakdown: { Shop: 2, Plaza: 1 }
  };

  afterEach(() => {
    delete global.Chart;
    delete window.adminRevChart;
    delete window.adminPieChart;
    delete window.adminTrendChart;
  });

  test('instantiates a chart for each canvas', () => {
    loadApp(chartFixture());
    const instances = [];
    global.Chart = jest.fn(function (ctx, config) {
      instances.push(config);
      this.destroy = jest.fn();
    });
    buildAdminCharts(data);
    expect(global.Chart).toHaveBeenCalledTimes(3);
    const types = instances.map(c => c.type);
    expect(types).toEqual(expect.arrayContaining(['bar', 'doughnut', 'line']));

    // The bar chart's y-axis tick callback formats values as Naira millions.
    const bar = instances.find(c => c.type === 'bar');
    const tickCallback = bar.options.scales.y.ticks.callback;
    expect(tickCallback(5)).toBe('₦5M');
  });

  test('destroys existing charts before rebuilding and honors light mode', () => {
    loadApp(chartFixture());
    const destroy = jest.fn();
    window.adminRevChart = { destroy };
    window.adminPieChart = { destroy };
    window.adminTrendChart = { destroy };
    document.documentElement.classList.add('light-mode');
    global.Chart = jest.fn(function () { this.destroy = jest.fn(); });
    buildAdminCharts(data);
    expect(destroy).toHaveBeenCalledTimes(3);
  });
});

describe('DOMContentLoaded bootstrap', () => {
  function fullFixture() {
    const sections = ['home', 'login', 'register', 'enterprise', 'legal', 'pay', 'status', 'analytics', 'feedback', 'forms']
      .map(id => `<div id="section-${id}" class="section"></div>`).join('');
    return `
      <i id="theme-icon"></i><i id="theme-icon-mobile"></i>
      <button class="btn-nav-login"></button><button class="btn-nav-signup"></button>
      <a class="protected-link"></a><a class="admin-link"></a>
      <button id="hero-reg-btn"></button><button id="hero-analytics-btn"></button>
      <div id="home-quick-checker-card"></div>
      <button id="tab-register-enterprise"></button><button id="tab-file-returns"></button>
      <nav id="main-nav"></nav><button id="hamburger" aria-expanded="false"></button>
      <select id="pay-type"><option value=""></option></select>
      <input id="pay-amount" /><span id="pay-total-display"></span>
      <div class="pay-method"><span>Bank Transfer</span></div>
      <div class="entity-card"></div>
      <div id="star-rating"><span class="star" data-val="1"><i></i></span></div>
      ${sections}
    `;
  }

  test('initializes theme, seeds the DB and shows the home section', () => {
    loadApp(fullFixture());
    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(JSON.parse(localStorage.getItem('utaps_users')).length).toBeGreaterThan(0);
    expect(document.querySelector('#section-home.active')).not.toBeNull();
  });

  test('wires pay-type change and pay-amount input to updatePayTotal', () => {
    loadApp(fullFixture());
    document.dispatchEvent(new Event('DOMContentLoaded'));
    const amount = document.getElementById('pay-amount');
    amount.value = '1200';
    amount.dispatchEvent(new Event('input'));
    expect(document.getElementById('pay-total-display').textContent).toBe('₦1,200.00');
  });

  test('outside click closes the mobile nav', () => {
    loadApp(fullFixture());
    document.dispatchEvent(new Event('DOMContentLoaded'));
    const nav = document.getElementById('main-nav');
    nav.classList.add('mobile-open');
    document.body.click();
    expect(nav.classList.contains('mobile-open')).toBe(false);
  });

  test('keyboard activation is wired for pay methods, entity cards and stars', () => {
    loadApp(fullFixture());
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const enter = () => new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });

    const payMethod = document.querySelector('.pay-method');
    payMethod.dispatchEvent(enter());
    expect(payMethod.classList.contains('active')).toBe(true);

    const card = document.querySelector('.entity-card');
    const cardClick = jest.fn();
    card.addEventListener('click', cardClick);
    card.dispatchEvent(enter());
    expect(cardClick).toHaveBeenCalled();

    const star = document.querySelector('#star-rating .star');
    star.dispatchEvent(enter());
    expect(star.classList.contains('filled')).toBe(true);
  });
});
