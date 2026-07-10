'use strict';

// Custom Jest transformer for UTAPS/tax.js.
//
// The app is a plain browser script (no module system): it declares its
// functions with top-level `function` declarations and never exports them.
// To unit test it *and* collect real code coverage, we:
//   1. strip the leading "use strict" directive, and
//   2. append a `module.exports` that re-exports every top-level declaration.
//
// The transformed source is then handed to babel-jest, which applies
// babel-plugin-istanbul when Jest requests instrumentation. This yields
// accurate line/branch/function coverage for tax.js.

const babelJest = require('babel-jest').default;

const EXPORTS = [
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

const transformer = babelJest.createTransformer({
  presets: ['babel-preset-current-node-syntax'],
  babelrc: false,
  configFile: false
});

function prepare(src) {
  const stripped = src.replace(/^\uFEFF?\s*(['"])use strict\1;?/, '');
  const exportBlock =
    `\n;if (typeof module !== 'undefined' && module.exports) {` +
    `\n  module.exports = { ${EXPORTS.join(', ')} };` +
    `\n}\n`;
  return stripped + exportBlock;
}

module.exports = {
  canInstrument: true,
  getCacheKey(src, filename, ...rest) {
    return transformer.getCacheKey(prepare(src), filename, ...rest);
  },
  process(src, filename, options) {
    return transformer.process(prepare(src), filename, options);
  }
};
