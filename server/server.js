require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'utaps-secret-2026-abia-state';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/utaps';

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../UTAPS')));

// MongoDB Connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Schemas
const userSchema = new mongoose.Schema({
  tin: { type: String, required: true, unique: true },
  bizName: { type: String, required: true },
  entityType: { type: String, required: true },
  address: { type: String, required: true },
  location: { type: String, required: true }, // Added location
  email: { type: String, required: true, unique: true }, // Required to be gmail in validation
  phone: { type: String, required: true },
  rcNumber: String,
  annualTurnover: { type: Number, default: 0 },
  employees: { type: Number, default: 0 },
  contactPerson: String,
  role: { type: String, default: 'user' }, // 'admin' or 'user'
  passwordHash: { type: String, required: true },
  utapsId: { type: String, required: true, unique: true },
  status: { type: String, default: 'active' }
}, { timestamps: true });

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  taxType: String,
  period: String,
  amount: Number,
  assessmentRef: String,
  method: String,
  status: String,
  dueDate: String,
  paidAt: Date,
  receiptNo: String
});

const feedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  entityName: String,
  entityType: String,
  category: String,
  rating: Number,
  easeRating: Number,
  speedRating: Number,
  supportRating: Number,
  deadlineRating: Number,
  comment: String
}, { timestamps: true });

const noticeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: String,
  title: String,
  body: String,
  issuedAt: Date,
  noticeRef: String
});

const User = mongoose.model('User', userSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);
const Notice = mongoose.model('Notice', noticeSchema);

// Password helpers
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

function signToken(user) {
  return jwt.sign(
    { id: user._id, tin: user.tin, utapsId: user.utapsId, role: user.role },
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

function adminMiddleware(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ error: 'Forbidden — Admins only' });
  }
}

// Seed Admin
async function seedAdmin() {
  try {
    const adminExists = await User.findOne({ email: 'admin@gmail.com' });
    if (!adminExists) {
      await User.create({
        tin: 'ADMIN-001',
        bizName: 'System Administrator',
        entityType: 'Government',
        address: 'Secretariat, Umuahia',
        location: 'Umuahia North',
        email: 'admin@gmail.com',
        phone: '08000000000',
        role: 'admin',
        passwordHash: hashPassword('admin1234'),
        utapsId: 'UTAPS-ADMIN',
        status: 'active'
      });
      console.log('✅ Admin user seeded');
    }
  } catch (err) {
    console.error('Error seeding admin:', err);
  }
}

mongoose.connection.once('open', seedAdmin);

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', system: 'UTAPS', version: '2.0.0 (MongoDB)', time: new Date().toISOString() });
});

// Auth
router.post('/auth/register', async (req, res) => {
  try {
    const { bizName, tin, entityType, address, location, email, phone, rcNumber,
            annualTurnover, employees, contactPerson, role, password } = req.body;

    const missing = ['bizName','tin','entityType','address','location','email','phone','password']
      .filter(f => !req.body[f]?.trim());

    if (missing.length) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    if (!email.toLowerCase().endsWith('@gmail.com')) {
      return res.status(400).json({ error: 'A Gmail address (@gmail.com) is required for registration.' });
    }

    const existingUser = await User.findOne({ $or: [{ tin: tin.trim() }, { email: email.toLowerCase().trim() }] });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this TIN or email already exists.' });
    }

    const count = await User.countDocuments();
    const utapsId = `UTAPS-2026-${String(count + 1).padStart(4,'0')}`;

    const newUser = await User.create({
      tin: tin.trim(), bizName: bizName.trim(), entityType,
      address: address.trim(), location: location.trim(), email: email.toLowerCase().trim(),
      phone: phone.trim(), rcNumber: rcNumber?.trim() || '',
      annualTurnover: parseFloat(annualTurnover) || 0,
      employees: parseInt(employees) || 0,
      contactPerson: contactPerson?.trim() || '',
      role: role?.trim() || 'user',
      passwordHash: hashPassword(password),
      utapsId, status: 'pending_verification'
    });

    const safeUser = newUser.toObject();
    delete safeUser.passwordHash;
    const token = signToken(newUser);

    res.status(201).json({
      message: `Registration successful! Your UTAPS ID is ${utapsId}.`,
      user: safeUser, token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { tin, password } = req.body;
    if (!tin) return res.status(400).json({ error: 'TIN or email is required.' });

    const cleanTin = tin.trim().toLowerCase();
    const user = await User.findOne({ $or: [{ tin: cleanTin }, { email: cleanTin }] });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const safeUser = user.toObject();
    delete safeUser.passwordHash;
    const token = signToken(user);

    res.json({ message: `Welcome back, ${user.contactPerson || user.bizName}!`, user: safeUser, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ error: 'User not found.' });
    delete user.passwordHash;
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Dashboard Route
router.get('/admin/dashboard', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }).lean();
    const payments = await Payment.find().populate('userId', 'bizName tin email phone location').lean();
    const feedbacks = await Feedback.find().populate('userId', 'bizName').sort({ createdAt: -1 }).lean();
    const notices = await Notice.find().lean();

    const registeredCount = users.length;
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
        overduePayments.push(p);
      }
    });

    users.forEach(u => {
      entityBreakdown[u.entityType] = (entityBreakdown[u.entityType] || 0) + 1;
    });

    const debtorProfiles = overduePayments.map(op => {
      return {
        payment: op,
        user: op.userId,
        deadline: op.dueDate,
        notices: notices.filter(n => String(n.userId) === String(op.userId?._id))
      };
    });

    res.json({
      registeredCount,
      totalPaid,
      outstandingLiabilities,
      feedbacks,
      registeredEnterprises: users.map(u => ({ bizName: u.bizName, tin: u.tin, type: u.entityType, location: u.location, status: u.status })),
      debtorProfiles,
      entityBreakdown,
      monthlyAnalytics: monthlyData
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Entities
router.get('/entities', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }, '-passwordHash').lean();
    res.json({ count: users.length, entities: users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/entities/:tin', async (req, res) => {
  try {
    const user = await User.findOne({ tin: req.params.tin }, '-passwordHash').lean();
    if (!user) return res.status(404).json({ error: 'No entity found.' });
    res.json({ entity: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/entities/me/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id, '-passwordHash').lean();
    if (!user) return res.status(404).json({ error: 'Profile not found.' });
    res.json({ entity: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Payments
router.get('/payments', authMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user.id }).lean();
    res.json({ count: payments.length, payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/payments', authMiddleware, async (req, res) => {
  try {
    const { taxType, period, amount, assessmentRef, method } = req.body;
    if (!taxType || !amount || !method) return res.status(400).json({ error: 'taxType, amount, method required.' });

    const count = await Payment.countDocuments();
    const receiptNo = `UTAPS-REC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(count+1).padStart(4,'0')}`;

    const newPayment = await Payment.create({
      userId: req.user.id, taxType, period, amount: parseFloat(amount), assessmentRef,
      method, status: 'paid', paidAt: new Date(), receiptNo
    });
    res.status(201).json({ message: 'Payment recorded successfully.', payment: newPayment, receiptNo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/payments/:id/receipt', authMiddleware, async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!payment) return res.status(404).json({ error: 'Payment not found.' });
    const user = await User.findById(req.user.id).lean();

    res.json({
      receipt: {
        receiptNo: payment.receiptNo, utapsId: user.utapsId, bizName: user.bizName, tin: user.tin,
        taxType: payment.taxType, period: payment.period, amount: payment.amount, method: payment.method,
        paidAt: payment.paidAt, issuedBy: 'UTAPS', poweredBy: 'ABSIRS'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Status
router.get('/status/:tin', async (req, res) => {
  try {
    const entity = await User.findOne({ tin: req.params.tin }, '-passwordHash').lean();
    if (!entity) return res.status(404).json({ error: 'Entity not found.' });

    const payments = await Payment.find({ userId: entity._id }).lean();
    const notices = await Notice.find({ userId: entity._id }).lean();

    const overdue = payments.filter(p => p.status === 'overdue');
    const due = payments.filter(p => p.status === 'due');

    res.json({
      entity, overallStatus: overdue.length === 0 ? 'Compliant' : 'Non-Compliant',
      payments, notices,
      summary: {
        totalPaid: payments.filter(p => p.status === 'paid').reduce((s,p) => s + p.amount, 0),
        totalOutstanding: [...overdue, ...due].reduce((s,p) => s + p.amount, 0),
        overdueCount: overdue.length, dueCount: due.length
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/status/me/report', authMiddleware, async (req, res) => {
  try {
    const entity = await User.findById(req.user.id, '-passwordHash').lean();
    const payments = await Payment.find({ userId: req.user.id }).lean();
    const notices = await Notice.find({ userId: req.user.id }).lean();

    const overdue = payments.filter(p => p.status === 'overdue');
    const due = payments.filter(p => p.status === 'due');

    res.json({
      entity, overallStatus: overdue.length === 0 ? 'Compliant' : 'Non-Compliant',
      payments, notices,
      summary: {
        totalPaid: payments.filter(p => p.status === 'paid').reduce((s,p) => s + p.amount, 0),
        totalOutstanding: [...overdue, ...due].reduce((s,p) => s + p.amount, 0),
        overdueCount: overdue.length, dueCount: due.length
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Feedback
router.post('/feedback', authMiddleware, async (req, res) => {
  try {
    const { entityName, entityType, category, rating, easeRating, speedRating, supportRating, deadlineRating, comment } = req.body;
    if (!rating) return res.status(400).json({ error: 'Rating is required.' });

    const newFeedback = await Feedback.create({
      userId: req.user.id, entityName, entityType, category, rating, easeRating, speedRating, supportRating, deadlineRating, comment
    });

    res.status(201).json({ message: 'Feedback submitted.', feedback: newFeedback });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/feedback', authMiddleware, async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 }).lean();
    if (!feedbacks.length) return res.json({ count: 0, averageRating: 0, distribution: {}, feedback: [] });

    const avg = feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedbacks.forEach(f => { distribution[f.rating] = (distribution[f.rating] || 0) + 1; });

    const total = feedbacks.length;
    const distPct = {};
    Object.entries(distribution).forEach(([k, v]) => { distPct[k] = Math.round((v / total) * 100); });

    res.json({
      count: total, averageRating: Math.round(avg * 10) / 10,
      distribution: distPct, feedback: feedbacks
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Forms
router.get('/forms', authMiddleware, (req, res) => {
  res.json({ forms: [
    { id: 'UTAPS-01', name: 'Corporate Income Tax Return', description: 'For all registered companies in Umuahia Metropolis.', frequency: 'Annual', mandatory: true },
    { id: 'UTAPS-02', name: 'PAYE Remittance Schedule', description: 'For employers with monthly staff payroll.', frequency: 'Monthly', mandatory: true },
    { id: 'UTAPS-03', name: 'Business Premises Levy Declaration', description: 'For all entities with physical premises.', frequency: 'Annual', mandatory: true, updated: '2026' },
    { id: 'UTAPS-04', name: 'Hotel & Consumption Tax Return', description: 'For hotels, restaurants, and hospitality.', frequency: 'Quarterly', mandatory: true },
    { id: 'UTAPS-05', name: 'Education Levy Return', description: 'For private schools and institutions.', frequency: 'Annual', mandatory: true },
    { id: 'TCC-APP',  name: 'Tax Clearance Certificate Application', description: 'For government contracts, bids, and expatriate quota.', frequency: 'As needed', mandatory: false, online: true }
  ]});
});

app.use('/api', router);
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../UTAPS/index.html'));
});

app.use((err, req, res, next) => {
  console.error('UTAPS Error:', err.message);
  res.status(500).json({ error: 'Internal server error. Please contact UTAPS support.' });
});

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  TaxUmuahia · UTAPS Backend (MongoDB)    ║`);
  console.log(`║  Running on http://localhost:${PORT}         ║`);
  console.log(`╚══════════════════════════════════════════╝\n`);
});

module.exports = app;