'use strict';

const { loadApp } = require('./helpers/loadApp');

const step1Fixture = `
  <input id="reg-bizname" value="" />
  <input id="reg-tin" value="" />
  <select id="reg-entity"><option value=""></option><option value="Shop">Shop</option></select>
  <select id="reg-location"><option value=""></option><option value="Aba Road">Aba Road</option></select>
  <input id="reg-address" value="" />
`;

const step2Fixture = `
  <input id="reg-email" value="" />
  <input id="reg-phone" value="" />
  <input id="reg-pass" value="" />
  <input id="reg-pass2" value="" />
  <input id="reg-terms" type="checkbox" />
`;

function fillStep1() {
  document.getElementById('reg-bizname').value = 'Acme Ltd';
  document.getElementById('reg-tin').value = 'TIN-123';
  document.getElementById('reg-entity').value = 'Shop';
  document.getElementById('reg-location').value = 'Aba Road';
  document.getElementById('reg-address').value = '1 Market St';
}

function fillStep2() {
  document.getElementById('reg-email').value = 'user@gmail.com';
  document.getElementById('reg-phone').value = '08030000000';
  document.getElementById('reg-pass').value = 'password1';
  document.getElementById('reg-pass2').value = 'password1';
  document.getElementById('reg-terms').checked = true;
}

describe('validateRegStep - step 1', () => {
  beforeEach(() => loadApp(step1Fixture));

  test('fails and alerts when the business name is missing', () => {
    expect(validateRegStep(1)).toBe(false);
    expect(window.alert).toHaveBeenCalledWith('Business name is required.');
  });

  test('fails when entity type is not selected', () => {
    document.getElementById('reg-bizname').value = 'Acme';
    document.getElementById('reg-tin').value = 'TIN-1';
    expect(validateRegStep(1)).toBe(false);
    expect(window.alert).toHaveBeenCalledWith('Please select an entity type.');
  });

  test('passes when all step 1 fields are provided', () => {
    fillStep1();
    expect(validateRegStep(1)).toBe(true);
    expect(window.alert).not.toHaveBeenCalled();
  });
});

describe('validateRegStep - step 2', () => {
  beforeEach(() => loadApp(step2Fixture));

  test('requires a gmail address', () => {
    document.getElementById('reg-email').value = 'user@yahoo.com';
    expect(validateRegStep(2)).toBe(false);
    expect(window.alert).toHaveBeenCalledWith('A Gmail address is required for registration.');
  });

  test('rejects short passwords', () => {
    document.getElementById('reg-email').value = 'user@gmail.com';
    document.getElementById('reg-phone').value = '080';
    document.getElementById('reg-pass').value = 'short';
    expect(validateRegStep(2)).toBe(false);
    expect(window.alert).toHaveBeenCalledWith('Password must be at least 8 characters.');
  });

  test('rejects mismatched passwords', () => {
    fillStep2();
    document.getElementById('reg-pass2').value = 'different1';
    expect(validateRegStep(2)).toBe(false);
    expect(window.alert).toHaveBeenCalledWith('Passwords do not match.');
  });

  test('requires the terms checkbox', () => {
    fillStep2();
    document.getElementById('reg-terms').checked = false;
    expect(validateRegStep(2)).toBe(false);
    expect(window.alert).toHaveBeenCalledWith('Please accept the Terms of Use.');
  });

  test('passes with valid step 2 input', () => {
    fillStep2();
    expect(validateRegStep(2)).toBe(true);
  });
});

describe('regNext', () => {
  const stepsFixture = `
    <div id="reg-step-1"></div><div id="reg-step-2" hidden></div><div id="reg-step-3" hidden></div>
    <div id="rstep-1" class="active"></div><div id="rstep-2"></div><div id="rstep-3"></div>
    <span id="conf-entity"></span><span id="conf-tin"></span><span id="conf-addr"></span>
    <span id="conf-contact"></span><span id="conf-email"></span>
    <input id="reg-bizname" value="Acme Ltd" />
    <input id="reg-tin" value="TIN-123" />
    <select id="reg-entity"><option value="Shop" selected>Shop</option></select>
    <select id="reg-location"><option value="Aba Road" selected>Aba Road</option></select>
    <input id="reg-address" value="1 Market St" />
    <input id="reg-contact" value="Jane" />
  `;

  test('advancing forward is blocked when validation fails', () => {
    loadApp(stepsFixture);
    document.getElementById('reg-bizname').value = '';
    regNext(2);
    // still on step 1
    expect(document.getElementById('reg-step-2').hidden).toBe(true);
  });

  test('advances to step 2 when validation passes', () => {
    loadApp(stepsFixture);
    regNext(2);
    expect(document.getElementById('reg-step-2').hidden).toBe(false);
    expect(document.getElementById('rstep-2').classList.contains('active')).toBe(true);
    expect(document.getElementById('rstep-1').classList.contains('done')).toBe(true);
  });

  test('populates the confirmation panel when reaching step 3', () => {
    loadApp(stepsFixture);
    regNext(3);
    expect(document.getElementById('conf-entity').textContent).toBe('Acme Ltd');
    expect(document.getElementById('conf-tin').textContent).toBe('TIN-123');
    expect(document.getElementById('conf-addr').textContent).toBe('1 Market St');
  });

  test('moving backward does not require validation', () => {
    loadApp(stepsFixture);
    regNext(3);
    document.getElementById('reg-bizname').value = '';
    regNext(1);
    expect(document.getElementById('reg-step-1').hidden).toBe(false);
  });
});

describe('populateConfirmation', () => {
  test('renders an em dash for empty fields', () => {
    loadApp(`
      <span id="conf-entity"></span><span id="conf-tin"></span>
      <span id="conf-addr"></span><span id="conf-contact"></span><span id="conf-email"></span>
      <input id="reg-bizname" value="" /><input id="reg-tin" value="" />
      <input id="reg-address" value="" /><input id="reg-contact" value="" /><input id="reg-email" value="" />
    `);
    populateConfirmation();
    expect(document.getElementById('conf-entity').textContent).toBe('—');
  });
});

describe('handleRegister', () => {
  const regFixture = `
    <div id="reg-success" hidden></div>
    <button id="reg-submit-btn"></button>
    <input id="reg-bizname" value="New Biz" />
    <input id="reg-tin" value="TIN-999" />
    <select id="reg-entity"><option value="Shop" selected>Shop</option></select>
    <select id="reg-location"><option value="Aba Road" selected>Aba Road</option></select>
    <input id="reg-rc" value="RC-1" />
    <input id="reg-address" value="2 Market St" />
    <input id="reg-turnover" value="1000000" />
    <input id="reg-employees" value="12" />
    <input id="reg-contact" value="John" />
    <input id="reg-email" value="new@gmail.com" />
    <input id="reg-phone" value="08031111111" />
    <input id="reg-pass" value="password1" />
  ` + SECTIONS_MARKUP();

  function SECTIONS_MARKUP() {
    return ['home', 'login']
      .map(id => `<div id="section-${id}" class="section"></div>`)
      .join('');
  }

  test('creates a user, logs them in and shows a success message', () => {
    jest.useFakeTimers();
    loadApp(regFixture);
    handleRegister();
    jest.advanceTimersByTime(600);
    const users = getTable('utaps_users');
    const created = users.find(u => u.tin === 'TIN-999');
    expect(created).toBeDefined();
    expect(created.email).toBe('new@gmail.com');
    expect(created.annualTurnover).toBe(1000000);
    expect(created.employees).toBe(12);
    expect(created.utapsId).toMatch(/^UTAPS-2026-\d{4}$/);
    expect(isLoggedIn()).toBe(true);
    expect(document.getElementById('reg-success').hidden).toBe(false);
    // After a further delay the user is redirected to the home section.
    jest.advanceTimersByTime(2000);
    expect(document.querySelector('#section-home.active')).not.toBeNull();
    jest.useRealTimers();
  });

  test('rejects a duplicate TIN without creating a second account', () => {
    jest.useFakeTimers();
    loadApp(regFixture);
    saveTable('utaps_users', [{ _id: 'x', tin: 'TIN-999', email: 'dup@gmail.com' }]);
    handleRegister();
    jest.advanceTimersByTime(600);
    const users = getTable('utaps_users');
    expect(users.length).toBe(1);
    expect(document.getElementById('toast-container').textContent).toContain('already exists');
    jest.useRealTimers();
  });
});
