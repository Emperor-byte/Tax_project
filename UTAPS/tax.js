/* ════════════════════════════════════════════════════════
   TaxUmuahia · UTAPS — Frontend JavaScript
   Wired to live Express backend at /api
   ════════════════════════════════════════════════════════ */

'use strict';

/* ════════════════════════════════════════
   API CLIENT
   ════════════════════════════════════════ */

const API = '/api';

async function apiRequest(method, endpoint, body = null, requiresAuth = false) {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('utaps_token');
  if (requiresAuth && token) headers['Authorization'] = 'Bearer ' + token;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(API + endpoint, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const get  = (ep, auth = false) => apiRequest('GET', ep, null, auth);
const post = (ep, body, auth = false) => apiRequest('POST', ep, body, auth);

/* ════════════════════════════════════════
   AUTH STATE
   ════════════════════════════════════════ */

let currentUser = null;

function isLoggedIn() { return !!localStorage.getItem('utaps_token'); }

function saveSession(data) {
  localStorage.setItem('utaps_token', data.token);
  localStorage.setItem('utaps_user', JSON.stringify(data.user));
  currentUser = data.user;
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
  }
}

/* ════════════════════════════════════════
   SECTION ROUTING
   ════════════════════════════════════════ */

const ALL_SECTIONS = [
  'home','login','register','enterprise',
  'legal','pay','status','analytics','feedback','forms'
];

function showSection(name) {
  ALL_SECTIONS.forEach(id => {
    const el = document.getElementById('section-' + id);
    if (el) el.classList.toggle('active', id === name);
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-section') === name);
  });

  if (name === 'analytics') setTimeout(initCharts, 80);
  if (name === 'feedback')  loadFeedbackSummary();
  if (name === 'status' && isLoggedIn()) loadMyStatus();

  window.scrollTo({ top: 0, behavior: 'smooth' });
  return false;
}

/* ════════════════════════════════════════
   MOBILE NAV
   ════════════════════════════════════════ */

function toggleMobileNav() {
  const nav = document.getElementById('main-nav');
  const btn = document.getElementById('hamburger');
  const open = nav.classList.toggle('mobile-open');
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

/* ════════════════════════════════════════
   TAB SWITCHING
   ════════════════════════════════════════ */

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

/* ════════════════════════════════════════
   LOGIN
   ════════════════════════════════════════ */

async function handleLogin() {
  const tin    = document.getElementById('login-tin')?.value?.trim();
  const pass   = document.getElementById('login-pass')?.value;
  const errEl  = document.getElementById('login-error');

  if (errEl) errEl.hidden = true;

  if (!tin || !pass) {
    showError(errEl, 'Please enter your TIN / email and password.');
    return;
  }

  const btn = document.querySelector('.auth-submit');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> Signing in…'; }

  try {
    const data = await post('/auth/login', { tin, password: pass });
    saveSession(data);
    updateNavForAuth();
    showToast(data.message, 'success');
    showSection('home');
  } catch (err) {
    showError(errEl, err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-login"></i> Sign in'; }
  }
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  const icon = btn.querySelector('i');
  if (icon) icon.className = isText ? 'ti ti-eye' : 'ti ti-eye-off';
}

/* ════════════════════════════════════════
   REGISTRATION (3-step)
   ════════════════════════════════════════ */

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
    if (!document.getElementById('reg-address')?.value.trim()) { alert('Business address is required.'); return false; }
  }
  if (step === 2) {
    if (!document.getElementById('reg-email')?.value.trim())   { alert('Email is required.'); return false; }
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

  const body = {
    bizName:       document.getElementById('reg-bizname')?.value?.trim(),
    tin:           document.getElementById('reg-tin')?.value?.trim(),
    entityType:    document.getElementById('reg-entity')?.value,
    rcNumber:      document.getElementById('reg-rc')?.value?.trim(),
    address:       document.getElementById('reg-address')?.value?.trim(),
    annualTurnover:document.getElementById('reg-turnover')?.value,
    employees:     document.getElementById('reg-employees')?.value,
    contactPerson: document.getElementById('reg-contact')?.value?.trim(),
    role:          document.getElementById('reg-role')?.value?.trim(),
    email:         document.getElementById('reg-email')?.value?.trim(),
    phone:         document.getElementById('reg-phone')?.value?.trim(),
    password:      document.getElementById('reg-pass')?.value
  };

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> Submitting…'; }

  try {
    const data = await post('/auth/register', body);
    saveSession(data);
    updateNavForAuth();
    if (successEl) {
      successEl.hidden = false;
      successEl.innerHTML = `<i class="ti ti-circle-check"></i> ${data.message}`;
      successEl.scrollIntoView({ behavior:'smooth', block:'nearest' });
    }
    setTimeout(() => { showSection('home'); showToast('Welcome to UTAPS!', 'success'); }, 2000);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> Submit registration'; }
  }
}

/* ════════════════════════════════════════
   ENTERPRISE — COMPLIANCE RESULT
   ════════════════════════════════════════ */

function showComplianceResult() {
  const panel = document.getElementById('compliance-result');
  if (!panel) return;
  panel.hidden = false;
  panel.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

/* ════════════════════════════════════════
   PAY PAGE
   ════════════════════════════════════════ */

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

  try {
    const data = await post('/payments', { taxType, period: year, amount, assessmentRef: ref, method }, true);
    showToast(`✅ ${data.message} Receipt: ${data.receiptNo}`, 'success');
    if (isLoggedIn()) loadMyStatus();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-lock"></i> Proceed to payment'; }
  }
}

/* ════════════════════════════════════════
   STATUS REPORT — live from API
   ════════════════════════════════════════ */

async function loadStatusReport() {
  const input   = document.getElementById('status-search');
  const typeEl  = document.getElementById('status-type');
  const report  = document.getElementById('status-report');
  const loading = document.getElementById('status-loading');

  const tin = input?.value?.trim();
  if (!tin) { showToast('Please enter a TIN or business name.', 'error'); return; }

  if (loading) loading.hidden = false;
  if (report)  report.hidden  = true;

  try {
    const data = await get('/status/' + encodeURIComponent(tin));
    renderStatusReport(data);
    if (report)  report.hidden  = false;
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (loading) loading.hidden = true;
  }
}

async function loadMyStatus() {
  if (!isLoggedIn()) return;
  const report  = document.getElementById('status-report');
  const loading = document.getElementById('status-loading');

  if (loading) loading.hidden = false;

  try {
    const data = await get('/status/me/report', true);
    renderStatusReport(data);
    if (report) report.hidden = false;
  } catch (err) {
    console.warn('Status load failed:', err.message);
  } finally {
    if (loading) loading.hidden = true;
  }
}

function renderStatusReport(data) {
  const { entity, overallStatus, payments, notices, summary } = data;

  // Entity header
  const nameEl   = document.getElementById('sec-entity-name');
  const infoEl   = document.getElementById('sec-entity-info');
  const badgeEl  = document.getElementById('sec-overall-badge');

  if (nameEl) nameEl.textContent = entity.bizName;
  if (infoEl) infoEl.textContent = `TIN: ${entity.tin}  |  ${entity.entityType}  |  ${entity.address}`;
  if (badgeEl) {
    const compliant = overallStatus === 'Compliant';
    badgeEl.innerHTML = `<span class="status-pill ${compliant ? 'pill-green' : 'pill-red'}">${overallStatus}</span>`;
  }

  // Summary stats
  const sPaid = document.getElementById('sec-total-paid');
  const sOut  = document.getElementById('sec-outstanding');
  if (sPaid) sPaid.textContent = '₦' + (summary.totalPaid || 0).toLocaleString('en-NG');
  if (sOut)  sOut.textContent  = '₦' + (summary.totalOutstanding || 0).toLocaleString('en-NG');

  // Payments table
  const tbody = document.getElementById('status-table-body');
  if (tbody && payments) {
    tbody.innerHTML = payments.map(p => {
      const statusClass = p.status === 'paid' ? 'pill-green' : p.status === 'overdue' ? 'pill-red' : 'pill-amber';
      const statusLabel = p.status === 'paid' ? '✓ Paid' : p.status === 'overdue' ? '⚠ Overdue' : p.status === 'due' ? '⏰ Due soon' : 'Upcoming';
      const action = p.status === 'paid'
        ? `<button class="btn-tbl" onclick="viewReceipt(${p.id})">Receipt</button>`
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

  // Penalty notice — show only if non-compliant
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
  try {
    const data = await get('/payments/' + paymentId + '/receipt', true);
    const r = data.receipt;
    alert(`UTAPS OFFICIAL RECEIPT\n${'─'.repeat(36)}\nReceipt No: ${r.receiptNo}\nUTAPS ID:   ${r.utapsId}\nEntity:     ${r.bizName}\nTIN:        ${r.tin}\nTax type:   ${r.taxType}\nPeriod:     ${r.period}\nAmount:     ₦${r.amount?.toLocaleString('en-NG')}\nMethod:     ${r.method}\nPaid on:    ${r.paidAt?.slice(0,10)}\n${'─'.repeat(36)}\n${r.issuedBy}`);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ════════════════════════════════════════
   FEEDBACK — wired to API
   ════════════════════════════════════════ */

const RATING_LABELS = { 1:'Poor', 2:'Below average', 3:'Average', 4:'Good', 5:'Excellent!' };
let currentRating = 0;
const miniRatings = {};

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

  const body = {
    entityName:     document.querySelector('[placeholder="Company name or your full name"]')?.value,
    entityType:     document.querySelector('.feedback-form-card select:nth-of-type(1)')?.value,
    category:       document.querySelector('.feedback-form-card select:nth-of-type(2)')?.value,
    rating:         currentRating,
    easeRating:     miniRatings['ease'] || 0,
    speedRating:    miniRatings['speed'] || 0,
    supportRating:  miniRatings['support'] || 0,
    deadlineRating: miniRatings['deadline'] || 0,
    comment:        document.querySelector('.feedback-form-card textarea')?.value
  };

  const btn = document.getElementById('feedback-submit-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> Submitting…'; }

  try {
    const data = await post('/feedback', body);
    if (successEl) { successEl.hidden = false; successEl.innerHTML = `<i class="ti ti-circle-check"></i> ${data.message}`; }
    showToast('Feedback submitted!', 'success');
    loadFeedbackSummary();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-send"></i> Submit feedback'; }
  }
}

async function loadFeedbackSummary() {
  try {
    const data = await get('/feedback');
    const { count, averageRating, distribution, feedback } = data;

    const avgEl = document.getElementById('fb-avg-score');
    const cntEl = document.getElementById('fb-count');
    if (avgEl) avgEl.textContent = averageRating.toFixed(1);
    if (cntEl) cntEl.textContent = `Based on ${count} review${count !== 1 ? 's' : ''}`;

    // Rating bars
    [1,2,3,4,5].forEach(n => {
      const bar = document.getElementById(`rb-fill-${n}`);
      const pct = document.getElementById(`rb-pct-${n}`);
      if (bar) bar.style.width = (distribution[n] || 0) + '%';
      if (pct) pct.textContent = (distribution[n] || 0) + '%';
    });

    // Recent reviews
    const reviewsEl = document.getElementById('recent-reviews');
    if (reviewsEl && feedback.length) {
      reviewsEl.innerHTML = feedback.slice(0, 3).map(f => {
        const stars = '★'.repeat(f.rating) + '☆'.repeat(5 - f.rating);
        return `<div class="review-item">
          <div class="review-header">
            <span class="review-name">${f.entityName}</span>
            <span class="mini-score">${stars}</span>
          </div>
          <p class="review-body">"${f.comment || 'No comment provided.'}"</p>
          <span class="review-date">${f.createdAt?.slice(0,10) || ''}</span>
        </div>`;
      }).join('');
    }
  } catch (err) {
    console.warn('Could not load feedback summary:', err.message);
  }
}

/* ════════════════════════════════════════
   ANALYTICS — CHART.JS (+ live API data)
   ════════════════════════════════════════ */

let chartsInited = false;
let barChartInst = null;
let analyticsData = null;

async function initCharts() {
  if (chartsInited) return;
  if (typeof Chart === 'undefined') { console.warn('Chart.js not ready'); return; }

  try {
    analyticsData = await get('/analytics/summary');
    updateStatCards(analyticsData);
  } catch {
    // Fall back to demo data silently
    analyticsData = {
      monthly: { labels:['Jan','Feb','Mar','Apr','May','Jun'], corporate:[48,52,56,62,64,68], paye:[42,44,51,54,56,60], levies:[28,28,32,32,32,35] },
      entityBreakdown: { Companies:42, Banks:28, Hospitals:14, Schools:10, Plazas:6 },
      trend12m: { labels:['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'], values:[110,115,118,122,130,125,118,124,139,148,152,163] }
    };
  }

  chartsInited = true;
  buildBarChart('all');
  buildPieChart();
  buildTrendChart();
}

function updateStatCards(d) {
  const fmt = n => '₦' + Math.round(n/1e6) + 'M';
  const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  s('stat-ytd',   fmt(d.ytdTotal));
  s('stat-june',  fmt(d.juneEstimate));
  s('stat-reg',   d.registeredCount?.toLocaleString() || '4,812');
  s('stat-out',   fmt(d.outstandingLiabilities));
}

const NAIRA = v => '₦' + v + 'M';
const BASE  = { responsive:true, maintainAspectRatio:false, animation:{duration:350}, plugins:{legend:{display:false}} };

function buildBarChart(filter) {
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;
  if (barChartInst) { barChartInst.destroy(); barChartInst = null; }

  const m = analyticsData?.monthly;
  const allD = {
    all:       { corp: m?.corporate||[48,52,56,62,64,68], paye: m?.paye||[42,44,51,54,56,60], levies: m?.levies||[28,28,32,32,32,35] },
    corporate: { corp: m?.corporate||[48,52,56,62,64,68], paye:[0,0,0,0,0,0], levies:[0,0,0,0,0,0] },
    paye:      { corp:[0,0,0,0,0,0], paye: m?.paye||[42,44,51,54,56,60], levies:[0,0,0,0,0,0] },
    levies:    { corp:[0,0,0,0,0,0], paye:[0,0,0,0,0,0], levies: m?.levies||[28,28,32,32,32,35] }
  };

  const d = allD[filter] || allD.all;
  barChartInst = new Chart(canvas, {
    type:'bar',
    data:{
      labels: m?.labels || ['Jan','Feb','Mar','Apr','May','Jun'],
      datasets:[
        {label:'Corporate tax', data:d.corp,   backgroundColor:'#0a2d5e', borderRadius:3, borderSkipped:false},
        {label:'PAYE',          data:d.paye,   backgroundColor:'#3266ad', borderRadius:3, borderSkipped:false},
        {label:'Levies',        data:d.levies, backgroundColor:'#85b7eb', borderRadius:3, borderSkipped:false}
      ]
    },
    options:{...BASE, scales:{x:{stacked:true,grid:{display:false},ticks:{font:{size:12}}}, y:{stacked:true,grid:{color:'rgba(0,0,0,.05)'},ticks:{callback:NAIRA,font:{size:12}}}}}
  });
}

function buildPieChart() {
  const canvas = document.getElementById('pieChart');
  if (!canvas) return;
  const eb = analyticsData?.entityBreakdown || {Companies:42,Banks:28,Hospitals:14,Schools:10,Plazas:6};
  new Chart(canvas, {
    type:'doughnut',
    data:{
      labels: Object.keys(eb),
      datasets:[{data:Object.values(eb), backgroundColor:['#0a2d5e','#3266ad','#85b7eb','#b5d4f4','#d8e9f8'], borderWidth:2, borderColor:'#fff', hoverOffset:4}]
    },
    options:{...BASE, cutout:'60%', plugins:{...BASE.plugins, tooltip:{callbacks:{label:ctx=>` ${ctx.label}: ${ctx.parsed}%`}}}}
  });
}

function buildTrendChart() {
  const canvas = document.getElementById('trendChart');
  if (!canvas) return;
  const t = analyticsData?.trend12m || {labels:['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'], values:[110,115,118,122,130,125,118,124,139,148,152,163]};
  new Chart(canvas, {
    type:'line',
    data:{
      labels:t.labels,
      datasets:[{label:'Revenue (₦M)', data:t.values, borderColor:'#0a2d5e', backgroundColor:'rgba(10,45,94,.07)', borderWidth:2.5, tension:0.35, fill:true, pointBackgroundColor:'#0a2d5e', pointRadius:4, pointHoverRadius:6}]
    },
    options:{...BASE, scales:{x:{grid:{display:false},ticks:{autoSkip:false,maxRotation:0,font:{size:11}}}, y:{grid:{color:'rgba(0,0,0,.05)'},ticks:{callback:NAIRA,font:{size:11}}}}}
  });
}

function setChartFilter(el, type) {
  el.closest('.chart-filters').querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  buildBarChart(type);
}

/* ════════════════════════════════════════
   TOAST NOTIFICATIONS
   ════════════════════════════════════════ */

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

/* ════════════════════════════════════════
   INIT
   ════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  loadSession();
  updateNavForAuth();
  showSection('home');

  // Pay page bindings
  const payType   = document.getElementById('pay-type');
  const payAmount = document.getElementById('pay-amount');
  if (payType)   payType.addEventListener('change', updatePayTotal);
  if (payAmount) payAmount.addEventListener('input', updatePayTotal);

  // Mobile nav close
  document.addEventListener('click', e => {
    const nav = document.getElementById('main-nav');
    const btn = document.getElementById('hamburger');
    if (nav && btn && !nav.contains(e.target) && !btn.contains(e.target)) {
      nav.classList.remove('mobile-open');
      btn.setAttribute('aria-expanded','false');
    }
  });

  // Keyboard: pay method tiles
  document.querySelectorAll('.pay-method').forEach(tile => {
    tile.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); selectPayMethod(tile); } });
  });

  // Keyboard: entity cards
  document.querySelectorAll('.entity-card').forEach(card => {
    card.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); card.click(); } });
  });

  // Keyboard: star rating
  document.querySelectorAll('#star-rating .star').forEach(star => {
    star.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); setRating(parseInt(star.getAttribute('data-val'),10)); } });
  });

  // Verify backend is up
  fetch('/api/health').then(r => r.json()).then(d => {
    console.log('UTAPS backend:', d.status, d.version);
  }).catch(() => {
    console.warn('Backend not reachable — some features require the UTAPS server.');
  });
});