'use strict';

const { loadApp } = require('./helpers/loadApp');

const themeFixture = `
  <i id="theme-icon" class=""></i>
  <i id="theme-icon-mobile" class=""></i>
`;

describe('theme switcher', () => {
  beforeEach(() => loadApp(themeFixture));

  test('updateThemeIcons sets moon icon in light mode', () => {
    updateThemeIcons(true);
    expect(document.getElementById('theme-icon').className).toBe('ti ti-moon');
    expect(document.getElementById('theme-icon-mobile').className).toBe('ti ti-moon');
  });

  test('updateThemeIcons sets sun icon in dark mode', () => {
    updateThemeIcons(false);
    expect(document.getElementById('theme-icon').className).toBe('ti ti-sun');
  });

  test('updateThemeIcons tolerates missing icon elements', () => {
    document.body.innerHTML = '';
    expect(() => updateThemeIcons(true)).not.toThrow();
  });

  test('toggleTheme enables light mode and persists preference', () => {
    toggleTheme();
    expect(document.documentElement.classList.contains('light-mode')).toBe(true);
    expect(localStorage.getItem('utaps_theme')).toBe('light');
    expect(document.getElementById('theme-icon').className).toBe('ti ti-moon');
  });

  test('toggleTheme twice returns to dark mode', () => {
    toggleTheme();
    toggleTheme();
    expect(document.documentElement.classList.contains('light-mode')).toBe(false);
    expect(localStorage.getItem('utaps_theme')).toBe('dark');
  });

  test('initTheme applies saved light preference', () => {
    localStorage.setItem('utaps_theme', 'light');
    initTheme();
    expect(document.documentElement.classList.contains('light-mode')).toBe(true);
    expect(document.getElementById('theme-icon').className).toBe('ti ti-moon');
  });

  test('initTheme defaults to dark mode when no preference is stored', () => {
    initTheme();
    expect(document.documentElement.classList.contains('light-mode')).toBe(false);
    expect(document.getElementById('theme-icon').className).toBe('ti ti-sun');
  });
});
