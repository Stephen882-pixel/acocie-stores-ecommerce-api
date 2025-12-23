# Acocie Stores E-commerce API

A comprehensive, production-ready RESTful API for a multi-vendor e-commerce marketplace built with Express.js, PostgreSQL, and Sequelize ORM.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [User Roles](#user-roles)
- [Project Structure](#project-structure)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Features

### Core Functionality

- **User Authentication & Authorization**
  - JWT-based authentication with access and refresh tokens
  - Email verification via OTP
  - Password reset with OTP verification
  - Role-based access control (Customer, Vendor, Admin, Super Admin)
  - Login history tracking
  - Account status management

- **Product Management**
  - Multi-vendor product catalog
  - Hierarchical category system
  - Product variants (size, color, etc.)
  - Multiple product images with ordering
  - Real-time inventory tracking
  - Stock reservation system
  - Low stock alerts
  - Product search and filtering
  - Featured products

- **Shopping Experience**
  - Guest cart support (session-based)
  - Authenticated user carts
  - Cart merging on login
  - Stock validation
  - Price change detection
  - Multiple address management

- **Order Management**
  - Complete order lifecycle tracking
  - Order status management (7 statuses)
  - Shipping and delivery tracking
  - Order cancellations and returns
  - Refund processing
  - Multi-vendor order handling
  - Order notes and communication
  - Status change audit trail

- **Vendor Features**
  - Vendor dashboard
  - Product management
  - Order processing
  - Shipping management
  - Revenue analytics

- **Admin Features**
  - User management
  - Product oversight
  - Order management
  - Cancellation/return approvals
  - Refund processing
  - Platform analytics
  - Role assignment

## Technology Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Sequelize
- **Authentication:** JSON Web Tokens (JWT)
- **Password Hashing:** bcrypt
- **Email:** Nodemailer

### Security & Middleware
- **Security Headers:** Helmet.js
- **CORS:** cors
- **Logging:** Morgan
- **Input Validation:** express-validator

### Development Tools
- **Process Manager:** PM2 (recommended for production)
- **Environment Variables:** dotenv
- **API Testing:** Postman (recommended)

## Architecture

### Database Schema

The application uses 18 database tables organized into five modules:

**Authentication & User Management (5 tables)**
- users
- otp_codes
- refresh_tokens
- addresses
- login_history

**Product Catalog (5 tables)**
- categories
- products
- product_images
- product_variants
- inventory

**Shopping Cart (2 tables)**
- carts
- cart_items

**Orders (2 tables)**
- orders
- order_items

**Order Management (4 tables)**
- order_status_history
- order_tracking
- order_cancellations
- order_notes

### API Endpoints

The API provides 77+ RESTful endpoints across multiple modules:

- **Authentication:** 8 public endpoints
- **User Management:** 11 protected endpoints
- **Admin User Management:** 6 endpoints
- **Product Catalog:** 12 endpoints
- **Shopping Cart:** 7 endpoints
- **Checkout:** 3 endpoints
- **Customer Orders:** 8 endpoints
- **Vendor Orders:** 8 endpoints
- **Admin Orders:** 12+ endpoints

## Installation

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn
- Git

### Clone Repository

```bash
git clone https://github.com/Stephen882-pixel/acocie-stores-ecommerce-api.git
cd acocie-stores-ecommerce-api
```

### Install Dependencies

```bash
npm install
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=acocie_stores
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_this_in_production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email Configuration (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM="Acocie Stores <noreply@acocie.com>"

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3001

# OTP Configuration
OTP_EXPIRY_MINUTES=10
```

### Email Setup

For Gmail:
1. Enable 2-Factor Authentication
2. Generate an App Password
3. Use the App Password in `EMAIL_PASSWORD`

## Database Setup

### Create Database

```bash
# Using psql
psql -U postgres
CREATE DATABASE acocie_stores;
\q
```

### Run Migrations

The application will automatically sync models in development mode. For production, use migrations:

```bash
npm run migrate
```

### Create Admin User

Use the CLI script to create the first admin:

```bash
npm run create-admin
```

Follow the prompts to enter:
- First Name
- Last Name
- Email
- Password
- Role (admin or super_admin)

## API Documentation

### Base URL

```
http://localhost:3000/api/v1
```

### Authentication

Most endpoints require authentication via Bearer token:

```
Authorization: Bearer <your_access_token>
```

### Common Response Codes

- **200 OK:** Successful GET request
- **201 Created:** Successful POST request
- **400 Bad Request:** Invalid input
- **401 Unauthorized:** Missing or invalid token
- **403 Forbidden:** Insufficient permissions
- **404 Not Found:** Resource not found
- **409 Conflict:** Resource already exists
- **500 Internal Server Error:** Server error

### Sample Endpoints

#### Authentication

```bash
# Register
POST /api/v1/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}

# Login
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

#### Products

```bash
# Get all products
GET /api/v1/products?page=1&limit=20

# Get product by ID
GET /api/v1/products/:id

# Search products
GET /api/v1/products/search?q=iphone

# Create product (Vendor/Admin)
POST /api/v1/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "categoryId": "uuid",
  "name": "iPhone 15 Pro",
  "sku": "IP15P-001",
  "price": 999.99,
  "stockQuantity": 50
}
```

#### Shopping Cart

```bash
# Add to cart
POST /api/v1/cart/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "uuid",
  "quantity": 2
}

# Get cart
GET /api/v1/cart
Authorization: Bearer <token>
```

#### Orders

```bash
# Get order history
GET /api/v1/orders
Authorization: Bearer <token>

# Get order details
GET /api/v1/orders/:id
Authorization: Bearer <token>

# Place order
POST /api/v1/checkout/place-order
Authorization: Bearer <token>
Content-Type: application/json

{
  "shippingAddressId": "uuid",
  "paymentMethod": "cash_on_delivery"
}
```

## Authentication

### JWT Token Flow

1. **Register:** User creates account
2. **Verify OTP:** Email verification required
3. **Login:** Receive access token (15 min) and refresh token (7 days)
4. **Access API:** Use access token in Authorization header
5. **Refresh:** Use refresh token to get new access token when expired

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

## User Roles

### Customer
- Browse and search products
- Manage shopping cart
- Place orders
- Track orders
- Request cancellations/returns
- Manage profile and addresses

### Vendor
- All customer permissions
- Create and manage products
- Process orders containing their products
- Add tracking information
- View vendor analytics

### Admin
- All vendor permissions
- Manage all users
- Oversee all products
- Manage all orders
- Process cancellations and returns
- Handle refunds
- Access platform analytics

### Super Admin
- All admin permissions
- Manage other admins
- System configuration
- Full platform access

## Project Structure

```
acocie-stores-ecommerce-api/
├── src/
│   ├── config/
│   │   └── database.js
│   ├── models/
│   │   ├── index.js
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Order.js
│   │   └── ... (18 models total)
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── productController.js
│   │   ├── orderController.js
│   │   └── ... (9 controllers)
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── roleMiddleware.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── productRoutes.js
│   │   └── ... (10 route files)
│   ├── services/
│   │   └── emailService.js
│   └── utils/
│       └── authUtils.js
├── scripts/
│   └── createAdmin.js
├── seeders/
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```

## Running the Application

### Development Mode

```bash
npm run dev
```

The server will start with auto-reload on `http://localhost:3000`

### Production Mode

```bash
npm start
```

### Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-12-23T10:30:00.000Z"
}
```

## Testing

### Manual Testing

Use Postman or any API client to test endpoints. Import the collection from the repository (if available).

### Automated Testing

```bash
npm test
```

### Test Coverage

```bash
npm run test:coverage
```

## Key Features Implementation Details

### Inventory Management

The system implements a three-state inventory model:

- **Total Stock:** Physical inventory count
- **Available Stock:** Can be purchased now
- **Reserved Stock:** Held in pending checkouts/orders

**Flow:**
1. Add to cart: Validation only, no stock change
2. Initiate checkout: Available -X, Reserved +X
3. Place order: Reserved -X, Total -X
4. Cancel order: Restore inventory appropriately

### Multi-Vendor Orders

When a customer orders from multiple vendors:
- Single order record created
- Order items track individual vendors
- Each vendor sees only their items
- Status updates per vendor
- Unified customer view

### Order Status Lifecycle

```
PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
    ↓         ↓            ↓          ↓
CANCELLED  CANCELLED   CANCELLED  REFUNDED
```

### Security Measures

- Bcrypt password hashing (10 rounds)
- JWT token expiration
- Refresh token rotation
- Role-based access control
- Account status management (active/suspended/banned)
- Login attempt tracking
- Email verification required
- OTP expiration (10 minutes)

## API Rate Limiting

Consider implementing rate limiting in production:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error message description"
}
```

In development mode, stack traces are included:

```json
{
  "error": "Error message",
  "stack": "Error stack trace..."
}
```

## Email Notifications

The system sends automated emails for:
- Account verification (OTP)
- Password reset (OTP)
- Welcome message (post-verification)
- Order confirmation
- Order status updates (confirmed, processing, shipped, delivered)
- Cancellation approvals
- Refund notifications

## Performance Considerations

### Database Indexing

All foreign keys and frequently queried fields are indexed for optimal performance.

### Pagination

List endpoints support pagination:
```
GET /api/v1/products?page=1&limit=20
```

### Caching (Future Enhancement)

Consider implementing Redis caching for:
- Product listings
- Category trees
- User sessions

## Deployment

### Recommended Deployment Platforms

- **Heroku**
- **AWS (EC2 + RDS)**
- **DigitalOcean**
- **Google Cloud Platform**
- **Railway**

### Environment Variables for Production

Ensure all sensitive values are properly configured:
- Use strong, unique JWT secrets
- Configure production database credentials
- Set up production email service
- Enable HTTPS
- Set `NODE_ENV=production`

### Database Migration

Before deploying:
```bash
npm run migrate
```

### Process Manager

Use PM2 for production:
```bash
npm install -g pm2
pm2 start server.js --name acocie-api
pm2 save
pm2 startup
```

## Monitoring and Logging

### Recommended Tools

- **Application Monitoring:** New Relic, Datadog
- **Error Tracking:** Sentry
- **Log Management:** Loggly, Papertrail
- **Uptime Monitoring:** UptimeRobot, Pingdom

## Future Enhancements

### Planned Features

- Payment gateway integration (Stripe, PayPal, M-Pesa)
- Wishlist functionality
- Product reviews and ratings
- Advanced search with Elasticsearch
- Real-time notifications (WebSockets)
- SMS notifications
- Analytics dashboard
- Recommendation engine
- Coupon and discount system
- Multi-currency support
- Multi-language support

### Scalability Roadmap

- Redis caching layer
- CDN integration for static assets
- Database read replicas
- Microservices architecture
- Message queue system (RabbitMQ/Kafka)
- Kubernetes deployment

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Coding Standards

- Use ES6+ JavaScript features
- Follow existing code structure
- Write meaningful commit messages
- Include comments for complex logic
- Update documentation as needed

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Verify credentials
psql -U postgres -d acocie_stores
```

### Email Not Sending

- Verify SMTP credentials
- Check firewall settings
- Enable "Less secure app access" for Gmail (or use App Password)

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review API responses for error details

## License

This project is licensed under the ISC License.

## Acknowledgments

- Built with Express.js
- Database powered by PostgreSQL
- ORM by Sequelize
- Authentication via JWT

## Contact

**Developer:** Stephen Ondeyo  
**Repository:** [https://github.com/Stephen882-pixel/acocie-stores-ecommerce-api](https://github.com/Stephen882-pixel/acocie-stores-ecommerce-api)

---

**Version:** 1.0.0  
**Last Updated:** December 2024  
**Status:** Active Development