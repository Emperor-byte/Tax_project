require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn('⚠️ MONGODB_URI is not set. API will return 500 errors until it is configured.');
} else {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('✅ Connected to MongoDB');
      seedUsers();
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
}

// ==========================================
// Mongoose Models
// ==========================================
const UserSchema = new mongoose.Schema({
  tin: { type: String, unique: true },
  bizName: String,
  entityType: String,
  address: String,
  location: String,
  email: { type: String, unique: true },
  phone: String,
  role: { type: String, default: 'user' },
  password: { type: String, required: true },
  utapsId: String,
  status: { type: String, default: 'active' },
  rcNumber: String,
  annualTurnover: Number,
  employees: Number,
  contactPerson: String,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const PaymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  taxType: String,
  period: String,
  amount: Number,
  assessmentRef: String,
  method: String,
  status: { type: String, enum: ['paid', 'overdue', 'due'] },
  paidAt: Date,
  dueDate: String,
  receiptNo: String,
  createdAt: { type: Date, default: Date.now }
});
const Payment = mongoose.model('Payment', PaymentSchema);

const NoticeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: String,
  title: String,
  body: String,
  issuedAt: { type: Date, default: Date.now },
  noticeRef: String
});
const Notice = mongoose.model('Notice', NoticeSchema);

const FeedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  entityType: String,
  category: String,
  rating: Number,
  easeRating: Number,
  speedRating: Number,
  supportRating: Number,
  deadlineRating: Number,
  comment: String,
  createdAt: { type: Date, default: Date.now }
});
const Feedback = mongoose.model('Feedback', FeedbackSchema);

// ==========================================
// Seed Demo Data
// ==========================================
async function seedUsers() {
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
        password: 'admin1234',
        utapsId: 'UTAPS-ADMIN',
        status: 'active'
      });
      console.log('✅ Admin user seeded');
    }

    const demoExists = await User.findOne({ email: 'demo@gmail.com' });
    if (!demoExists) {
      const demoUser = await User.create({
        tin: 'DEMO-888',
        bizName: 'Demo Metropolis Plaza Ltd',
        entityType: 'Shopping Plaza',
        address: 'Aba Road, Umuahia Metropolis',
        location: 'Aba Road',
        email: 'demo@gmail.com',
        phone: '08034567890',
        role: 'user',
        password: 'demo1234',
        utapsId: 'UTAPS-2026-DEMO',
        status: 'active'
      });
      console.log('✅ Demo user seeded');
      
      // Seed Demo payments
      await Payment.create([
        {
          userId: demoUser._id,
          taxType: 'Corporate Income Tax Return',
          period: '2025',
          amount: 850000,
          assessmentRef: 'CIT-2025-0012',
          method: 'Bank Transfer',
          status: 'paid',
          paidAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          receiptNo: 'UTAPS-REC-20260501-0001'
        },
        {
          userId: demoUser._id,
          taxType: 'PAYE Remittance Schedule',
          period: '2026 Q1',
          amount: 320000,
          assessmentRef: 'PAYE-2026Q1-039',
          method: 'Card Payment',
          status: 'paid',
          paidAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          receiptNo: 'UTAPS-REC-20260515-0002'
        },
        {
          userId: demoUser._id,
          taxType: 'PAYE Remittance Schedule',
          period: '2026 Q2',
          amount: 320000,
          assessmentRef: 'PAYE-2026Q2-088',
          method: 'Bank Transfer',
          status: 'overdue',
          dueDate: '2026-06-30'
        },
        {
          userId: demoUser._id,
          taxType: 'Business Premises Levy',
          period: '2026',
          amount: 75000,
          assessmentRef: 'BPL-2026-991',
          method: 'Bank Transfer',
          status: 'due',
          dueDate: '2026-07-31'
        }
      ]);

      // Seed Demo notices
      await Notice.create([
        {
          userId: demoUser._id,
          type: 'Penalty',
          title: 'PAYE Remittance Penalty Warning',
          body: 'Your PAYE Remittance for Q2 2026 is overdue as of 30 June 2026. A 10% monthly compounding interest penalty applies on the outstanding balance of ₦320,000.',
          issuedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          noticeRef: 'UTAPS/2026/PEN/00412'
        }
      ]);

      // Seed Demo feedback
      await Feedback.create([
        {
          userId: demoUser._id,
          userName: 'Demo Metropolis Plaza Ltd',
          entityType: 'Shopping Plaza',
          category: 'Usability',
          rating: 5,
          easeRating: 5,
          speedRating: 4,
          supportRating: 5,
          deadlineRating: 4,
          comment: 'Excellent interface! TCC application is very smooth. Please continue supporting local merchants.'
        }
      ]);
      console.log('✅ Demo user history seeded');
    }
  } catch (err) {
    console.error('Error seeding data:', err);
  }
}

// ==========================================
// Middleware
// ==========================================
const checkDb = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database connection not available. Please configure MONGODB_URI in Vercel.' });
  }
  next();
};

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const user = await User.findById(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
};

// ==========================================
// API Routes
// ==========================================
app.post('/api/auth/register', checkDb, async (req, res) => {
  try {
    const { email, tin, password } = req.body;
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      return res.status(400).json({ error: 'Only Gmail addresses are allowed.' });
    }
    const existingUser = await User.findOne({ $or: [{ email }, { tin }] });
    if (existingUser) return res.status(400).json({ error: 'User with this TIN or Email already exists.' });

    const count = await User.countDocuments();
    const newUser = await User.create({
      ...req.body,
      utapsId: `UTAPS-2026-${String(count + 1).padStart(4, '0')}`
    });
    res.status(201).json({ user: newUser, token: newUser._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', checkDb, async (req, res) => {
  try {
    const { tin, password } = req.body;
    const user = await User.findOne({ 
      $or: [{ email: tin.toLowerCase() }, { tin: tin.toLowerCase() }],
      password 
    });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ user, token: user._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', checkDb, authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/status/me/report', checkDb, authMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id }).sort({ createdAt: -1 });
    const notices = await Notice.find({ userId: req.user._id }).sort({ issuedAt: -1 });
    
    const overdue = payments.filter(p => p.status === 'overdue');
    const due = payments.filter(p => p.status === 'due');
    const paid = payments.filter(p => p.status === 'paid');

    res.json({
      entity: req.user,
      overallStatus: overdue.length === 0 ? 'Compliant' : 'Non-Compliant',
      payments,
      notices,
      summary: {
        totalPaid: paid.reduce((sum, p) => sum + p.amount, 0),
        totalOutstanding: [...overdue, ...due].reduce((sum, p) => sum + p.amount, 0)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments', checkDb, authMiddleware, async (req, res) => {
  try {
    const count = await Payment.countDocuments();
    const receiptNo = `UTAPS-REC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(count+1).padStart(4,'0')}`;
    const payment = await Payment.create({
      ...req.body,
      userId: req.user._id,
      status: 'paid',
      paidAt: new Date(),
      receiptNo
    });
    res.status(201).json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/feedback', checkDb, authMiddleware, async (req, res) => {
  try {
    const feedback = await Feedback.create({
      ...req.body,
      userId: req.user._id,
      userName: req.user.bizName
    });
    res.status(201).json(feedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/dashboard', checkDb, authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } });
    const payments = await Payment.find().populate('userId', 'bizName tin');
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    
    let totalPaid = 0, outstandingLiabilities = 0;
    const overduePayments = [];
    const monthlyData = { Jan:0, Feb:0, Mar:0, Apr:0, May:0, Jun:0, Jul:0, Aug:0, Sep:0, Oct:0, Nov:0, Dec:0 };
    const entityBreakdown = {};

    users.forEach(u => {
      entityBreakdown[u.entityType] = (entityBreakdown[u.entityType] || 0) + 1;
    });

    payments.forEach(p => {
      if (p.status === 'paid') {
        totalPaid += p.amount;
        if (p.paidAt) {
          const month = new Date(p.paidAt).toLocaleString('en-us', { month: 'short' });
          if (monthlyData[month] !== undefined) monthlyData[month] += p.amount;
        }
      } else {
        outstandingLiabilities += p.amount;
      }
      
      if (p.status === 'overdue') {
        overduePayments.push({
          payment: p,
          user: p.userId,
          deadline: p.dueDate
        });
      }
    });

    res.json({
      registeredCount: users.length,
      totalPaid,
      outstandingLiabilities,
      monthlyAnalytics: monthlyData,
      entityBreakdown,
      overduePayments,
      registeredEnterprises: users,
      feedbacks
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend
app.use(express.static(path.join(__dirname, '../UTAPS')));
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../UTAPS/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  UTAPS API & Static Server               ║`);
  console.log(`║  Running on http://localhost:${PORT}         ║`);
  console.log(`╚══════════════════════════════════════════╝\n`);
});

module.exports = app;