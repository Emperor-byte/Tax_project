'use strict';

// jsdom does not implement these; stub them so the app code can run in tests.
window.scrollTo = jest.fn();
window.alert = jest.fn();

if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = jest.fn();
}

beforeEach(() => {
  window.scrollTo.mockClear();
  window.alert.mockClear();
});

afterEach(() => {
  // Chart.js globals are attached to window/global by the app; clear them so
  // state never leaks between tests regardless of execution order.
  delete global.Chart;
  delete window.Chart;
  delete window.adminRevChart;
  delete window.adminPieChart;
  delete window.adminTrendChart;
});
