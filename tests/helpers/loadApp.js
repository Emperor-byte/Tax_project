'use strict';

const path = require('path');

const SOURCE_PATH = path.resolve(__dirname, '..', '..', 'UTAPS', 'tax.js');

const EXPORT_NAMES = [
  'initLocalDB', 'getTable', 'saveTable', 'generateId',
  'toggleTheme', 'updateThemeIcons', 'initTheme',
  'isLoggedIn', 'saveSession', 'clearSession', 'loadSession',
  'updateNavForAuth', 'showSection', 'toggleMobileNav', 'switchTab', 'handleCard',
  'handleLogin', 'togglePassword', 'regNext', 'validateRegStep',
  'populateConfirmation', 'handleRegister', 'showComplianceResult',
  'updatePayTotal', 'selectPayMethod', 'submitPayment',
  'loadStatusReport', 'loadMyStatus', 'renderStatusReport', 'viewReceipt',
  'setRating', 'setMiniRating', 'submitFeedback', 'loadFeedbackSummary',
  'loadAdminDashboard', 'buildAdminCharts', 'showToast', 'showError'
];

/**
 * Loads a fresh instance of UTAPS/tax.js for a test.
 *
 * tax.js is a plain browser script with no module system. A custom Jest
 * transformer (tests/helpers/tax-transform.js) appends a `module.exports`
 * block so it can be required and instrumented for coverage. Because the
 * app's functions rely on module-scoped mutable state (currentUser,
 * currentRegStep, currentRating, ...), we reset the module registry on each
 * call to guarantee isolation between tests.
 *
 * The exported functions are attached to `globalThis` so tests can call them
 * directly (e.g. `showSection('home')`) exactly as the browser would.
 *
 * @param {string} [bodyHtml] Optional HTML injected into document.body.
 * @returns {object} The module exports (also mirrored on globalThis).
 */
function loadApp(bodyHtml = '') {
  localStorage.clear();
  document.documentElement.className = '';
  document.head.innerHTML = '';
  document.body.innerHTML = bodyHtml;

  // Ensure no Chart.js state leaks in from a previous test.
  delete globalThis.Chart;
  delete globalThis.adminRevChart;
  delete globalThis.adminPieChart;
  delete globalThis.adminTrendChart;

  jest.resetModules();
  const app = require(SOURCE_PATH);

  for (const name of EXPORT_NAMES) {
    globalThis[name] = app[name];
  }

  return app;
}

module.exports = { loadApp, SOURCE_PATH };
