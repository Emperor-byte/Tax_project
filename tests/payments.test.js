'use strict';

const { loadApp } = require('./helpers/loadApp');

describe('updatePayTotal', () => {
  const fixture = `
    <select id="pay-type"><option value=""></option><option value="50000">CIT</option></select>
    <input id="pay-amount" value="" />
    <span id="pay-total-display"></span>
  `;

  test('formats an entered amount as Naira currency', () => {
    loadApp(fixture);
    document.getElementById('pay-amount').value = '1500';
    updatePayTotal();
    expect(document.getElementById('pay-total-display').textContent).toBe('₦1,500.00');
  });

  test('prefills the amount from the selected tax type when empty', () => {
    loadApp(fixture);
    document.getElementById('pay-type').value = '50000';
    updatePayTotal();
    expect(document.getElementById('pay-amount').value).toBe('50000');
    expect(document.getElementById('pay-total-display').textContent).toBe('₦50,000.00');
  });

  test('renders zero when nothing is entered', () => {
    loadApp(fixture);
    updatePayTotal();
    expect(document.getElementById('pay-total-display').textContent).toBe('₦0.00');
  });

  test('is a no-op without a display element', () => {
    loadApp('<input id="pay-amount" value="5" />');
    expect(() => updatePayTotal()).not.toThrow();
  });
});

describe('submitPayment', () => {
  const fixture = `
    <select id="pay-type"><option value="Corporate Income Tax" selected>CIT</option></select>
    <input id="pay-amount" value="250000" />
    <input id="pay-ref" value="REF-1" />
    <input id="pay-year" value="2026" />
    <div class="pay-method active"><span>Card Payment</span></div>
    <button id="pay-submit-btn"></button>
    <div id="section-login" class="section"></div>
  `;

  test('blocks payment and redirects when not logged in', () => {
    loadApp(fixture);
    submitPayment();
    expect(getTable('utaps_payments')).toEqual([]);
    expect(document.getElementById('toast-container').textContent).toContain('sign in');
  });

  test('records a payment with a generated receipt when logged in', () => {
    jest.useFakeTimers();
    loadApp(fixture);
    saveSession({ _id: 'u1', bizName: 'Acme', role: 'user' });
    submitPayment();
    jest.advanceTimersByTime(800);
    const payments = getTable('utaps_payments');
    expect(payments.length).toBe(1);
    expect(payments[0]).toMatchObject({
      userId: 'u1',
      taxType: 'Corporate Income Tax',
      amount: 250000,
      method: 'Card Payment',
      status: 'paid'
    });
    expect(payments[0].receiptNo).toMatch(/^UTAPS-REC-\d{8}-\d{4}$/);
    jest.useRealTimers();
  });

  test('requires a tax type and amount', () => {
    loadApp(fixture);
    saveSession({ _id: 'u1', role: 'user' });
    document.getElementById('pay-amount').value = '';
    submitPayment();
    expect(getTable('utaps_payments')).toEqual([]);
    expect(document.getElementById('toast-container').textContent).toContain('select a tax type');
  });
});

const statusFixture = `
  <input id="status-search" value="" />
  <div id="status-report" hidden></div>
  <div id="status-loading" hidden></div>
  <h3 id="sec-entity-name"></h3>
  <p id="sec-entity-info"></p>
  <div id="sec-overall-badge"></div>
  <span id="sec-total-paid"></span>
  <span id="sec-outstanding"></span>
  <div id="status-table-body"></div>
  <div id="penalty-notice-block" hidden>
    <span id="penalty-notice-ref"></span>
    <span id="penalty-body"></span>
  </div>
`;

describe('loadMyStatus / renderStatusReport', () => {
  test('does nothing when logged out', () => {
    loadApp(statusFixture);
    loadMyStatus();
    expect(document.getElementById('status-report').hidden).toBe(true);
  });

  test('renders a compliant report when there are no overdue items', () => {
    jest.useFakeTimers();
    loadApp(statusFixture);
    saveSession({ _id: 'u1', bizName: 'Acme Ltd', tin: 'TIN-1', entityType: 'Shop', address: '1 St', role: 'user' });
    saveTable('utaps_payments', [
      { _id: 'p1', userId: 'u1', taxType: 'CIT', period: '2025', amount: 100000, status: 'paid', paidAt: '2025-01-01T00:00:00.000Z' }
    ]);
    loadMyStatus();
    jest.advanceTimersByTime(400);
    expect(document.getElementById('status-report').hidden).toBe(false);
    expect(document.getElementById('sec-entity-name').textContent).toBe('Acme Ltd');
    expect(document.getElementById('sec-total-paid').textContent).toBe('₦100,000');
    expect(document.getElementById('sec-overall-badge').textContent).toContain('Compliant');
    expect(document.getElementById('penalty-notice-block').hidden).toBe(true);
    expect(document.getElementById('status-table-body').innerHTML).toContain('Receipt');
    jest.useRealTimers();
  });

  test('renders a non-compliant report and reveals the penalty notice', () => {
    jest.useFakeTimers();
    loadApp(statusFixture);
    saveSession({ _id: 'u1', bizName: 'Acme Ltd', tin: 'TIN-1', entityType: 'Shop', address: '1 St', role: 'user' });
    saveTable('utaps_payments', [
      { _id: 'p1', userId: 'u1', taxType: 'PAYE', period: '2026', amount: 50000, status: 'overdue', dueDate: '2026-06-30' }
    ]);
    saveTable('utaps_notices', [
      { _id: 'n1', userId: 'u1', noticeRef: 'REF/1', body: 'Penalty applies' }
    ]);
    loadMyStatus();
    jest.advanceTimersByTime(400);
    expect(document.getElementById('sec-overall-badge').textContent).toContain('Non-Compliant');
    expect(document.getElementById('sec-outstanding').textContent).toBe('₦50,000');
    const penalty = document.getElementById('penalty-notice-block');
    expect(penalty.hidden).toBe(false);
    expect(document.getElementById('penalty-notice-ref').textContent).toBe('REF/1');
    expect(document.getElementById('penalty-body').textContent).toBe('Penalty applies');
    jest.useRealTimers();
  });
});

describe('loadStatusReport', () => {
  test('warns when the search box is empty', () => {
    loadApp(statusFixture);
    saveSession({ _id: 'u1', role: 'user' });
    loadStatusReport();
    expect(document.getElementById('toast-container').textContent).toContain('enter a TIN');
  });
});

describe('viewReceipt', () => {
  test('requires the user to be logged in', () => {
    loadApp('');
    viewReceipt('p1');
    expect(document.getElementById('toast-container').textContent).toContain('sign in');
    expect(window.alert).not.toHaveBeenCalled();
  });

  test('warns when the payment id is unknown', () => {
    loadApp('');
    saveSession({ _id: 'u1', role: 'user' });
    viewReceipt('missing');
    expect(document.getElementById('toast-container').textContent).toContain('not found');
  });

  test('shows the receipt details for a known payment', () => {
    loadApp('');
    saveSession({ _id: 'u1', bizName: 'Acme', tin: 'TIN-1', utapsId: 'UTAPS-1', role: 'user' });
    saveTable('utaps_payments', [
      { _id: 'p1', taxType: 'CIT', period: '2025', amount: 100000, method: 'Card', paidAt: '2025-01-01T00:00:00.000Z', receiptNo: 'REC-1' }
    ]);
    viewReceipt('p1');
    expect(window.alert).toHaveBeenCalledTimes(1);
    expect(window.alert.mock.calls[0][0]).toContain('REC-1');
    expect(window.alert.mock.calls[0][0]).toContain('Acme');
  });
});
