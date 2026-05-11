# QA Checklist Pro v2.1.0

A professional, secure, and feature-rich QA test management application with authentication, role-based access control, and comprehensive testing capabilities.

## 🚀 Features

### Core Functionality
- **Test Execution** - Execute and track test cases with multiple status options (Passed, Failed, Blocked, Skipped, Pending)
- **Project Management** - Organize tests by projects and cycles
- **Portfolio Tracking** - Track multiple projects with status and progress
- **Automation Suite Management** - Manage automation testing efforts with topic tracking
- **Project Sheet** - Track project lifecycle with dates and milestones
- **Daily Worksheet** - Record daily activities and work logs
- **Execution History** - View historical test execution records

### User Management
- **Role-Based Access Control** - Manager and Employee roles with different permissions
- **User Approval Workflow** - New registrations require manager approval
- **Session Management** - View and manage active sessions
- **Profile Management** - Update name and password

### Security Features
- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt with 12 salt rounds
- **Rate Limiting** - Protection against brute force attacks
- **Input Sanitization** - XSS and injection prevention
- **HTTPS Support** - Optional TLS/SSL encryption
- **CSRF Protection** - Cross-site request forgery prevention
- **Content Security Policy** - CSP headers for enhanced security
- **Session Timeout** - Automatic logout after inactivity

### Export & Import
- **Multiple Formats** - Export to Excel (XLSX), CSV, Word (DOC), HTML
- **Import Support** - Import from JSON, Excel, CSV, Word/Text files
- **Drag & Drop** - Easy file import with drag and drop

### User Experience
- **Dark/Light Theme** - Toggle between themes with persistence
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Keyboard Shortcuts** - Efficient workflow with keyboard navigation
- **Real-time Search** - Filter tests by name, category, priority, status
- **Timer** - Built-in timer for test sessions
- **Toast Notifications** - Non-intrusive status messages

## 📋 Prerequisites

- Node.js 14.x or higher
- npm 6.x or higher

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Alpha2122-coding/QA-Checklist.git
   cd QA-Checklist
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Access the application**
   - Open browser to `http://localhost:3000`
   - Default admin credentials: `admin@qa.com` / `admin123`

## 🔒 Security Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | Auto-generated |
| `HTTPS_KEY` | Path to HTTPS private key | None |
| `HTTPS_CERT` | Path to HTTPS certificate | None |
| `CORS_ORIGIN` | Allowed CORS origin | `*` |
| `LOG_LEVEL` | Logging level | `info` |

### HTTPS Setup (Production)

```bash
# Generate self-signed certificate (for development)
mkdir cert
openssl req -x509 -newkey rsa:4096 -keyout cert/key.pem -out cert/cert.pem -days 365 -nodes
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all tests with coverage
npm test

# Run tests in watch mode
npm run test:watch

# Run security tests
npm run test:security
```

## 📁 Project Structure

```
QA-Checklist/
├── server.js           # Express server with API endpoints
├── package.json        # Dependencies and scripts
├── .env.example        # Environment configuration template
├── public/
│   ├── index.html      # Main HTML file
│   ├── script.js       # Client-side JavaScript
│   └── styles.css      # CSS styles with dark/light themes
├── data/
│   ├── users.json      # User database
│   ├── sessions.json   # Active sessions
│   ├── jwt_secret.txt  # JWT signing secret
│   └── appdata/        # User application data
├── logs/               # Application logs
└── tests/              # Test suite
    └── server.test.js  # Server tests
```

## 🎯 Default Data

The application comes with pre-populated test categories:

### Web Testing Categories
- Login & Authentication (20 tests)
- Registration (20 tests)
- Form Validation (30 tests)
- Navigation (20 tests)
- Data Operations (20 tests)
- Search & Filters (20 tests)
- UX & Interactions (20 tests)
- Responsive Design (16 tests)
- Browser Compatibility (15 tests)
- Accessibility (22 tests)
- Security (16 tests)
- Performance (8 tests)
- Error Handling (10 tests)
- File Upload (16 tests)
- Pagination (15 tests)
- Checkout (19 tests)
- User Profile (12 tests)
- Email (11 tests)
- i18n (10 tests)

### App Testing Categories
- Installation (11 tests)
- App Auth (12 tests)
- App Nav (10 tests)
- Offline Mode (10 tests)
- Notifications (10 tests)
- Permissions (10 tests)
- Gestures (9 tests)
- Devices (10 tests)
- Background Mode (9 tests)
- App Performance (8 tests)
- Camera (8 tests)
- Updates (5 tests)

## 🔑 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Focus search |
| `Ctrl+N` | Add new test |
| `Ctrl+E` | Export data |
| `Ctrl+S` | Save/sync data |
| `Ctrl+D` | Toggle theme |
| `Escape` | Close modals |

## 👥 User Roles

### Manager
- Approve/reject new user registrations
- Suspend/activate users
- Change user roles
- Delete users
- View all user sessions
- Access all features

### Employee
- Execute tests
- Manage own profile
- Export/import data
- View own sessions

## 🚨 Security Best Practices

1. **Change default admin password immediately**
2. **Use HTTPS in production**
3. **Set a strong JWT_SECRET in .env**
4. **Regularly update dependencies**
5. **Monitor logs for suspicious activity**
6. **Use strong passwords (8+ characters)**
7. **Enable rate limiting in production**

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### User Management (Manager Only)
- `GET /api/users` - List all users
- `GET /api/users/pending` - List pending approvals
- `POST /api/users/:id/approve` - Approve user
- `POST /api/users/:id/reject` - Reject user
- `POST /api/users/:id/suspend` - Suspend user
- `POST /api/users/:id/activate` - Activate user
- `PUT /api/users/:id/role` - Change user role
- `DELETE /api/users/:id` - Delete user

### Data Management
- `GET /api/data` - Get user's app data
- `PUT /api/data` - Save user's app data
- `GET /api/sessions` - Get active sessions

### System
- `GET /api/health` - Health check

## 🐛 Known Issues & Limitations

1. **File-based storage** - Not suitable for large-scale deployments (>100 users)
2. **No email verification** - User approval is manual
3. **No password reset** - Contact admin to reset password
4. **Single server** - No clustering support

## 🔄 Future Enhancements

- [ ] Database support (PostgreSQL, MongoDB)
- [ ] Email notifications
- [ ] Password reset via email
- [ ] Two-factor authentication
- [ ] Audit logging
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Docker support
- [ ] CI/CD pipeline
- [ ] Real-time collaboration

## 📄 License

MIT License - See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## 📧 Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/Alpha2122-coding/QA-Checklist/issues)
- Email: admin@qa.com

---

**Built with ❤️ using Node.js, Express, and vanilla JavaScript**