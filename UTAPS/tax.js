'use strict';

// ==========================================
// LOCAL STORAGE DATABASE SIMULATION
// ==========================================
function initLocalDB() {
  if (!localStorage.getItem('utaps_users')) {
    const adminUser = {
      _id: 'admin_123',
      tin: 'ADMIN-001',
      bizName: 'System Administrator',
      entityType: 'Government',
      address: 'Secretariat, Umuahia',
      location: 'Umuahia North',
      email: 'admin@gmail.com',
      phone: '08000000000',
      role: 'admin',
      password: 'admin1234',
      utapsId: 'UTAPS-ADMIN',
      status: 'active',
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('utaps_users', JSON.stringify([adminUser]));
    localStorage.setItem('utaps_payments', JSON.stringify([]));
    localStorage.setItem('utaps_feedbacks', JSON.stringify([]));
    localStorage.setItem('utaps_notices', JSON.stringify([]));
  }
}

function getTable(name) {
  return JSON.parse(localStorage.getItem(name) || '[]');
}

function saveTable(name, data) {
  localStorage.setItem(name, JSON.stringify(data));
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// ==========================================
// SESSION MANAGEMENT
// ==========================================
let currentUser = null;
function isLoggedIn() { return !!localStorage.getItem('utaps_token'); }
function saveSession(user) {
  // We use a fake token since this is pure client-side
  localStorage.setItem('utaps_token', 'fake-jwt-token-' + user._id);
  localStorage.setItem('utaps_user', JSON.stringify(user));
  currentUser = user;
}
function clearSession() {
  localStorage.removeItem('utaps_token');
  localStorage.removeItem('utaps_user');
  currentUser = null;
}
function loadSession() {
  const stored = localStorage.getItem('utaps_user');
  if (stored) {
    try { currentUser = JSON.parse(stored); } catch { clearSession(); }
  }
}

function updateNavForAuth() {
  const loginBtns  = document.querySelectorAll('.btn-nav-login');
  const signupBtns = document.querySelectorAll('.btn-nav-signup');
  const protectedLinks = document.querySelectorAll('.protected-link');
  const adminLinks = document.querySelectorAll('.admin-link');

  if (isLoggedIn() && currentUser) {
    loginBtns.forEach(loginBtn => {
      loginBtn.textContent = currentUser.contactPerson || currentUser.bizName || 'My account';
      loginBtn.onclick = () => showSection('status');
    });
    signupBtns.forEach(signupBtn => {
      signupBtn.textContent = 'Sign out';
      signupBtn.style.background = 'rgba(255,255,255,.2)';
      signupBtn.style.color = '#fff';
      signupBtn.onclick = () => {
        clearSession();
        updateNavForAuth();
        showSection('home');
      };
    });
    protectedLinks.forEach(link => link.style.display = 'flex');
    adminLinks.forEach(link => link.style.display = currentUser.role === 'admin' ? 'flex' : 'none');
  } else {
    loginBtns.forEach(loginBtn => {
      loginBtn.textContent = 'Sign in';
      loginBtn.onclick = () => showSection('login');
    });
    signupBtns.forEach(signupBtn => {
      signupBtn.textContent = 'Register';
      signupBtn.style.background = '';
      signupBtn.style.color = '';
      signupBtn.onclick = () => showSection('register');
    });
    protectedLinks.forEach(link => link.style.display = 'none');
    adminLinks.forEach(link => link.style.display = 'none');
  }
}

const ALL_SECTIONS = ['home','login','register','enterprise','legal','pay','status','analytics','feedback','forms'];

function showSection(name) {
  const protectedSections = ['enterprise','legal','pay','status','analytics','feedback','forms'];
  if (!isLoggedIn() && protectedSections.includes(name)) {
    showToast('Please sign in or register to access this page.', 'error');
    name = 'login';
  }

  if (name === 'analytics' && currentUser?.role !== 'admin') {
    showToast('Admin access required.', 'error');
    name = 'home';
  }

  ALL_SECTIONS.forEach(id => {
    const el = document.getElementById('section-' + id);
    if (el) el.classList.toggle('active', id === name);
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-section') === name);
  });

  if (name === 'analytics') setTimeout(loadAdminDashboard, 80);
  if (name === 'feedback')  loadFeedbackSummary();
  if (name === 'status' && isLoggedIn()) loadMyStatus();

  window.scrollTo({ top: 0, behavior: 'smooth' });
  return false;
}

function toggleMobileNav() {
  const nav = document.getElementById('main-nav');
  const btn = document.getElementById('hamburger');
  const open = nav.classList.toggle('mobile-open');
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function switchTab(el, id) {
  const tabsEl = el.closest('.tabs');
  if (!tabsEl) return;
  tabsEl.querySelectorAll('.tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
  el.classList.add('active'); el.setAttribute('aria-selected','true');
  const prefix = id.replace(/\d+$/, '');
  document.querySelectorAll(`[id^="${prefix}"]`).forEach(p => { p.hidden = true; p.classList.remove('active'); });
  const target = document.getElementById(id);
  if (target) { target.hidden = false; target.classList.add('active'); }
}

function handleCard(event, section) {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showSection(section); }
}

// ==========================================
// AUTH LOGIC
// ==========================================
async function handleLogin() {
  const tin    = document.getElementById('login-tin')?.value?.trim().toLowerCase();
  const pass   = document.getElementById('login-pass')?.value;
  const errEl  = document.getElementById('login-error');
  if (errEl) errEl.hidden = true;

  if (!tin || !pass) { showError(errEl, 'Please enter your TIN / email and password.'); return; }
  const btn = document.querySelector('.auth-submit');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> Signing in…'; }

  setTimeout(() => {
    const users = getTable('utaps_users');
    const user = users.find(u => (u.tin.toLowerCase() === tin || u.email.toLowerCase() === tin) && u.password === pass);

    if (user) {
      saveSession(user);
      updateNavForAuth();
      showToast(`Welcome back, ${user.contactPerson || user.bizName}!`, 'success');
      showSection(currentUser.role === 'admin' ? 'analytics' : 'home');
    } else {
      showError(errEl, 'Invalid credentials.');
    }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-login"></i> Sign in'; }
  }, 500); // Simulate network delay
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  const icon = btn.querySelector('i');
  if (icon) icon.className = isText ? 'ti ti-eye' : 'ti ti-eye-off';
}

let currentRegStep = 1;
function regNext(step) {
  if (step > currentRegStep && !validateRegStep(currentRegStep)) return;
  currentRegStep = step;
  [1,2,3].forEach(n => {
    const p = document.getElementById('reg-step-' + n);
    if (p) p.hidden = (n !== step);
  });
  [1,2,3].forEach(n => {
    const s = document.getElementById('rstep-' + n);
    if (!s) return;
    s.classList.remove('active','done');
    if (n === step) s.classList.add('active');
    if (n < step)   s.classList.add('done');
  });
  if (step === 3) populateConfirmation();
}

function validateRegStep(step) {
  if (step === 1) {
    if (!document.getElementById('reg-bizname')?.value.trim()) { alert('Business name is required.'); return false; }
    if (!document.getElementById('reg-tin')?.value.trim())     { alert('TIN is required.'); return false; }
    if (!document.getElementById('reg-entity')?.value)         { alert('Please select an entity type.'); return false; }
    if (!document.getElementById('reg-location')?.value)       { alert('Please select a location in Umuahia.'); return false; }
    if (!document.getElementById('reg-address')?.value.trim()) { alert('Business address is required.'); return false; }
  }
  if (step === 2) {
    const email = document.getElementById('reg-email')?.value.trim();
    if (!email) { alert('Gmail address is required.'); return false; }
    if (!email.toLowerCase().endsWith('@gmail.com')) { alert('A Gmail address is required for registration.'); return false; }
    if (!document.getElementById('reg-phone')?.value.trim())   { alert('Phone number is required.'); return false; }
    const p = document.getElementById('reg-pass')?.value;
    const p2 = document.getElementById('reg-pass2')?.value;
    if (!p || p.length < 8) { alert('Password must be at least 8 characters.'); return false; }
    if (p !== p2)            { alert('Passwords do not match.'); return false; }
    if (!document.getElementById('reg-terms')?.checked) { alert('Please accept the Terms of Use.'); return false; }
  }
  return true;
}

function populateConfirmation() {
  const fields = {
    'conf-entity':  document.getElementById('reg-bizname')?.value,
    'conf-tin':     document.getElementById('reg-tin')?.value,
    'conf-addr':    document.getElementById('reg-address')?.value,
    'conf-contact': document.getElementById('reg-contact')?.value,
    'conf-email':   document.getElementById('reg-email')?.value
  };
  Object.entries(fields).forEach(([id,val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '—';
  });
}

async function handleRegister() {
  const successEl = document.getElementById('reg-success');
  const btn = document.getElementById('reg-submit-btn');

  const tin = document.getElementById('reg-tin')?.value?.trim();
  const email = document.getElementById('reg-email')?.value?.trim().toLowerCase();

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> Submitting…'; }

  setTimeout(() => {
    const users = getTable('utaps_users');
    if (users.some(u => u.tin === tin || u.email.toLowerCase() === email)) {
      showToast('An account with this TIN or email already exists.', 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> Submit registration'; }
      return;
    }

    const newUser = {
      _id: generateId(),
      bizName:       document.getElementById('reg-bizname')?.value?.trim(),
      tin:           tin,
      entityType:    document.getElementById('reg-entity')?.value,
      location:      document.getElementById('reg-location')?.value,
      rcNumber:      document.getElementById('reg-rc')?.value?.trim(),
      address:       document.getElementById('reg-address')?.value?.trim(),
      annualTurnover: parseFloat(document.getElementById('reg-turnover')?.value) || 0,
      employees:     parseInt(document.getElementById('reg-employees')?.value) || 0,
      contactPerson: document.getElementById('reg-contact')?.value?.trim(),
      role:          'user',
      email:         email,
      phone:         document.getElementById('reg-phone')?.value?.trim(),
      password:      document.getElementById('reg-pass')?.value,
      utapsId:       `UTAPS-2026-${String(users.length + 1).padStart(4,'0')}`,
      status:        'active',
      createdAt:     new Date().toISOString()
    };

    users.push(newUser);
    saveTable('utaps_users', users);

    saveSession(newUser);
    updateNavForAuth();
    if (successEl) {
      successEl.hidden = false;
      successEl.innerHTML = `<i class="ti ti-circle-check"></i> Registration successful! Your UTAPS ID is ${newUser.utapsId}.`;
      successEl.scrollIntoView({ behavior:'smooth', block:'nearest' });
    }
    setTimeout(() => { showSection('home'); showToast('Welcome to UTAPS!', 'success'); }, 2000);
    
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> Submit registration'; }
  }, 500);
}

function showComplianceResult() {
  const panel = document.getElementById('compliance-result');
  if (!panel) return;
  panel.hidden = false;
  panel.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function updatePayTotal() {
  const select  = document.getElementById('pay-type');
  const amount  = document.getElementById('pay-amount');
  const display = document.getElementById('pay-total-display');
  if (!display) return;
  if (select?.value && !amount?.value) { if (amount) amount.value = select.value; }
  const raw = parseFloat(amount?.value) || 0;
  display.textContent = '₦' + raw.toLocaleString('en-NG', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

function selectPayMethod(el) {
  document.querySelectorAll('.pay-method').forEach(m => { m.classList.remove('active'); m.setAttribute('aria-pressed','false'); });
  el.classList.add('active'); el.setAttribute('aria-pressed','true');
}

// ==========================================
// PAYMENTS & STATUS
// ==========================================
async function submitPayment() {
  if (!isLoggedIn()) { showToast('Please sign in to make a payment.', 'error'); showSection('login'); return; }
  const taxType = document.getElementById('pay-type')?.value;
  const amount  = document.getElementById('pay-amount')?.value;
  const ref     = document.getElementById('pay-ref')?.value;
  const year    = document.getElementById('pay-year')?.value;
  const method  = document.querySelector('.pay-method.active span')?.textContent || 'Bank transfer';

  if (!taxType || !amount) { showToast('Please select a tax type and enter an amount.', 'error'); return; }

  const btn = document.getElementById('pay-submit-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> Processing…'; }

  setTimeout(() => {
    const payments = getTable('utaps_payments');
    const receiptNo = `UTAPS-REC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(payments.length+1).padStart(4,'0')}`;
    
    const newPayment = {
      _id: generateId(),
      userId: currentUser._id,
      taxType, period: year, amount: parseFloat(amount), assessmentRef: ref,
      method, status: 'paid', paidAt: new Date().toISOString(), receiptNo
    };

    payments.push(newPayment);
    saveTable('utaps_payments', payments);

    showToast(`✅ Payment recorded successfully. Receipt: ${receiptNo}`, 'success');
    if (isLoggedIn()) loadMyStatus();
    
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-lock"></i> Proceed to payment'; }
  }, 800);
}

async function loadStatusReport() {
  const input   = document.getElementById('status-search');
  const loading = document.getElementById('status-loading');
  const tin = input?.value?.trim();
  if (!tin) { showToast('Please enter a TIN or business name.', 'error'); return; }
  // Not fully implemented for non-logged-in in demo, default to loadMyStatus for simplicity
  loadMyStatus();
}

async function loadMyStatus() {
  if (!isLoggedIn()) return;
  const report  = document.getElementById('status-report');
  const loading = document.getElementById('status-loading');
  if (loading) loading.hidden = false;

  setTimeout(() => {
    const payments = getTable('utaps_payments').filter(p => p.userId === currentUser._id);
    const notices = getTable('utaps_notices').filter(n => n.userId === currentUser._id);
    
    const overdue = payments.filter(p => p.status === 'overdue');
    const due = payments.filter(p => p.status === 'due');

    const summary = {
      totalPaid: payments.filter(p => p.status === 'paid').reduce((s,p) => s + p.amount, 0),
      totalOutstanding: [...overdue, ...due].reduce((s,p) => s + p.amount, 0),
      overdueCount: overdue.length, dueCount: due.length
    };

    const data = {
      entity: currentUser,
      overallStatus: overdue.length === 0 ? 'Compliant' : 'Non-Compliant',
      payments, notices, summary
    };

    renderStatusReport(data);
    if (report) report.hidden = false;
    if (loading) loading.hidden = true;
  }, 400);
}

function renderStatusReport(data) {
  const { entity, overallStatus, payments, notices, summary } = data;
  const nameEl   = document.getElementById('sec-entity-name');
  const infoEl   = document.getElementById('sec-entity-info');
  const badgeEl  = document.getElementById('sec-overall-badge');

  if (nameEl) nameEl.textContent = entity.bizName;
  if (infoEl) infoEl.textContent = `TIN: ${entity.tin}  |  ${entity.entityType}  |  ${entity.address}`;
  if (badgeEl) {
    const compliant = overallStatus === 'Compliant';
    badgeEl.innerHTML = `<span class="status-pill ${compliant ? 'pill-green' : 'pill-red'}">${overallStatus}</span>`;
  }

  const sPaid = document.getElementById('sec-total-paid');
  const sOut  = document.getElementById('sec-outstanding');
  if (sPaid) sPaid.textContent = '₦' + (summary.totalPaid || 0).toLocaleString('en-NG');
  if (sOut)  sOut.textContent  = '₦' + (summary.totalOutstanding || 0).toLocaleString('en-NG');

  const tbody = document.getElementById('status-table-body');
  if (tbody && payments) {
    tbody.innerHTML = payments.map(p => {
      const statusClass = p.status === 'paid' ? 'pill-green' : p.status === 'overdue' ? 'pill-red' : 'pill-amber';
      const statusLabel = p.status === 'paid' ? '✓ Paid' : p.status === 'overdue' ? '⚠ Overdue' : p.status === 'due' ? '⏰ Due soon' : 'Upcoming';
      const action = p.status === 'paid'
        ? `<button class="btn-tbl" onclick="viewReceipt('${p._id}')">Receipt</button>`
        : `<button class="btn-tbl btn-tbl-pay" onclick="showSection('pay')">Pay now</button>`;
      return `<div class="status-table-row ${p.status !== 'paid' ? 'row-warn' : ''}">
        <span>${p.taxType}</span>
        <span>${p.period || '—'}</span>
        <span>₦${(p.amount||0).toLocaleString('en-NG')}</span>
        <span>${p.dueDate || p.paidAt?.slice(0,10) || '—'}</span>
        <span class="status-pill ${statusClass}">${statusLabel}</span>
        ${action}
      </div>`;
    }).join('');
  }

  const penaltyEl = document.getElementById('penalty-notice-block');
  if (penaltyEl) {
    if (overallStatus !== 'Compliant' && notices?.length) {
      penaltyEl.hidden = false;
      const n = notices[0];
      document.getElementById('penalty-notice-ref') && (document.getElementById('penalty-notice-ref').textContent = n.noticeRef);
      document.getElementById('penalty-body') && (document.getElementById('penalty-body').textContent = n.body);
    } else if (overallStatus !== 'Compliant') {
      penaltyEl.hidden = false;
    } else {
      penaltyEl.hidden = true;
    }
  }
}

async function viewReceipt(paymentId) {
  if (!isLoggedIn()) { showToast('Please sign in to view receipts.', 'error'); return; }
  const payments = getTable('utaps_payments');
  const r = payments.find(p => p._id === paymentId);
  if (!r) { showToast('Payment not found.', 'error'); return; }
  alert(`UTAPS OFFICIAL RECEIPT\n${'─'.repeat(36)}\nReceipt No: ${r.receiptNo}\nUTAPS ID:   ${currentUser.utapsId}\nEntity:     ${currentUser.bizName}\nTIN:        ${currentUser.tin}\nTax type:   ${r.taxType}\nPeriod:     ${r.period}\nAmount:     ₦${r.amount?.toLocaleString('en-NG')}\nMethod:     ${r.method}\nPaid on:    ${r.paidAt?.slice(0,10)}\n${'─'.repeat(36)}\nIssued By: UTAPS | Powered By: ABSIRS`);
}

// ==========================================
// FEEDBACK
// ==========================================
let currentRating = 0;
const miniRatings = {};
const RATING_LABELS = { 1:'Poor', 2:'Below average', 3:'Average', 4:'Good', 5:'Excellent!' };

function setRating(val) {
  currentRating = val;
  document.querySelectorAll('#star-rating .star').forEach((star, i) => {
    star.classList.toggle('filled', i < val);
    const icon = star.querySelector('i');
    if (icon) icon.className = i < val ? 'ti ti-star-filled' : 'ti ti-star';
  });
  const label = document.getElementById('rating-label');
  if (label) label.textContent = RATING_LABELS[val] || '';
}

function setMiniRating(group, val) {
  miniRatings[group] = val;
  const container = document.querySelector(`.mini-stars[data-group="${group}"]`);
  if (!container) return;
  container.querySelectorAll('button').forEach((btn, i) => {
    btn.classList.toggle('filled', i < val);
    const icon = btn.querySelector('i');
    if (icon) icon.className = i < val ? 'ti ti-star-filled' : 'ti ti-star';
  });
}

async function submitFeedback() {
  const successEl = document.getElementById('feedback-success');
  if (currentRating === 0) { showToast('Please select an overall rating.', 'error'); return; }

  const btn = document.getElementById('feedback-submit-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> Submitting…'; }

  setTimeout(() => {
    const feedbacks = getTable('utaps_feedbacks');
    feedbacks.push({
      _id: generateId(),
      userId: currentUser?._id,
      userName: currentUser?.bizName || document.querySelector('[placeholder="Company name or your full name"]')?.value,
      entityType: document.querySelector('.feedback-form-card select:nth-of-type(1)')?.value,
      category: document.querySelector('.feedback-form-card select:nth-of-type(2)')?.value,
      rating: currentRating,
      easeRating: miniRatings['ease'] || 0,
      speedRating: miniRatings['speed'] || 0,
      supportRating: miniRatings['support'] || 0,
      deadlineRating: miniRatings['deadline'] || 0,
      comment: document.querySelector('.feedback-form-card textarea')?.value,
      createdAt: new Date().toISOString()
    });
    saveTable('utaps_feedbacks', feedbacks);
    
    if (successEl) { successEl.hidden = false; successEl.innerHTML = `<i class="ti ti-circle-check"></i> Feedback submitted!`; }
    showToast('Feedback submitted!', 'success');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-send"></i> Submit feedback'; }
  }, 600);
}

async function loadFeedbackSummary() {
  // Can be implemented if a public feedback summary page exists
}

// ==========================================
// ADMIN DASHBOARD LOGIC
// ==========================================
async function loadAdminDashboard() {
  if (!isLoggedIn() || currentUser.role !== 'admin') return;

  setTimeout(() => {
    const users = getTable('utaps_users');
    const payments = getTable('utaps_payments');
    const feedbacks = getTable('utaps_feedbacks');
    const notices = getTable('utaps_notices');

    const nonAdminUsers = users.filter(u => u.role !== 'admin');
    const registeredCount = nonAdminUsers.length;
    
    let totalPaid = 0;
    let outstandingLiabilities = 0;
    const overduePayments = [];
    const entityBreakdown = {};
    const monthlyData = { Jan:0, Feb:0, Mar:0, Apr:0, May:0, Jun:0, Jul:0, Aug:0, Sep:0, Oct:0, Nov:0, Dec:0 };

    payments.forEach(p => {
      if (p.status === 'paid') {
        totalPaid += p.amount;
        if (p.paidAt) {
          const month = new Date(p.paidAt).toLocaleString('en-us', { month: 'short' });
          if (monthlyData[month] !== undefined) monthlyData[month] += p.amount;
        }
      } else if (p.status === 'overdue' || p.status === 'due') {
        outstandingLiabilities += p.amount;
      }

      if (p.status === 'overdue') {
        const u = users.find(user => user._id === p.userId);
        overduePayments.push({ payment: p, user: u, deadline: p.dueDate });
      }
    });

    nonAdminUsers.forEach(u => {
      entityBreakdown[u.entityType] = (entityBreakdown[u.entityType] || 0) + 1;
    });

    // Summary Cards
    document.getElementById('admin-stat-reg').textContent = registeredCount;
    document.getElementById('admin-stat-paid').textContent = '₦' + (totalPaid / 1e6 || 0).toFixed(1) + 'M';
    document.getElementById('admin-stat-out').textContent = '₦' + (outstandingLiabilities / 1e6 || 0).toFixed(1) + 'M';

    // Defaulters Table
    const defTbody = document.getElementById('admin-defaulters-list');
    if (overduePayments.length === 0) {
      defTbody.innerHTML = '<div style="padding:1.5rem;text-align:center;">No defaulters found.</div>';
    } else {
      defTbody.innerHTML = overduePayments.map(dp => `
        <div class="status-table-row row-warn">
          <span>${dp.user?.bizName || 'Unknown'}</span>
          <span>${dp.user?.tin || 'Unknown'}</span>
          <span>${dp.payment.taxType}</span>
          <span>${dp.deadline || 'Past Due'}</span>
          <span style="color:#dc2626;font-weight:bold;">₦${(dp.payment.amount||0).toLocaleString()}</span>
          <span class="status-pill pill-red">Overdue</span>
        </div>
      `).join('');
    }

    // Enterprises Table
    const entTbody = document.getElementById('admin-enterprise-list');
    if (nonAdminUsers.length === 0) {
      entTbody.innerHTML = '<div style="padding:1.5rem;text-align:center;">No enterprises registered.</div>';
    } else {
      entTbody.innerHTML = nonAdminUsers.map(e => `
        <div class="status-table-row">
          <span>${e.bizName}</span>
          <span>${e.tin}</span>
          <span>${e.entityType}</span>
          <span>${e.location || 'N/A'}</span>
          <span class="status-pill ${e.status === 'active' ? 'pill-green' : 'pill-amber'}">${e.status}</span>
        </div>
      `).join('');
    }

    // Feedback List
    const fbList = document.getElementById('admin-feedback-list');
    if (feedbacks.length === 0) {
      fbList.innerHTML = '<div style="padding:1.5rem;text-align:center;">No feedbacks submitted.</div>';
    } else {
      fbList.innerHTML = feedbacks.map(f => {
        const stars = '★'.repeat(f.rating) + '☆'.repeat(5 - f.rating);
        return `<div style="border:1px solid rgba(0,0,0,0.1); border-radius:8px; padding:1rem;">
          <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem">
            <strong>${f.userName}</strong>
            <span style="color:var(--amber)">${stars}</span>
          </div>
          <p style="color:var(--text-muted);font-size:14px;">"${f.comment || 'No comment provided'}"</p>
          <div style="font-size:12px;color:var(--text-muted);margin-top:0.5rem;">${new Date(f.createdAt).toLocaleString()} | Category: ${f.category}</div>
        </div>`;
      }).join('');
    }

    // Render Charts
    buildAdminCharts({ monthlyAnalytics: monthlyData, entityBreakdown });

  }, 400);
}

function buildAdminCharts(data) {
  if (typeof Chart === 'undefined') return;

  const BASE  = { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}} };
  const NAIRA = v => '₦' + v + 'M';

  // Monthly Revenue Chart
  const revCtx = document.getElementById('adminRevenueChart');
  if (revCtx) {
    if (window.adminRevChart) window.adminRevChart.destroy();
    window.adminRevChart = new Chart(revCtx, {
      type: 'bar',
      data: {
        labels: ['Jan','Feb','Mar','Apr','May','Jun'],
        datasets: [{
          label: 'Revenue',
          data: [data.monthlyAnalytics.Jan||0, data.monthlyAnalytics.Feb||0, data.monthlyAnalytics.Mar||0, data.monthlyAnalytics.Apr||0, data.monthlyAnalytics.May||0, data.monthlyAnalytics.Jun||0].map(v => v/1e6),
          backgroundColor: '#3266ad',
          borderRadius: 4
        }]
      },
      options: {...BASE, scales: { y: { ticks: { callback: NAIRA } } } }
    });
  }

  // Pie Chart (Entity breakdown)
  const pieCtx = document.getElementById('adminPieChart');
  if (pieCtx) {
    if (window.adminPieChart) window.adminPieChart.destroy();
    window.adminPieChart = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(data.entityBreakdown),
        datasets: [{
          data: Object.values(data.entityBreakdown),
          backgroundColor: ['#0a2d5e','#3266ad','#85b7eb','#b5d4f4','#d8e9f8']
        }]
      },
      options: {...BASE, cutout: '60%'}
    });
  }

  // Trend Chart (dummy trend for demo)
  const trendCtx = document.getElementById('adminTrendChart');
  if (trendCtx) {
    if (window.adminTrendChart) window.adminTrendChart.destroy();
    window.adminTrendChart = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'],
        datasets: [{
          label: 'Collection Trend',
          data: [110,115,118,122,130,125,118,124,139,148,152,163],
          borderColor: '#0a2d5e', backgroundColor: 'rgba(10,45,94,.07)',
          fill: true, tension: 0.3
        }]
      },
      options: {...BASE, scales: { y: { ticks: { callback: NAIRA } } } }
    });
  }
}

// ==========================================
// UTILS
// ==========================================
function showToast(msg, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:360px';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  const colors = { success:'#065f46', error:'#9f1239', info:'#1e3a5f' };
  const bg     = { success:'#ecfdf5', error:'#fff1f2', info:'#e6f1fb' };
  toast.style.cssText = `background:${bg[type]||bg.info};color:${colors[type]||colors.info};border:1px solid currentColor;padding:12px 16px;border-radius:8px;font-size:13.5px;box-shadow:0 4px 14px rgba(0,0,0,.12);line-height:1.5;word-break:break-word;opacity:0;transition:opacity .2s`;
  toast.textContent = msg;
  container.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 220); }, 4500);
}

function showError(el, msg) {
  if (!el) { showToast(msg, 'error'); return; }
  el.textContent = msg;
  el.hidden = false;
}

document.addEventListener('DOMContentLoaded', () => {
  initLocalDB(); // Setup admin and tables if missing
  loadSession();
  updateNavForAuth();
  showSection('home');

  const payType   = document.getElementById('pay-type');
  const payAmount = document.getElementById('pay-amount');
  if (payType)   payType.addEventListener('change', updatePayTotal);
  if (payAmount) payAmount.addEventListener('input', updatePayTotal);

  document.addEventListener('click', e => {
    const nav = document.getElementById('main-nav');
    const btn = document.getElementById('hamburger');
    if (nav && btn && !nav.contains(e.target) && !btn.contains(e.target)) {
      nav.classList.remove('mobile-open');
      btn.setAttribute('aria-expanded','false');
    }
  });

  document.querySelectorAll('.pay-method').forEach(tile => {
    tile.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); selectPayMethod(tile); } });
  });

  document.querySelectorAll('.entity-card').forEach(card => {
    card.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); card.click(); } });
  });

  document.querySelectorAll('#star-rating .star').forEach(star => {
    star.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); setRating(parseInt(star.getAttribute('data-val'),10)); } });
  });
});