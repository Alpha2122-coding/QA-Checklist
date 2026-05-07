// server.js — QA Checklist API Server
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'qa-checklist-secret-key-change-in-production-' + Date.now();
const JWT_EXPIRE = '7d';
const SESSION_TIMEOUT_MINUTES = 30;
const SESSION_INACTIVITY_MS = SESSION_TIMEOUT_MINUTES * 60 * 1000;
const CERT_KEY_FILE = process.env.HTTPS_KEY || path.join(__dirname, 'cert', 'key.pem');
const CERT_CERT_FILE = process.env.HTTPS_CERT || path.join(__dirname, 'cert', 'cert.pem');
const USE_HTTPS = fs.existsSync(CERT_KEY_FILE) && fs.existsSync(CERT_CERT_FILE);
const COOKIE_SECURE = USE_HTTPS;

// ===================== DIRECTORIES =====================
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const APPDATA_DIR = path.join(DATA_DIR, 'appdata');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

[DATA_DIR, APPDATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ===================== JSON FILE HELPERS =====================
function readJSON(filepath, fallback) {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    }
  } catch (e) { console.error('Read error:', filepath, e.message); }
  return fallback;
}

function writeJSON(filepath, data) {
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) { console.error('Write error:', filepath, e.message); return false; }
}

function isValidEmail(email) {
  return typeof email==='string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ===================== INIT DEFAULT ADMIN =====================
function initUsers() {
  let users = readJSON(USERS_FILE, []);
  if (!users.length) {
    const adminId = uuidv4();
    const hashedPass = bcrypt.hashSync('admin123', 10);
    users.push({
      id: adminId,
      name: 'Admin Manager',
      email: 'admin@qa.com',
      password: hashedPass,
      role: 'manager',
      status: 'approved',
      createdAt: new Date().toISOString(),
      approvedBy: 'system',
      approvedAt: new Date().toISOString(),
      lastLogin: null,
      avatar: 'AM'
    });
    writeJSON(USERS_FILE, users);
    console.log('✅ Default admin created: admin@qa.com / admin123');
  }
  return users;
}

function getUsers() { return readJSON(USERS_FILE, []); }
function saveUsers(users) { writeJSON(USERS_FILE, users); }
function getSessions() { return readJSON(SESSIONS_FILE, []); }
function saveSessions(sessions) { writeJSON(SESSIONS_FILE, sessions); }

function cleanExpiredSessions() {
  const now = new Date();
  let sessions = getSessions().filter(s => {
    const expiresAt = new Date(s.expiresAt);
    const lastActivity = new Date(s.lastActivity || s.createdAt);
    return expiresAt > now && now - lastActivity < SESSION_INACTIVITY_MS;
  });
  saveSessions(sessions);
  return sessions;
}

function getUserDataFile(userId) {
  return path.join(APPDATA_DIR, userId + '.json');
}

function getUserData(userId) {
  return readJSON(getUserDataFile(userId), null);
}

function saveUserData(userId, data) {
  return writeJSON(getUserDataFile(userId), data);
}

// Initialize
initUsers();

// ===================== MIDDLEWARE =====================
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ===================== AUTH MIDDLEWARE =====================
function authMiddleware(req, res, next) {
  // Check cookie first, then Authorization header
  let token = req.cookies.qa_token;
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    return res.status(401).json({ ok: false, msg: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.sessionId) {
      return res.status(401).json({ ok: false, msg: 'Session invalid' });
    }

    const users = getUsers();
    const user = users.find(u => u.id === decoded.userId);
    if (!user) {
      return res.status(401).json({ ok: false, msg: 'User not found' });
    }
    if (user.status !== 'approved') {
      return res.status(403).json({ ok: false, msg: 'Account pending approval' });
    }

    const sessions = cleanExpiredSessions();
    const session = sessions.find(s => s.sessionId === decoded.sessionId && s.userId === user.id);
    if (!session) {
      return res.status(401).json({ ok: false, msg: 'Session expired or invalid. Please sign in again.' });
    }

    const now = new Date();
    const lastActivity = new Date(session.lastActivity || session.createdAt);
    if (now - lastActivity > SESSION_INACTIVITY_MS) {
      const remaining = sessions.filter(s => s.sessionId !== session.sessionId);
      saveSessions(remaining);
      return res.status(401).json({ ok: false, msg: 'Session timed out' });
    }

    session.lastActivity = now.toISOString();
    saveSessions(sessions);

    req.user = user;
    req.userId = user.id;
    req.sessionId = session.sessionId;
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, msg: 'Invalid or expired token' });
  }
}

function managerOnly(req, res, next) {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ ok: false, msg: 'Manager access required' });
  }
  next();
}

// ===================== AUTH ROUTES =====================

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, msg: 'Name, email, and password required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ ok: false, msg: 'A valid email address is required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ ok: false, msg: 'Password must be 6+ characters' });
    }

    const validRoles = ['employee', 'manager'];
    const userRole = validRoles.includes(role) ? role : 'employee';

    const users = getUsers();
    const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(409).json({ ok: false, msg: 'Email already registered' });
    }

    const hashedPass = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPass,
      role: userRole,
      status: 'pending', // Needs admin approval
      createdAt: new Date().toISOString(),
      approvedBy: null,
      approvedAt: null,
      lastLogin: null,
      avatar: name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
    };

    users.push(newUser);
    saveUsers(users);

    res.json({
      ok: true,
      msg: 'Account created! Please wait for manager approval.',
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, status: newUser.status }
    });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, remember } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, msg: 'Email and password required' });
    }

    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return res.status(401).json({ ok: false, msg: 'No account found with this email' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ ok: false, msg: 'Incorrect password' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ ok: false, msg: 'Account pending manager approval' });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({ ok: false, msg: 'Account has been rejected' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ ok: false, msg: 'Account suspended. Contact manager.' });
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    saveUsers(users);

    // Remove expired or timed-out sessions and invalidate any previous session for this user
    const now = new Date();
    let sessions = cleanExpiredSessions();
    sessions = sessions.filter(s => s.userId !== user.id);

    const sessionId = uuidv4();
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, sessionId: sessionId },
      JWT_SECRET,
      { expiresIn: remember ? '30d' : JWT_EXPIRE }
    );

    // Create session record
    sessions.push({
      sessionId: sessionId,
      userId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'] || '',
      createdAt: now.toISOString(),
      lastActivity: now.toISOString(),
      expiresAt: new Date(Date.now() + (remember ? 30 : 7) * 24 * 60 * 60 * 1000).toISOString()
    });
    if (sessions.length > 50) sessions.splice(0, sessions.length - 50);
    saveSessions(sessions);

    // Set cookie
    res.cookie('qa_token', token, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: (remember ? 30 : 7) * 24 * 60 * 60 * 1000
    });

    res.json({
      ok: true,
      msg: 'Login successful',
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        status: user.status
      }
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  let token = req.cookies.qa_token;
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.sessionId) {
        const sessions = cleanExpiredSessions().filter(s => s.sessionId !== decoded.sessionId);
        saveSessions(sessions);
      }
    } catch (e) {
      // ignore invalid token on logout
    }
  }

  res.clearCookie('qa_token');
  res.json({ ok: true, msg: 'Logged out' });
});

// GET /api/auth/me — get current user
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const u = req.user;
  res.json({
    ok: true,
    user: {
      id: u.id, name: u.name, email: u.email,
      role: u.role, avatar: u.avatar, status: u.status,
      createdAt: u.createdAt, lastLogin: u.lastLogin
    }
  });
});

// PUT /api/auth/profile — update own profile
app.put('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const users = getUsers();
    const user = users.find(u => u.id === req.userId);
    if (!user) return res.status(404).json({ ok: false, msg: 'User not found' });

    if (name) {
      user.name = name.trim();
      user.avatar = name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ ok: false, msg: 'Current password required' });
      }
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return res.status(400).json({ ok: false, msg: 'Current password incorrect' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ ok: false, msg: 'New password must be 6+ characters' });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    saveUsers(users);
    res.json({
      ok: true, msg: 'Profile updated',
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }
    });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});

// ===================== MANAGER: USER MANAGEMENT =====================

// GET /api/users — list all users (manager only)
app.get('/api/users', authMiddleware, managerOnly, (req, res) => {
  const users = getUsers().map(u => ({
    id: u.id, name: u.name, email: u.email,
    role: u.role, status: u.status,
    createdAt: u.createdAt, lastLogin: u.lastLogin,
    approvedBy: u.approvedBy, approvedAt: u.approvedAt,
    avatar: u.avatar
  }));
  res.json({ ok: true, users });
});

// GET /api/users/pending — pending approvals (manager only)
app.get('/api/users/pending', authMiddleware, managerOnly, (req, res) => {
  const pending = getUsers()
    .filter(u => u.status === 'pending')
    .map(u => ({
      id: u.id, name: u.name, email: u.email,
      role: u.role, createdAt: u.createdAt, avatar: u.avatar
    }));
  res.json({ ok: true, users: pending, count: pending.length });
});

// POST /api/users/:id/approve — approve user (manager only)
app.post('/api/users/:id/approve', authMiddleware, managerOnly, (req, res) => {
  const users = getUsers();
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ ok: false, msg: 'User not found' });
  if (user.status === 'approved') return res.json({ ok: true, msg: 'Already approved' });

  user.status = 'approved';
  user.approvedBy = req.user.name;
  user.approvedAt = new Date().toISOString();
  saveUsers(users);
  res.json({ ok: true, msg: user.name + ' approved' });
});

// POST /api/users/:id/reject — reject user (manager only)
app.post('/api/users/:id/reject', authMiddleware, managerOnly, (req, res) => {
  const users = getUsers();
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ ok: false, msg: 'User not found' });

  user.status = 'rejected';
  saveUsers(users);
  res.json({ ok: true, msg: user.name + ' rejected' });
});

// POST /api/users/:id/suspend — suspend user (manager only)
app.post('/api/users/:id/suspend', authMiddleware, managerOnly, (req, res) => {
  const users = getUsers();
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ ok: false, msg: 'User not found' });
  if (user.id === req.userId) return res.status(400).json({ ok: false, msg: 'Cannot suspend yourself' });

  user.status = 'suspended';
  saveUsers(users);
  res.json({ ok: true, msg: user.name + ' suspended' });
});

// POST /api/users/:id/activate — reactivate user (manager only)
app.post('/api/users/:id/activate', authMiddleware, managerOnly, (req, res) => {
  const users = getUsers();
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ ok: false, msg: 'User not found' });

  user.status = 'approved';
  saveUsers(users);
  res.json({ ok: true, msg: user.name + ' activated' });
});

// PUT /api/users/:id/role — change role (manager only)
app.put('/api/users/:id/role', authMiddleware, managerOnly, (req, res) => {
  const { role } = req.body;
  if (!['manager', 'employee'].includes(role)) {
    return res.status(400).json({ ok: false, msg: 'Invalid role' });
  }
  const users = getUsers();
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ ok: false, msg: 'User not found' });

  user.role = role;
  saveUsers(users);
  res.json({ ok: true, msg: user.name + ' is now ' + role });
});

// DELETE /api/users/:id — delete user (manager only)
app.delete('/api/users/:id', authMiddleware, managerOnly, (req, res) => {
  let users = getUsers();
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ ok: false, msg: 'User not found' });
  if (user.id === req.userId) return res.status(400).json({ ok: false, msg: 'Cannot delete yourself' });

  users = users.filter(u => u.id !== req.params.id);
  saveUsers(users);

  // Remove user data file
  const dataFile = getUserDataFile(req.params.id);
  if (fs.existsSync(dataFile)) fs.unlinkSync(dataFile);

  res.json({ ok: true, msg: user.name + ' deleted' });
});

// ===================== APP DATA ROUTES =====================

// GET /api/data — get user's app data
app.get('/api/data', authMiddleware, (req, res) => {
  const data = getUserData(req.userId);
  res.json({ ok: true, data: data });
});

// PUT /api/data — save user's app data
app.put('/api/data', authMiddleware, (req, res) => {
  const data = req.body.data;
  if (!data || typeof data !== 'object') return res.status(400).json({ ok: false, msg: 'No data provided' });
  data.lastUpdatedAt = new Date().toISOString();
  saveUserData(req.userId, data);
  res.json({ ok: true, msg: 'Data saved' });
});

// GET /api/sessions — get active sessions (manager can see all)
app.get('/api/sessions', authMiddleware, (req, res) => {
  let sessions = getSessions();
  const now = new Date();
  // Filter expired
  sessions = sessions.filter(s => new Date(s.expiresAt) > now);
  saveSessions(sessions);

  if (req.user.role !== 'manager') {
    sessions = sessions.filter(s => s.userId === req.userId);
  }
  res.json({ ok: true, sessions });
});

// ===================== HEALTH CHECK =====================
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    server: 'QA Checklist API',
    version: '2.0.0',
    uptime: process.uptime(),
    time: new Date().toISOString()
  });
});

// ===================== CATCH-ALL: Serve index.html =====================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===================== START SERVER =====================
if (USE_HTTPS) {
  const httpsOptions = {
    key: fs.readFileSync(CERT_KEY_FILE),
    cert: fs.readFileSync(CERT_CERT_FILE)
  };
  https.createServer(httpsOptions, app).listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════╗');
    console.log('║   🧪 QA Checklist Pro Server         ║');
    console.log('║                                      ║');
    console.log(`║   🔒 https://localhost:${PORT}           ║`);
    console.log('║                                      ║');
    console.log('║   📧 Admin: admin@qa.com             ║');
    console.log('║   🔑 Pass:  admin123                 ║');
    console.log('║                                      ║');
    console.log('║   Roles: Manager, Employee           ║');
    console.log('║   New signups need manager approval   ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('');
  });
} else {
  app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════╗');
    console.log('║   🧪 QA Checklist Pro Server         ║');
    console.log('║                                      ║');
    console.log(`║   🌐 http://localhost:${PORT}            ║`);
    console.log('║                                      ║');
    console.log('║   📧 Admin: admin@qa.com             ║');
    console.log('║   🔑 Pass:  admin123                 ║');
    console.log('║                                      ║');
    console.log('║   Roles: Manager, Employee           ║');
    console.log('║   New signups need manager approval   ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('');
  });
}
