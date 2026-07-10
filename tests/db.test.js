'use strict';

const { loadApp } = require('./helpers/loadApp');

describe('initLocalDB seeding', () => {
  beforeEach(() => loadApp());

  test('seeds admin and demo users when storage is empty', () => {
    initLocalDB();
    const users = JSON.parse(localStorage.getItem('utaps_users'));
    const emails = users.map(u => u.email);
    expect(emails).toContain('admin@gmail.com');
    expect(emails).toContain('demo@gmail.com');
    const admin = users.find(u => u.email === 'admin@gmail.com');
    expect(admin.role).toBe('admin');
  });

  test('seeds demo payments, notices and feedback', () => {
    initLocalDB();
    const payments = JSON.parse(localStorage.getItem('utaps_payments'));
    const notices = JSON.parse(localStorage.getItem('utaps_notices'));
    const feedbacks = JSON.parse(localStorage.getItem('utaps_feedbacks'));
    expect(payments.filter(p => p.userId === 'demo_123').length).toBe(4);
    expect(notices.some(n => n.userId === 'demo_123')).toBe(true);
    expect(feedbacks.some(f => f.userId === 'demo_123')).toBe(true);
  });

  test('does not duplicate the demo user on repeated init', () => {
    initLocalDB();
    initLocalDB();
    const users = JSON.parse(localStorage.getItem('utaps_users'));
    expect(users.filter(u => u.email === 'demo@gmail.com').length).toBe(1);
  });

  test('re-seeds demo user while preserving unrelated existing users', () => {
    localStorage.setItem('utaps_users', JSON.stringify([
      { _id: 'x', email: 'other@gmail.com', role: 'user', entityType: 'Shop' }
    ]));
    initLocalDB();
    const users = JSON.parse(localStorage.getItem('utaps_users'));
    expect(users.some(u => u.email === 'other@gmail.com')).toBe(true);
    expect(users.some(u => u.email === 'demo@gmail.com')).toBe(true);
  });

  test('replaces stale demo notices and feedback for the demo user', () => {
    localStorage.setItem('utaps_notices', JSON.stringify([
      { _id: 'old-n', userId: 'demo_123' },
      { _id: 'keep-n', userId: 'other' }
    ]));
    localStorage.setItem('utaps_feedbacks', JSON.stringify([
      { _id: 'old-f', userId: 'demo_123' },
      { _id: 'keep-f', userId: 'other' }
    ]));
    initLocalDB();
    const notices = JSON.parse(localStorage.getItem('utaps_notices'));
    const feedbacks = JSON.parse(localStorage.getItem('utaps_feedbacks'));
    expect(notices.some(n => n._id === 'old-n')).toBe(false);
    expect(notices.some(n => n._id === 'keep-n')).toBe(true);
    expect(feedbacks.some(f => f._id === 'old-f')).toBe(false);
    expect(feedbacks.some(f => f._id === 'keep-f')).toBe(true);
  });

  test('replaces stale demo payments rather than appending them', () => {
    localStorage.setItem('utaps_payments', JSON.stringify([
      { _id: 'old', userId: 'demo_123', amount: 1 }
    ]));
    initLocalDB();
    const payments = JSON.parse(localStorage.getItem('utaps_payments'));
    expect(payments.some(p => p._id === 'old')).toBe(false);
    expect(payments.filter(p => p.userId === 'demo_123').length).toBe(4);
  });
});
