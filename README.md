# Acocie Stores - E-commerce Platform API

Enterprise-scale e-commerce platform built with Express.js, Sequelize ORM, and PostgreSQL.

## 🚀 Features

### Authentication & Authorization
- ✅ JWT-based authentication (access + refresh tokens)
- ✅ Role-based access control (Customer, Vendor, Admin, Super Admin)
- ✅ OTP verification for signup and password reset
- ✅ Email verification system
- ✅ Password strength validation
- ✅ Login history tracking
- ✅ Session management

### User Management
- ✅ User profiles with CRUD operations
- ✅ Multiple address management
- ✅ Account status control (active, suspended, banned)
- ✅ Profile completion tracking
- ✅ Self-service account deletion

### Admin Features
- ✅ User management dashboard
- ✅ Role assignment and modification
- ✅ Account status management
- ✅ User statistics and analytics
- ✅ Search and filter users

### Security
- ✅ Bcrypt password hashing
- ✅ Helmet.js security headers
- ✅ CORS configuration
- ✅ JWT token expiration
- ✅ Protected routes with middleware

## 📋 Prerequisites

- Node.js >= 16.x
- PostgreSQL >= 12.x
- npm or yarn
- SMTP server (for emails)

## 🛠️ Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/acocie-stores.git
cd acocie-stores
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup PostgreSQL database
```bash
# Create database
createdb acocie_stores

# Or using psql
psql -U postgres
CREATE DATABASE acocie_stores;
\q
```

### 4. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 5. Run database migrations (optional - auto-sync in dev mode)
```bash
npm run migrate
```

### 6. Start the server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## 📁 Project Structure

```
acocie-stores/
├── src/
│   ├── config/
│   │   └── database.js          # Sequelize configuration
│   ├── models/
│   │   ├── index.js             # Models index
│   │   ├── User.js              # User model
│   │   ├── OTPCode.js           # OTP codes model
│   │   ├── RefreshToken.js      # Refresh tokens
│   │   ├── Address.js           # User addresses
│   │   └── LoginHistory.js      # Login tracking
│   ├── controllers/
│   │   ├── authController.js    # Authentication logic
│   │   ├── userController.js    # User management
│   │   └── adminController.js   # Admin operations
│   ├── middleware/
│   │   ├── authMiddleware.js    # JWT verification
│   │   └── roleMiddleware.js    # Role-based access
│   ├── routes/
│   │   ├── authRoutes.js        # Auth endpoints
│   │   ├── userRoutes.js        # User endpoints
│   │   └── adminRoutes.js       # Admin endpoints
│   ├── services/
│   │   └── emailService.js      # Email sending
│   └── utils/
│       └── authUtils.js         # Auth utilities
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── server.js
```

## 🔌 API Endpoints

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | No |
| POST | `/verify-otp` | Verify email OTP | No |
| POST | `/login` | User login | No |
| POST | `/refresh-token` | Refresh access token | No |
| POST | `/forgot-password` | Request password reset | No |
| POST | `/verify-reset-otp` | Verify reset OTP | No |
| POST | `/reset-password` | Reset password | No |
| POST | `/logout` | Logout user | Yes |
| POST | `/change-password` | Change password | Yes |

### User Management (`/api/v1/users`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/profile` | Get user profile | Yes |
| PUT | `/profile` | Update profile | Yes |
| DELETE | `/delete` | Delete account | Yes |
| GET | `/addresses` | Get all addresses | Yes |
| POST | `/addresses` | Add new address | Yes |
| PUT | `/addresses/:id` | Update address | Yes |
| DELETE | `/addresses/:id` | Delete address | Yes |
| GET | `/login-history` | Get login history | Yes |

### Admin (`/api/v1/admin`)

| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| GET | `/users` | Get all users | Yes | Admin |
| GET | `/users/:id` | Get user by ID | Yes | Admin |
| PUT | `/users/:id/status` | Update user status | Yes | Admin |
| PUT | `/users/:id/role` | Update user role | Yes | Admin |
| DELETE | `/users/:id` | Delete user | Yes | Admin |
| GET | `/dashboard/stats` | Get dashboard stats | Yes | Admin |

## 🔐 User Roles

1. **Customer** (default)
   - Basic shopping features
   - Manage own profile and addresses
   - View order history

2. **Vendor**
   - All customer permissions
   - Manage products (coming in Phase 2)
   - View vendor dashboard

3. **Admin**
   - All vendor permissions
   - Manage users
   - View platform analytics
   - Moderate content

4. **Super Admin**
   - All admin permissions
   - System configuration
   - Manage admins
   - Full platform access

## 📧 Email Templates

The system sends the following emails:
- Signup verification OTP
- Password reset OTP
- Welcome email (after verification)

Configure your SMTP settings in `.env` to enable email functionality.

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 🔒 Security Best Practices

1. **Never commit `.env` file** - Contains sensitive credentials
2. **Use strong JWT secrets** - Generate random, complex strings
3. **Enable HTTPS in production** - Use SSL/TLS certificates
4. **Rate limiting** - Implement rate limiting for auth endpoints
5. **Database backups** - Regular automated backups
6. **Monitor logs** - Set up logging and monitoring
7. **Update dependencies** - Regular security updates

## 🚀 Deployment

### Environment Variables for Production

```bash
NODE_ENV=production
PORT=3000
DB_HOST=your-db-host
DB_NAME=acocie_stores_prod
DB_USER=your-db-user
DB_PASSWORD=strong-password
JWT_SECRET=very-strong-random-secret
JWT_REFRESH_SECRET=another-strong-secret
FRONTEND_URL=https://your-domain.com
```

### Database Migrations

```bash
# Run migrations
npm run migrate

# Rollback migration
npm run migrate:undo
```

## 📝 Next Steps (Upcoming Phases)

- Phase 2: Product Catalog Management
- Phase 3: Shopping Cart & Wishlist
- Phase 4: Order Management
- Phase 5: Payment Integration
- Phase 6: Vendor Dashboard
- Phase 7: Reviews & Ratings
- Phase 8: Search & Filters (Elasticsearch)
- Phase 9: Real-time Notifications
- Phase 10: Analytics Dashboard
- Phase 11: Recommendation Engine
- Phase 12: Global Scaling & Microservices

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 📞 Support

For support, email support@acocie.com or open an issue on GitHub.

---

**Built with ❤️ for Acocie Stores**