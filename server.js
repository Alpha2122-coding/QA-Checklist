// server.js — QA Checklist API Server (Enhanced Security)
require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const https = require('https');
const fs = require('fs');
const path = require('path');
const winston = require('winston');

// ===================== LOGGING =====================
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console()
  ]
});

const app = express();
const PORT = process.env.PORT || 3000;

// ===================== SECURITY MIDDLEWARE =====================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // NOTE: keep scriptSrc strict; if legacy requires inline, we will remove it next.
      scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
    }
  }
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { ok: false, msg: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: { ok: false, msg: 'Too many login attempts, please try again later.' },
  skipSuccessfulRequests: true
});

// ===================== JWT SECRET =====================
const JWT_SECRET_FILE = path.join(__dirname, 'data', 'jwt_secret.txt');
function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  try {
    if (fs.existsSync(JWT_SECRET_FILE)) {
      const v = fs.readFileSync(JWT_SECRET_FILE, 'utf8').trim();
      if (v && v.length >= 32) return v;
    }
  } catch (e) {
    logger.error('Failed reading JWT secret file:', { error: e.message });
  }
  
  // Generate cryptographically secure secret
  const crypto = require('crypto');
  const secret = crypto.randomBytes(64).toString('hex');
  try {
    fs.mkdirSync(path.dirname(JWT_SECRET_FILE), { recursive: true });
    fs.writeFileSync(JWT_SECRET_FILE, secret, { mode: 0o600 });
    logger.info('Generated new JWT secret');
  } catch (e) {
    logger.error('Failed writing JWT secret file:', { error: e.message });
  }
  return secret;
}
const JWT_SECRET = getJwtSecret();
const JWT_EXPIRE = '7d';
const SESSION_TIMEOUT_MINUTES = 30;
const SESSION_INACTIVITY_MS = SESSION_TIMEOUT_MINUTES * 60 * 1000;

// ===================== HTTPS SETUP =====================
const CERT_KEY_FILE = process.env.HTTPS_KEY || path.join(__dirname, 'cert', 'key.pem');
const CERT_CERT_FILE = process.env.HTTPS_CERT || path.join(__dirname, 'cert', 'cert.pem');
const USE_HTTPS = fs.existsSync(CERT_KEY_FILE) && fs.existsSync(CERT_CERT_FILE);
const COOKIE_SECURE = USE_HTTPS;

// ===================== DIRECTORIES =====================
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const APPDATA_DIR = path.join(DATA_DIR, 'appdata');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const LOGS_DIR = path.join(__dirname, 'logs');

// Create directories with proper permissions
[DATA_DIR, APPDATA_DIR, LOGS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o750 });
  }
});

// ===================== FILE LOCKING FOR DATA INTEGRITY =====================
const fileLocks = new Map();

async function acquireLock(filepath) {
  return new Promise((resolve) => {
    const checkLock = () => {
      if (!fileLocks.has(filepath)) {
        fileLocks.set(filepath, true);
        resolve();
      } else {
        setTimeout(checkLock, 10);
      }
    };
    checkLock();
  });
}

function releaseLock(filepath) {
  fileLocks.delete(filepath);
}

// ===================== JSON FILE HELPERS WITH ERROR HANDLING =====================
async function readJSON(filepath, fallback) {
  try {
    await acquireLock(filepath);
    if (fs.existsSync(filepath)) {
      const data = fs.readFileSync(filepath, 'utf8');
      const parsed = JSON.parse(data);
      releaseLock(filepath);
      return parsed;
    }
  } catch (e) {
    logger.error('Read error:', { filepath, error: e.message });
  }
  releaseLock(filepath);
  return typeof fallback === 'function' ? fallback() : fallback;
}

async function writeJSON(filepath, data) {
  try {
    await acquireLock(filepath);
    // Validate data before writing
    if (data === undefined || data === null) {
      releaseLock(filepath);
      logger.error('Write error: Invalid data', { filepath });
      return false;
    }
    
    // Atomic write: write to temp file then rename
    const tempFile = filepath + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), { mode: 0o640 });
    fs.renameSync(tempFile, filepath);
    releaseLock(filepath);
    return true;
  } catch (e) {
    logger.error('Write error:', { filepath, error: e.message });
    releaseLock(filepath);
    return false;
  }
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.replace(/[<>]/g, '').trim();
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.length <= 254;
}

// ===================== INIT DEFAULT ADMIN =====================
async function initUsers() {
  let users = await readJSON(USERS_FILE, []);
  if (!Array.isArray(users)) users = [];
  
  if (!users.length) {
    const adminId = uuidv4();
    const hashedPass = bcrypt.hashSync('admin123', 12); // Increased salt rounds
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
    await writeJSON(USERS_FILE, users);
    logger.info('Default admin created', { email: 'admin@qa.com' });
  }
  return users;
}

async function getUsers() { 
  const users = await readJSON(USERS_FILE, []);
  return Array.isArray(users) ? users : [];
}

async function saveUsers(users) { 
  if (!Array.isArray(users)) return false;
  return writeJSON(USERS_FILE, users);
}

async function getSessions() { 
  const sessions = await readJSON(SESSIONS_FILE, []);
  return Array.isArray(sessions) ? sessions : [];
}

async function saveSessions(sessions) { 
  if (!Array.isArray(sessions)) return false;
  return writeJSON(SESSIONS_FILE, sessions);
}

async function cleanExpiredSessions() {
  const now = new Date();
  let sessions = await getSessions();
  sessions = sessions.filter(s => {
    const expiresAt = new Date(s.expiresAt);
    const lastActivity = new Date(s.lastActivity || s.createdAt);
    return expiresAt > now && now - lastActivity < SESSION_INACTIVITY_MS;
  });
  await saveSessions(sessions);
  return sessions;
}

function getUserDataFile(userId) {
  return path.join(APPDATA_DIR, userId + '.json');
}

async function getUserData(userId) {
  return readJSON(getUserDataFile(userId), null);
}

async function saveUserData(userId, data) {
  return writeJSON(getUserDataFile(userId), data);
}

// Initialize
initUsers();

// ===================== MIDDLEWARE =====================
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true
}));

// If React build exists, serve it (SPA)
app.use(express.static(path.join(__dirname, 'public', 'dist'), {
  maxAge: '1d',
  etag: true
}));


// ===================== AUTH MIDDLEWARE =====================
async function authMiddleware(req, res, next) {
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

    // Check if user exists and is approved
    const users = await getUsers();
    const user = users.find(u => u.id === decoded.userId);
    if (!user) {
      return res.status(401).json({ ok: false, msg: 'User not found' });
    }
    if (user.status !== 'approved') {
      return res.status(403).json({ ok: false, msg: 'Account pending approval' });
    }

    // Validate session
    const sessions = await cleanExpiredSessions();
    const session = sessions.find(s => s.sessionId === decoded.sessionId && s.userId === user.id);
    if (!session) {
      return res.status(401).json({ ok: false, msg: 'Session expired or invalid. Please sign in again.' });
    }

    // Check inactivity timeout
    const now = new Date();
    const lastActivity = new Date(session.lastActivity || session.createdAt);
    if (now - lastActivity > SESSION_INACTIVITY_MS) {
      const remaining = sessions.filter(s => s.sessionId !== session.sessionId);
      await saveSessions(remaining);
      return res.status(401).json({ ok: false, msg: 'Session timed out' });
    }

    // Update last activity
    session.lastActivity = now.toISOString();
    await saveSessions(sessions);

    req.user = user;
    req.userId = user.id;
    req.sessionId = session.sessionId;
    next();
  } catch (e) {
    logger.warn('Token verification failed', { error: e.message });
    return res.status(401).json({ ok: false, msg: 'Invalid or expired token' });
  }
}

function managerOnly(req, res, next) {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ ok: false, msg: 'Manager access required' });
  }
  next();
}

// ===================== VALIDATION HELPERS =====================
function validateRegistration(req, res, next) {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2 || name.trim().length > 80) {
    errors.push('Name must be 2-80 characters');
  }
  if (!email || !isValidEmail(email)) {
    errors.push('Valid email is required');
  }
  if (!password || password.length < 8 || password.length > 128) {
    errors.push('Password must be 8-128 characters');
  }

  // Check for common weak passwords
  const weakPasswords = ['password', '123456', 'qwerty', 'admin123'];
  if (weakPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
  }

  if (errors.length > 0) {
    return res.status(400).json({ ok: false, msg: errors.join(', ') });
  }

  next();
}

// ===================== AUTH ROUTES =====================

// POST /api/auth/register
app.post('/api/auth/register', authLimiter, validateRegistration, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedName = sanitizeInput(name);

    const users = await getUsers();
    const exists = users.find(u => u.email === sanitizedEmail);
    if (exists) {
      return res.status(409).json({ ok: false, msg: 'Email already registered' });
    }

    const hashedPass = await bcrypt.hash(password, 12);
    const newUser = {
      id: uuidv4(),
      name: sanitizedName,
      email: sanitizedEmail,
      password: hashedPass,
      role: 'employee',
      status: 'pending',
      createdAt: new Date().toISOString(),
      approvedBy: null,
      approvedAt: null,
      lastLogin: null,
      avatar: sanitizedName.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
    };

    users.push(newUser);
    await saveUsers(users);

    logger.info('User registered', { email: sanitizedEmail, userId: newUser.id });

    res.json({
      ok: true,
      msg: 'Account created! Please wait for manager approval.',
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, status: newUser.status }
    });
  } catch (e) {
    logger.error('Register error:', { error: e.message });
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password, remember } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, msg: 'Email and password required' });
    }

    const users = await getUsers();
    const sanitizedEmail = email.toLowerCase().trim();
    const user = users.find(u => u.email === sanitizedEmail);

    if (!user) {
      // Use same error message to prevent user enumeration
      return res.status(401).json({ ok: false, msg: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ ok: false, msg: 'Invalid credentials' });
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
    await saveUsers(users);

    // Clean expired sessions and invalidate previous sessions for this user
    const now = new Date();
    let sessions = await cleanExpiredSessions();
    sessions = sessions.filter(s => s.userId !== user.id);

    const sessionId = uuidv4();
    const tokenExpiry = remember ? '30d' : JWT_EXPIRE;
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, sessionId: sessionId },
      JWT_SECRET,
      { expiresIn: tokenExpiry }
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

    // Limit sessions per user to prevent abuse
    const userSessions = sessions.filter(s => s.userId === user.id);
    if (userSessions.length > 5) {
      sessions = sessions.filter(s => s.userId !== user.id || s === userSessions[userSessions.length - 1]);
    }

    // Global session limit
    if (sessions.length > 100) {
      sessions = sessions.slice(-100);
    }

    await saveSessions(sessions);

    // Set secure cookie
    res.cookie('qa_token', token, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: (remember ? 30 : 7) * 24 * 60 * 60 * 1000,
      path: '/'
    });

    logger.info('User logged in', { email: user.email, userId: user.id });

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
    logger.error('Login error:', { error: e.message });
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
        cleanExpiredSessions().then(sessions => {
          const remaining = sessions.filter(s => s.sessionId !== decoded.sessionId);
          saveSessions(remaining);
        });
      }
    } catch (e) {
      // ignore invalid token on logout
    }
  }

  res.clearCookie('qa_token', { path: '/' });
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
    const users = await getUsers();
    const user = users.find(u => u.id === req.userId);
    if (!user) return res.status(404).json({ ok: false, msg: 'User not found' });

    if (name) {
      const sanitizedName = sanitizeInput(name);
      if (sanitizedName.length < 2 || sanitizedName.length > 80) {
        return res.status(400).json({ ok: false, msg: 'Name must be 2-80 characters' });
      }
      user.name = sanitizedName;
      user.avatar = sanitizedName.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ ok: false, msg: 'Current password required' });
      }
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return res.status(400).json({ ok: false, msg: 'Current password incorrect' });
      }
      if (newPassword.length < 8 || newPassword.length > 128) {
        return res.status(400).json({ ok: false, msg: 'New password must be 8-128 characters' });
      }
      user.password = await bcrypt.hash(newPassword, 12);
    }

    await saveUsers(users);
    logger.info('Profile updated', { userId: user.id });
    
    res.json({
      ok: true, msg: 'Profile updated',
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }
    });
  } catch (e) {
    logger.error('Profile update error:', { error: e.message });
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});

// ===================== MANAGER: USER MANAGEMENT =====================

// GET /api/users — list all users (manager only)
app.get('/api/users', authMiddleware, managerOnly, async (req, res) => {
  try {
    const users = (await getUsers()).map(u => ({
      id: u.id, name: u.name, email: u.email,
      role: u.role, status: u.status,
      createdAt: u.createdAt, lastLogin: u.lastLogin,
      approvedBy: u.approvedBy, approvedAt: u.approvedAt,
      avatar: u.avatar
    }));
    res.json({ ok: true, users });
  } catch (e) {
    logger.error('Get users error:', { error: e.message });
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});

// GET /api/users/pending — pending approvals (manager only)
app.get('/api/users/pending', authMiddleware, managerOnly, async (req, res) => {
  try {
    const users = await getUsers();
    const pending = users
      .filter(u => u.status === 'pending')
      .map(u => ({
        id: u.id, name: u.name, email: u.email,
        role: u.role, createdAt: u.createdAt, avatar: u.avatar
      }));
    res.json({ ok: true, users: pending, count: pending.length });
  } catch (e) {
    logger.error('Get pending users error:', { error: e.message });
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});

// POST /api/users/:id/approve — approve user (manager only)
app.post('/api/users/:id/approve', authMiddleware, managerOnly, async (req, res) => {
  try {
    const users = await getUsers();
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ ok: false, msg: 'User not found' });
    if (user.status === 'approved') return res.json({ ok: true, msg: 'Already approved' });

    user.status = 'approved';
    user.approvedBy = req.user.name;
    user.approvedAt = new Date().toISOString();
    await saveUsers(users);
    
    logger.info('User approved', { targetUserId: user.id, byUser: req.user.id });
    res.json({ ok: true, msg: user.name + ' approved' });
  } catch (e) {
    logger.error('Approve user error:', { error: e.message });
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});

// POST /api/users/:id/reject — reject user (manager only)
app.post('/api/users/:id/reject', authMiddleware, managerOnly, async (req, res) => {
  try {
    const users = await getUsers();
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ ok: false, msg: 'User not found' });

    user.status = 'rejected';
    await saveUsers(users);
    
    logger.info('User rejected', { targetUserId: user.id, byUser: req.user.id });
    res.json({ ok: true, msg: user.name + ' rejected' });
  } catch (e) {
    logger.error('Reject user error:', { error: e.message });
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});

// POST /api/users/:id/suspend — suspend user (manager only)
app.post('/api/users/:id/suspend', authMiddleware, managerOnly, async (req, res) => {
  try {
    const users = await getUsers();
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ ok: false, msg: 'User not found' });
    if (user.id === req.userId) return res.status(400).json({ ok: false, msg: 'Cannot suspend yourself' });

    user.status = 'suspended';
    await saveUsers(users);
    
    // Invalidate all sessions for suspended user
    let sessions = await getSessions();
    sessions = sessions.filter(s => s.userId !== user.id);
    await saveSessions(sessions);
    
    logger.info('User suspended', { targetUserId: user.id, byUser: req.user.id });
    res.json({ ok: true, msg: user.name + ' suspended' });
  } catch (e) {
    logger.error('Suspend user error:', { error: e.message });
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});

// POST /api/users/:id/activate — reactivate user (manager only)
app.post('/api/users/:id/activate', authMiddleware, managerOnly, async (req, res) => {
  try {
    const users = await getUsers();
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ ok: false, msg: 'User not found' });

    user.status = 'approved';
    await saveUsers(users);
    
    logger.info('User activated', { targetUserId: user.id, byUser: req.user.id });
    res.json({ ok: true, msg: user.name + ' activated' });
  } catch (e) {
    logger.error('Activate user error:', { error: e.message });
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});

// PUT /api/users/:id/role — change role (manager only)
app.put('/api/users/:id/role', authMiddleware, managerOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['manager', 'employee'].includes(role)) {
      return res.status(400).json({ ok: false, msg: 'Invalid role' });
    }
    const users = await getUsers();
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ ok: false, msg: 'User not found' });

    // Ensure at least one manager exists
    if (user.role === 'manager' && role === 'employee') {
      const managers = users.filter(u => u.role === 'manager' && u.status === 'approved');
      if (managers.length <= 1) {
        return res.status(400).json({ ok: false, msg: 'Cannot remove last manager' });
      }
    }

    user.role = role;
    await saveUsers(users);
    
    logger.info('User role changed', { targetUserId: user.id, newRole: role, byUser: req.user.id });
    res.json({ ok: true, msg: user.name + ' is now ' + role });
  } catch (e) {
    logger.error('Change role error:', { error: e.message });
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});

// DELETE /api/users/:id — delete user (manager only)
app.delete('/api/users/:id', authMiddleware, managerOnly, async (req, res) => {
  try {
    let users = await getUsers();
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ ok: false, msg: 'User not found' });
    if (user.id === req.userId) return res.status(400).json({ ok: false, msg: 'Cannot delete yourself' });

    users = users.filter(u => u.id !== req.params.id);
    await saveUsers(users);

    // Remove user data file
    const dataFile = getUserDataFile(req.params.id);
    if (fs.existsSync(dataFile)) fs.unlinkSync(dataFile);

    // Invalidate all sessions
    let sessions = await getSessions();
    sessions = sessions.filter(s => s.userId !== user.id);
    await saveSessions(sessions);

    logger.info('User deleted', { targetUserId: user.id, byUser: req.user.id });
    res.json({ ok: true, msg: user.name + ' deleted' });
  } catch (e) {
    logger.error('Delete user error:', { error: e.message });
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});

// ===================== APP DATA ROUTES =====================

// GET /api/data — get user's app data
app.get('/api/data', authMiddleware, async (req, res) => {
  try {
    const data = await getUserData(req.userId);
    res.json({ ok: true, data: data });
  } catch (e) {
    logger.error('Get data error:', { error: e.message });
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});

// PUT /api/data — save user's app data
app.put('/api/data', authMiddleware, async (req, res) => {
  try {
    const data = req.body.data;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ ok: false, msg: 'No data provided' });
    }
    
    // Validate data structure
    const allowedKeys = ['categories', 'projects', 'currentProject', 'currentCycle', 'cycles', 'history', 'portfolio', 'automation', 'sheet', 'worksheet', 'timer', 'lastUpdatedAt'];
    const dataKeys = Object.keys(data);
    const invalidKeys = dataKeys.filter(key => !allowedKeys.includes(key));
    if (invalidKeys.length > 0) {
      return res.status(400).json({ ok: false, msg: 'Invalid data structure' });
    }
    
    data.lastUpdatedAt = new Date().toISOString();
    await saveUserData(req.userId, data);
    res.json({ ok: true, msg: 'Data saved' });
  } catch (e) {
    logger.error('Save data error:', { error: e.message });
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});

// GET /api/sessions — get active sessions (manager can see all)
app.get('/api/sessions', authMiddleware, async (req, res) => {
  try {
    let sessions = await getSessions();
    const now = new Date();
    // Filter expired
    sessions = sessions.filter(s => new Date(s.expiresAt) > now);
    await saveSessions(sessions);

    if (req.user.role !== 'manager') {
      sessions = sessions.filter(s => s.userId === req.userId);
    }
    
    // Remove sensitive info
    sessions = sessions.map(s => ({
      sessionId: s.sessionId,
      userId: s.userId,
      ip: s.ip,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      lastActivity: s.lastActivity,
      expiresAt: s.expiresAt
    }));
    
    res.json({ ok: true, sessions });
  } catch (e) {
    logger.error('Get sessions error:', { error: e.message });
    res.status(500).json({ ok: false, msg: 'Server error' });
  }
});

// ===================== HEALTH CHECK =====================
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    server: 'QA Checklist API',
    version: '2.1.0',
    uptime: process.uptime(),
    time: new Date().toISOString(),
    security: 'enhanced'
  });
});

// ===================== ERROR HANDLING =====================
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', { error: e.message, stack: e.stack });
  res.status(500).json({ ok: false, msg: 'Internal server error' });
});

// ===================== CATCH-ALL: Serve React index.html if built, else fallback to legacy index.html =====================
app.get('*', (req, res) => {
  const distIndex = path.join(__dirname, 'public', 'dist', 'index.html');
  if (fs.existsSync(distIndex)) {
    return res.sendFile(distIndex);
  }
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// ===================== START SERVER =====================
if (USE_HTTPS) {
  const httpsOptions = {
    key: fs.readFileSync(CERT_KEY_FILE),
    cert: fs.readFileSync(CERT_CERT_FILE)
  };
  https.createServer(httpsOptions, app).listen(PORT, () => {
    logger.info('Server started (HTTPS)', { port: PORT });
    console.log('');
    console.log('╔══════════════════════════════════════╗');
    console.log('║   🧪 QA Checklist Pro Server         ║');
    console.log('║   🔒 HTTPS Enabled                   ║');
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
    logger.info('Server started (HTTP)', { port: PORT });
    console.log('');
    console.log('╔══════════════════════════════════════╗');
    console.log('║   🧪 QA Checklist Pro Server         ║');
    console.log('║   ⚠️  HTTP Mode (use HTTPS in prod)  ║');
    console.log('║                                      ║');
    console.log(`║   🌐 http://localhost:${PORT}        ║`);
    console.log('║                                      ║');
    console.log('║   📧 Admin: admin@qa.com             ║');
    console.log('║   🔑 Pass:  admin123                 ║');
    console.log('║                                      ║');
    console.log('║   Roles: Manager, Employee           ║');
    console.log('║   New signups need manager approval  ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('');
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});