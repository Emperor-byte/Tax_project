'use strict';

const { loadApp } = require('./helpers/loadApp');

describe('storage helpers', () => {
  beforeEach(() => loadApp());

  test('generateId returns a non-empty string of expected length', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    expect(id.length).toBeLessThanOrEqual(9);
  });

  test('generateId produces distinct values across calls', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId()));
    expect(ids.size).toBeGreaterThan(1);
  });

  test('getTable returns an empty array for an unknown table', () => {
    expect(getTable('does_not_exist')).toEqual([]);
  });

  test('getTable parses stored JSON', () => {
    localStorage.setItem('t', JSON.stringify([{ a: 1 }]));
    expect(getTable('t')).toEqual([{ a: 1 }]);
  });

  test('saveTable round-trips data through localStorage', () => {
    const rows = [{ id: 1 }, { id: 2 }];
    saveTable('rows', rows);
    expect(JSON.parse(localStorage.getItem('rows'))).toEqual(rows);
    expect(getTable('rows')).toEqual(rows);
  });
});

describe('showToast', () => {
  beforeEach(() => loadApp());

  test('creates the toast container on first use and appends a toast', () => {
    expect(document.getElementById('toast-container')).toBeNull();
    showToast('Hello');
    const container = document.getElementById('toast-container');
    expect(container).not.toBeNull();
    expect(container.children.length).toBe(1);
    expect(container.textContent).toContain('Hello');
  });

  test('reuses an existing container for subsequent toasts', () => {
    showToast('one', 'success');
    showToast('two', 'error');
    const container = document.getElementById('toast-container');
    expect(container.children.length).toBe(2);
  });

  test('applies success styling in dark mode', () => {
    showToast('done', 'success');
    const toast = document.querySelector('#toast-container div');
    expect(toast.style.color).toBe('rgb(52, 211, 153)');
  });

  test('applies light-mode styling when light-mode is active', () => {
    document.documentElement.classList.add('light-mode');
    showToast('info message', 'info');
    const toast = document.querySelector('#toast-container div');
    expect(toast.style.border.toLowerCase()).toContain('currentcolor');
  });

  test('removes the toast after the timeout window', () => {
    jest.useFakeTimers();
    showToast('temp');
    const container = document.getElementById('toast-container');
    expect(container.children.length).toBe(1);
    jest.advanceTimersByTime(4500 + 220 + 10);
    expect(container.children.length).toBe(0);
    jest.useRealTimers();
  });
});

describe('showError', () => {
  beforeEach(() => loadApp());

  test('sets text and reveals the element when one is provided', () => {
    document.body.innerHTML = '<p id="err" hidden></p>';
    const el = document.getElementById('err');
    showError(el, 'Bad input');
    expect(el.textContent).toBe('Bad input');
    expect(el.hidden).toBe(false);
  });

  test('falls back to a toast when no element is provided', () => {
    showError(null, 'No element');
    const container = document.getElementById('toast-container');
    expect(container.textContent).toContain('No element');
  });
});
