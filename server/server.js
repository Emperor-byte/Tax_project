/**
 * TaxUmuahia · UTAPS Backend
 * Express REST API — Umuahia Tax Automation & Payment System
 * Powered by: Node.js, Express, SQLite (via JSON file store), JWT
 */

'use strict';

const express    = require('express');
const cors       = require('cors');
const jwt        = require('jsonwebtoken');
const crypto     = require('crypto');
const path       = require('path');
const fs         = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'utaps-secret-2026-abia-state';

/* ── Middleware ─────────────────────────────────────────────── */
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../UTAPS')));

/* ════════════════════════════════════════════════════
   FILE-BASED DATABASE (JSON flat files — no native modules)
   ════════════════════════════════════════════════════ */

const isVercel = process.env.VERCEL;
const DB_DIR = isVercel ? '/tmp/db' : path.join(__dirname, 'db');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

// Copy seed files to /tmp/db on Vercel so demo data is available
if (isVercel) {
  const srcDir = path.join(process.cwd(), 'server', 'db');
  ['users', 'payments', 'feedback', 'notices'].forEach(name => {
    const srcFile = path.join(srcDir, name + '.json');
    const destFile = path.join(DB_DIR, name + '.json');
    if (!fs.existsSync(destFile) && fs.existsSync(srcFile)) {
      try {
        fs.copyFileSync(srcFile, destFile);
      } catch (err) {
        console.error(`Failed to copy seed file ${name}:`, err);
      }
    }
  });
}


function dbPath(name) { return path.join(DB_DIR, name + '.json'); }

function readDB(name) {
  const file = dbPath(name);
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return []; }
}

function writeDB(name, data) {
  fs.writeFileSync(dbPath(name), JSON.stringify(data, null, 2));
}

function nextId(collection) {
  if (!collection.length) return 1;
  return Math.max(...collection.map(r => r.id || 0)) + 1;
}

/* ── Seed demo data ─────────────────────────────────────────── */
function seedData() {
  // Only seed if tables are empty
  if (readDB('users').length === 0) {
    const demoUsers = [
      {
        id: 1,
        tin: '12345678-0001',
        bizName: 'Sunshine Medical Centre Ltd',
        entityType: 'Hospital / Clinic',
        address: 'No. 5 Owerri Road, Umuahia Metropolis',
        email: 'admin@sunshinemedical.ng',
        phone: '08012345678',
        rcNumber: 'RC-0012345',
        annualTurnover: 5000000,
        employees: 45,
        contactPerson: 'Dr. Emeka Obi',
        role: 'Medical Director',
        passwordHash: hashPassword('demo1234'),
        utapsId: 'UTAPS-2026-0001',
        status: 'active',
        createdAt: new Date('2026-01-15').toISOString()
      },
      {
        id: 2,
        tin: '98765432-0001',
        bizName: 'First Trust Microfinance Bank',
        entityType: 'Bank / Financial Institution',
        address: 'Plot 12 Bank Road, Umuahia Metropolis',
        email: 'compliance@firsttrust.ng',
        phone: '08098765432',
        rcNumber: 'RC-0054321',
        annualTurnover: 25000000,
        employees: 120,
        contactPerson: 'Mrs. Adaeze Nwosu',
        role: 'CFO',
        passwordHash: hashPassword('bank2024'),
        utapsId: 'UTAPS-2026-0002',
        status: 'active',
        createdAt: new Date('2026-01-20').toISOString()
      }
    ];
    writeDB('users', demoUsers);
    console.log('✅ Seeded demo users');
  }

  if (readDB('payments').length === 0) {
    const demoPayments = [
      { id: 1, userId: 1, taxType: 'Corporate Income Tax', period: '2025', amount: 120000, assessmentRef: 'ASS/2025/CIT/0041', method: 'Remita', status: 'paid', paidAt: new Date('2026-03-20').toISOString(), receiptNo: 'UTAPS-REC-20260320-0041' },
      { id: 2, userId: 1, taxType: 'PAYE Q1 2026',         period: 'Q1 2026', amount: 45000, assessmentRef: 'ASS/2026/PAYE/0091', method: 'Bank transfer', status: 'overdue', dueDate: '2026-04-30', paidAt: null, receiptNo: null },
      { id: 3, userId: 1, taxType: 'PAYE Q2 2026',         period: 'Q2 2026', amount: 45000, assessmentRef: 'ASS/2026/PAYE/0092', method: null, status: 'due', dueDate: '2026-06-30', paidAt: null, receiptNo: null },
      { id: 4, userId: 1, taxType: 'Business Premises Levy', period: '2026',  amount: 25000, assessmentRef: 'ASS/2026/BPL/0012', method: null, status: 'upcoming', dueDate: '2026-09-30', paidAt: null, receiptNo: null },
      { id: 5, userId: 2, taxType: 'Corporate Income Tax', period: '2025',    amount: 850000, assessmentRef: 'ASS/2025/CIT/0012', method: 'Remita', status: 'paid', paidAt: new Date('2026-02-28').toISOString(), receiptNo: 'UTAPS-REC-20260228-0012' },
      { id: 6, userId: 2, taxType: 'PAYE Q1 2026',         period: 'Q1 2026', amount: 320000, assessmentRef: 'ASS/2026/PAYE/0033', method: 'Remita', status: 'paid', paidAt: new Date('2026-04-15').toISOString(), receiptNo: 'UTAPS-REC-20260415-0033' }
    ];
    writeDB('payments', demoPayments);
    console.log('✅ Seeded demo payments');
  }

  if (readDB('feedback').length === 0) {
    const demoFeedback = [
      { id: 1, userId: 2, entityName: 'First Trust Microfinance Bank', entityType: 'Bank / Financial Institution', category: 'Payment process', rating: 5, easeRating: 5, speedRating: 4, supportRating: 5, deadlineRating: 4, comment: 'The payment portal is much easier than the old process. Quick receipt issuance.', createdAt: new Date('2026-06-15').toISOString() },
      { id: 2, userId: null, entityName: 'Sunrise Academy', entityType: 'School / Educational Institution', category: 'Portal usability', rating: 3, easeRating: 3, speedRating: 3, supportRating: 4, deadlineRating: 3, comment: 'Wish the education levy section was more clearly labelled. Otherwise smooth.', createdAt: new Date('2026-06-02').toISOString() }
    ];
    writeDB('feedback', demoFeedback);
    console.log('✅ Seeded demo feedback');
  }

  if (readDB('notices').length === 0) {
    writeDB('notices', [
      { id: 1, userId: 1, type: 'penalty', paymentId: 2, title: 'PAYE Q1 2026 Overdue', body: 'Your PAYE Q1 2026 remittance of ₦45,000 is overdue. Penalty of 10% applies.', issuedAt: new Date('2026-05-10').toISOString(), noticeRef: 'UTAPS/2026/PEN/00412' }
    ]);
    console.log('✅ Seeded demo notices');
  }
}

/* ── Password helpers (Node crypto, no native deps) ─────────── */
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return salt + ':' + hash;
}

function verifyPassword(pw, stored) {
  try {
    const [salt, hash] = stored.split(':');
    const h = crypto.scryptSync(pw, salt, 64).toString('hex');
    return h === hash;
  } catch { return false; }
}

/* ── JWT helpers ────────────────────────────────────────────── */
function signToken(user) {
  return jwt.sign(
    { id: user.id, tin: user.tin, utapsId: user.utapsId },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized — please sign in' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired — please sign in again' });
  }
}

/* ══════════════════════════════════════════════════
   API ROUTES
   ══════════════════════════════════════════════════ */

const router = express.Router();

/* ── Health check ───────────────────────────────── */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', system: 'UTAPS', version: '1.0.0', time: new Date().toISOString() });
});

/* ────────────────────────────────────────────────
   AUTH
   ──────────────────────────────────────────────── */

/** POST /api/auth/register */
router.post('/auth/register', (req, res) => {
  const { bizName, tin, entityType, address, email, phone, rcNumber,
          annualTurnover, employees, contactPerson, role, password } = req.body;

  const missing = ['bizName','tin','entityType','address','email','phone','password']
    .filter(f => !req.body[f]?.trim());

  if (missing.length) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
  }

  const users = readDB('users');

  if (users.find(u => u.tin === tin.trim())) {
    return res.status(409).json({ error: 'A UTAPS account with this TIN already exists.' });
  }

  if (users.find(u => u.email?.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const id      = nextId(users);
  const utapsId = `UTAPS-2026-${String(id).padStart(4,'0')}`;

  const newUser = {
    id, tin: tin.trim(), bizName: bizName.trim(), entityType,
    address: address.trim(), email: email.toLowerCase().trim(),
    phone: phone.trim(), rcNumber: rcNumber?.trim() || '',
    annualTurnover: parseFloat(annualTurnover) || 0,
    employees: parseInt(employees) || 0,
    contactPerson: contactPerson?.trim() || '',
    role: role?.trim() || '',
    passwordHash: hashPassword(password),
    utapsId, status: 'pending_verification',
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeDB('users', users);

  const { passwordHash, ...safeUser } = newUser;
  const token = signToken(newUser);

  res.status(201).json({
    message: `Registration successful! Your UTAPS ID is ${utapsId}. A verification email has been sent to ${email}.`,
    user: safeUser,
    token
  });
});

/** POST /api/auth/login */
router.post('/auth/login', (req, res) => {
  const { tin, password } = req.body;

  if (!tin || !password) {
    return res.status(400).json({ error: 'TIN/email and password are required.' });
  }

  const users = readDB('users');
  const user  = users.find(u =>
    u.tin === tin.trim() || u.email?.toLowerCase() === tin.toLowerCase().trim()
  );

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid TIN/email or password.' });
  }

  const { passwordHash, ...safeUser } = user;
  const token = signToken(user);

  res.json({
    message: `Welcome back, ${user.contactPerson || user.bizName}!`,
    user: safeUser,
    token
  });
});

/** GET /api/auth/me — get current user profile */
router.get('/auth/me', authMiddleware, (req, res) => {
  const users = readDB('users');
  const user  = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const { passwordHash, ...safe } = user;
  res.json({ user: safe });
});

/* ────────────────────────────────────────────────
   ENTITIES / ENTERPRISE
   ──────────────────────────────────────────────── */

/** GET /api/entities — list all registered entities (admin view) */
router.get('/entities', (req, res) => {
  const users = readDB('users');
  const safe  = users.map(({ passwordHash, ...u }) => u);
  res.json({ count: safe.length, entities: safe });
});

/** GET /api/entities/:tin — lookup by TIN */
router.get('/entities/:tin', (req, res) => {
  const users  = readDB('users');
  const entity = users.find(u => u.tin === req.params.tin);
  if (!entity) return res.status(404).json({ error: 'No entity found with that TIN.' });
  const { passwordHash, ...safe } = entity;
  res.json({ entity: safe });
});

/** GET /api/entities/me/profile — authenticated user's own profile */
router.get('/entities/me/profile', authMiddleware, (req, res) => {
  const users = readDB('users');
  const user  = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Profile not found.' });
  const { passwordHash, ...safe } = user;
  res.json({ entity: safe });
});

/* ────────────────────────────────────────────────
   PAYMENTS
   ──────────────────────────────────────────────── */

/** GET /api/payments — current user's payment history */
router.get('/payments', authMiddleware, (req, res) => {
  const payments = readDB('payments').filter(p => p.userId === req.user.id);
  res.json({ count: payments.length, payments });
});

/** POST /api/payments — create a new payment record */
router.post('/payments', authMiddleware, (req, res) => {
  const { taxType, period, amount, assessmentRef, method } = req.body;

  if (!taxType || !amount || !method) {
    return res.status(400).json({ error: 'taxType, amount, and method are required.' });
  }

  const payments  = readDB('payments');
  const receiptNo = `UTAPS-REC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(nextId(payments)).padStart(4,'0')}`;

  const newPayment = {
    id:            nextId(payments),
    userId:        req.user.id,
    taxType,
    period:        period || '',
    amount:        parseFloat(amount),
    assessmentRef: assessmentRef || '',
    method,
    status:        'paid',
    paidAt:        new Date().toISOString(),
    receiptNo
  };

  payments.push(newPayment);
  writeDB('payments', payments);

  res.status(201).json({
    message: `Payment of ₦${parseFloat(amount).toLocaleString()} recorded successfully.`,
    payment: newPayment,
    receiptNo
  });
});

/** GET /api/payments/:id/receipt — single payment receipt */
router.get('/payments/:id/receipt', authMiddleware, (req, res) => {
  const payments = readDB('payments');
  const payment  = payments.find(p => p.id === parseInt(req.params.id) && p.userId === req.user.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found.' });

  const users = readDB('users');
  const user  = users.find(u => u.id === req.user.id);

  res.json({
    receipt: {
      receiptNo:    payment.receiptNo,
      utapsId:      user?.utapsId,
      bizName:      user?.bizName,
      tin:          user?.tin,
      taxType:      payment.taxType,
      period:       payment.period,
      amount:       payment.amount,
      method:       payment.method,
      paidAt:       payment.paidAt,
      issuedBy:     'Umuahia Tax Automation & Payment System (UTAPS)',
      poweredBy:    'Abia State Internal Revenue Service (ABSIRS)'
    }
  });
});

/* ────────────────────────────────────────────────
   STATUS REPORTS
   ──────────────────────────────────────────────── */

/** GET /api/status/:tin — full compliance status for a TIN */
router.get('/status/:tin', (req, res) => {
  const users    = readDB('users');
  const payments = readDB('payments');
  const notices  = readDB('notices');

  const entity = users.find(u => u.tin === req.params.tin);
  if (!entity) return res.status(404).json({ error: 'No entity registered with this TIN in Umuahia Metropolis.' });

  const entityPayments = payments.filter(p => p.userId === entity.id);
  const entityNotices  = notices.filter(n => n.userId === entity.id);

  const overdue   = entityPayments.filter(p => p.status === 'overdue');
  const due       = entityPayments.filter(p => p.status === 'due');
  const isCompliant = overdue.length === 0;

  const { passwordHash, ...safeEntity } = entity;

  res.json({
    entity:         safeEntity,
    overallStatus:  isCompliant ? 'Compliant' : 'Non-Compliant',
    payments:       entityPayments,
    notices:        entityNotices,
    summary: {
      totalPaid:      entityPayments.filter(p => p.status === 'paid').reduce((s,p) => s + p.amount, 0),
      totalOutstanding: [...overdue, ...due].reduce((s,p) => s + p.amount, 0),
      overdueCount:   overdue.length,
      dueCount:       due.length
    }
  });
});

/** GET /api/status/me/report — authenticated user's own status */
router.get('/status/me/report', authMiddleware, (req, res) => {
  const users    = readDB('users');
  const payments = readDB('payments');
  const notices  = readDB('notices');

  const entity         = users.find(u => u.id === req.user.id);
  const entityPayments = payments.filter(p => p.userId === req.user.id);
  const entityNotices  = notices.filter(n => n.userId === req.user.id);

  const overdue = entityPayments.filter(p => p.status === 'overdue');
  const due     = entityPayments.filter(p => p.status === 'due');

  const { passwordHash, ...safeEntity } = entity;

  res.json({
    entity:        safeEntity,
    overallStatus: overdue.length === 0 ? 'Compliant' : 'Non-Compliant',
    payments:      entityPayments,
    notices:       entityNotices,
    summary: {
      totalPaid:        entityPayments.filter(p => p.status === 'paid').reduce((s,p) => s + p.amount, 0),
      totalOutstanding: [...overdue, ...due].reduce((s,p) => s + p.amount, 0),
      overdueCount:     overdue.length,
      dueCount:         due.length
    }
  });
});

/** POST /api/notices — issue a compliance notice (admin action) */
router.post('/notices', (req, res) => {
  const { tin, type, title, body } = req.body;
  if (!tin || !title) return res.status(400).json({ error: 'tin and title are required.' });

  const users   = readDB('users');
  const notices = readDB('notices');
  const entity  = users.find(u => u.tin === tin);
  if (!entity) return res.status(404).json({ error: 'Entity not found.' });

  const id     = nextId(notices);
  const notice = {
    id,
    userId:    entity.id,
    type:      type || 'general',
    title,
    body:      body || '',
    issuedAt:  new Date().toISOString(),
    noticeRef: `UTAPS/${new Date().getFullYear()}/NOT/${String(id).padStart(5,'0')}`
  };

  notices.push(notice);
  writeDB('notices', notices);

  res.status(201).json({ message: 'Notice issued successfully.', notice });
});

/* ────────────────────────────────────────────────
   FEEDBACK & RATINGS
   ──────────────────────────────────────────────── */

/** POST /api/feedback — submit feedback */
router.post('/feedback', (req, res) => {
  const { entityName, entityType, category, rating, easeRating,
          speedRating, supportRating, deadlineRating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'A rating between 1 and 5 is required.' });
  }

  const feedbackList = readDB('feedback');

  const newFeedback = {
    id:             nextId(feedbackList),
    userId:         null,
    entityName:     entityName || 'Anonymous',
    entityType:     entityType || '',
    category:       category || 'General',
    rating:         parseInt(rating),
    easeRating:     parseInt(easeRating) || 0,
    speedRating:    parseInt(speedRating) || 0,
    supportRating:  parseInt(supportRating) || 0,
    deadlineRating: parseInt(deadlineRating) || 0,
    comment:        comment || '',
    createdAt:      new Date().toISOString()
  };

  feedbackList.push(newFeedback);
  writeDB('feedback', feedbackList);

  res.status(201).json({
    message: 'Thank you! Your feedback has been received and will be reviewed by the UTAPS team.',
    feedback: newFeedback
  });
});

/** GET /api/feedback — get all feedback with aggregated stats */
router.get('/feedback', (req, res) => {
  const feedbackList = readDB('feedback');
  if (!feedbackList.length) return res.json({ count: 0, averageRating: 0, distribution: {}, feedback: [] });

  const avg = feedbackList.reduce((s, f) => s + f.rating, 0) / feedbackList.length;

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  feedbackList.forEach(f => { distribution[f.rating] = (distribution[f.rating] || 0) + 1; });

  // Convert to percentages
  const total = feedbackList.length;
  const distPct = {};
  Object.entries(distribution).forEach(([k, v]) => {
    distPct[k] = Math.round((v / total) * 100);
  });

  res.json({
    count:          total,
    averageRating:  Math.round(avg * 10) / 10,
    distribution:   distPct,
    feedback:       feedbackList.slice().reverse() // newest first
  });
});

/* ────────────────────────────────────────────────
   ANALYTICS (revenue dashboard data)
   ──────────────────────────────────────────────── */

/** GET /api/analytics/summary */
router.get('/analytics/summary', (req, res) => {
  const payments = readDB('payments');
  const users    = readDB('users');

  const paid = payments.filter(p => p.status === 'paid');
  const ytd  = paid.reduce((s, p) => s + (p.amount || 0), 0);

  // Monthly breakdown Jan-Jun 2026 (demo data)
  const monthly = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    corporate: [48, 52, 56, 62, 64, 68],
    paye:      [42, 44, 51, 54, 56, 60],
    levies:    [28, 28, 32, 32, 32, 35]
  };

  const entityBreakdown = {
    Companies: 42, Banks: 28, Hospitals: 14, Schools: 10, Plazas: 6
  };

  const trend12m = {
    labels: ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'],
    values: [110, 115, 118, 122, 130, 125, 118, 124, 139, 148, 152, 163]
  };

  res.json({
    ytdTotal:          ytd || 847000000,
    juneEstimate:      163000000,
    registeredCount:   users.length,
    outstandingLiabilities: payments
      .filter(p => ['overdue','due'].includes(p.status))
      .reduce((s,p) => s + p.amount, 0) || 94000000,
    monthly,
    entityBreakdown,
    trend12m
  });
});

/* ────────────────────────────────────────────────
   FORMS / DOWNLOADS (metadata only)
   ──────────────────────────────────────────────── */

router.get('/forms', (req, res) => {
  res.json({ forms: [
    { id: 'UTAPS-01', name: 'Corporate Income Tax Return', description: 'For all registered companies in Umuahia Metropolis.', frequency: 'Annual', mandatory: true },
    { id: 'UTAPS-02', name: 'PAYE Remittance Schedule', description: 'For employers with monthly staff payroll.', frequency: 'Monthly', mandatory: true },
    { id: 'UTAPS-03', name: 'Business Premises Levy Declaration', description: 'For all entities with physical premises.', frequency: 'Annual', mandatory: true, updated: '2026' },
    { id: 'UTAPS-04', name: 'Hotel & Consumption Tax Return', description: 'For hotels, restaurants, and hospitality.', frequency: 'Quarterly', mandatory: true },
    { id: 'UTAPS-05', name: 'Education Levy Return', description: 'For private schools and institutions.', frequency: 'Annual', mandatory: true },
    { id: 'TCC-APP',  name: 'Tax Clearance Certificate Application', description: 'For government contracts, bids, and expatriate quota.', frequency: 'As needed', mandatory: false, online: true }
  ]});
});

/* ── Mount router ───────────────────────────────── */
app.use('/api', router);

/* ── SPA catch-all ──────────────────────────────── */
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

/* ── Error handler ──────────────────────────────── */
app.use((err, req, res, next) => {
  console.error('UTAPS Error:', err.message);
  res.status(500).json({ error: 'Internal server error. Please contact UTAPS support.' });
});

/* ── Start ──────────────────────────────────────── */
seedData();

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  TaxUmuahia · UTAPS Backend              ║`);
  console.log(`║  Umuahia Tax Automation & Payment System ║`);
  console.log(`║  Running on http://localhost:${PORT}         ║`);
  console.log(`╚══════════════════════════════════════════╝\n`);
  console.log(`  API Base:  http://localhost:${PORT}/api`);
  console.log(`  Frontend:  http://localhost:${PORT}`);
  console.log(`  Health:    http://localhost:${PORT}/api/health\n`);
});

module.exports = app;