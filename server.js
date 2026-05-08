
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { apiReference } = require('@scalar/express-api-reference');
const openApiSpec = require('./src/docs/openapi.config');
require('dotenv').config();

const { sequelize, testConnection } = require('./src/config/database');
const authRoutes = require('./src/components/auth/routes/authRoutes');
const userRoutes = require('./src/components/auth/routes/userRoutes');
const adminRoutes = require('./src/components/auth/routes/adminRoutes');
const productRoutes = require('./src/components/product/routes/productRoutes');
const categoryRoutes = require('./src/components/category/routes/categoryRoutes');
const cartRoutes = require('./src/components/cart/routes/cartRoutes');
const checkoutRoutes = require('./src/components/checkout/routes/checkoutRoutes');

const orderRoutes = require('./src/components/orders/routes/orderRoutes');
const vendorOrderRoutes = require('./src/components/orders/routes/vendorOrderRoutes');
const adminOrderRoutes = require('./src/components/orders/routes/adminOrderRoutes');

const app = express();

app.use(helmet())

// Scalar API docs — relax helmet's CSP only on the docs route
app.use('/api-docs', (req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' fonts.googleapis.com cdn.jsdelivr.net; font-src 'self' fonts.gstatic.com; img-src 'self' data:; connect-src 'self'"
    );
    next();
}, apiReference({ spec: { content: openApiSpec }, theme: 'purple' }));


app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials:true
}));

// Custom request logger
const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const DIM   = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED   = '\x1b[31m';
const CYAN  = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const WHITE = '\x1b[37m';

const statusColor = (status) => {
    if (status >= 500) return RED;
    if (status >= 400) return YELLOW;
    if (status >= 300) return CYAN;
    return GREEN;
};

const methodColor = (method) => {
    const colors = { GET: CYAN, POST: GREEN, PUT: YELLOW, PATCH: YELLOW, DELETE: RED };
    return colors[method] || WHITE;
};

morgan.token('formatted-date', () => {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
});

app.use(morgan((tokens, req, res) => {
    const method   = tokens.method(req, res);
    const url      = tokens.url(req, res);
    const status   = parseInt(tokens.status(req, res), 10);
    const ms       = tokens['response-time'](req, res);
    const time     = tokens['formatted-date'](req, res);

    return [
        `${DIM}[${time}]${RESET}`,
        `${BOLD}${methodColor(method)}${method.padEnd(7)}${RESET}`,
        `${WHITE}${url}${RESET}`,
        `${BOLD}${statusColor(status)}${status}${RESET}`,
        `${DIM}${ms} ms${RESET}`
    ].join('  ');
}));


app.use(express.json());
app.use(express.urlencoded({
    extended:true
}));


app.set('trust proxy',1);



app.get('/health', async(req,res) => {
    try{
        await sequelize.authenticate();
        res.json({
            status:'healthy',
            database:'connected',
            timestamp:new Date().toISOString()
        });
    } catch (error){
        res.status(500).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message
        });
    }
});

app.get('/', (req, res) => {
  res.json({
    message: 'Acocie Stores API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      admin: '/api/v1/admin',
      products: '/api/v1/products',
      categories: '/api/v1/categories',
      cart: '/api/v1/cart',              
      checkout: '/api/v1/checkout',   
      orders: '/api/v1/orders',              
      vendor: '/api/v1/vendor',              
      adminOrders: '/api/v1/admin-orders',   
      health: '/health',
      docs: '/api-docs'
    }
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use('/api/v1/products',productRoutes);
app.use('/api/v1/categories',categoryRoutes);

app.use('/api/v1/cart',cartRoutes);
app.use('/api/v1/checkout',checkoutRoutes);

app.use('/api/v1/orders',orderRoutes);
app.use('/api/v1/vendor',vendorOrderRoutes);
app.use('/api/v1/admin-orders',adminOrderRoutes);

app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl
  });
});

app.use((err, req, res, next) => {
    console.error(`${RED}${BOLD}[ERROR]${RESET} ${err.message}`);
    if (err.stack && process.env.NODE_ENV === 'development') {
        console.error(`${DIM}${err.stack}${RESET}`);
    }
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server error',
        ...(process.env.NODE_ENV === 'development' && {stack:err.stack})
    });
});


const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try{
        await testConnection();

        app.listen(PORT, () =>{
            const env = process.env.NODE_ENV || 'development';
            console.log(`\n${BOLD}${CYAN}  ╔══════════════════════════════════════╗${RESET}`);
            console.log(`${BOLD}${CYAN}  ║      Acocie Stores API Server        ║${RESET}`);
            console.log(`${BOLD}${CYAN}  ╚══════════════════════════════════════╝${RESET}`);
            console.log(`  ${DIM}Environment${RESET}  ${BOLD}${env}${RESET}`);
            console.log(`  ${DIM}Port        ${RESET}  ${BOLD}${GREEN}${PORT}${RESET}`);
            console.log(`  ${DIM}URL         ${RESET}  ${CYAN}http://localhost:${PORT}${RESET}`);
            console.log(`  ${DIM}Health      ${RESET}  ${CYAN}http://localhost:${PORT}/health${RESET}`);
            console.log(`  ${DIM}API Docs    ${RESET}  ${CYAN}http://localhost:${PORT}/api-docs${RESET}`);
            console.log(`  ${DIM}Started at  ${RESET}  ${new Date().toLocaleTimeString()}\n`);
        });
    } catch(error){
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

module.exports = app;