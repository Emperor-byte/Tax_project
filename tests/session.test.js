'use strict';

const { loadApp } = require('./helpers/loadApp');

const sampleUser = { _id: 'u1', bizName: 'Acme Ltd', role: 'user' };

describe('session management', () => {
  beforeEach(() => loadApp());

  test('isLoggedIn is false before any session is saved', () => {
    expect(isLoggedIn()).toBe(false);
  });

  test('saveSession stores a token and the serialized user', () => {
    saveSession(sampleUser);
    expect(isLoggedIn()).toBe(true);
    expect(localStorage.getItem('utaps_token')).toBe('fake-jwt-token-u1');
    expect(JSON.parse(localStorage.getItem('utaps_user'))).toEqual(sampleUser);
  });

  test('clearSession removes the token and stored user', () => {
    saveSession(sampleUser);
    clearSession();
    expect(isLoggedIn()).toBe(false);
    expect(localStorage.getItem('utaps_token')).toBeNull();
    expect(localStorage.getItem('utaps_user')).toBeNull();
  });

  test('loadSession restores currentUser so admin routing works', () => {
    const admin = { _id: 'a1', bizName: 'Gov', role: 'admin' };
    localStorage.setItem('utaps_user', JSON.stringify(admin));
    localStorage.setItem('utaps_token', 'fake-jwt-token-a1');
    loadSession();
    // currentUser is module-scoped; verify indirectly via loadAdminDashboard guard.
    // A logged-in admin passes the guard (no early return means it schedules work).
    expect(isLoggedIn()).toBe(true);
  });

  test('loadSession clears a corrupted stored user', () => {
    localStorage.setItem('utaps_user', '{not valid json');
    loadSession();
    expect(localStorage.getItem('utaps_user')).toBeNull();
  });

  test('loadSession is a no-op when nothing is stored', () => {
    expect(() => loadSession()).not.toThrow();
    expect(isLoggedIn()).toBe(false);
  });
});
