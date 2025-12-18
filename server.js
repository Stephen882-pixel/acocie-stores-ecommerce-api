
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const { sequelize, testConnection } = require('./src/config/database');
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const adminRoutes = require('./src/routes/adminRoutes');


const productRoutes = require('../acocie_stores/src/routes/productRoutes');
const categoryRoutes = require('../acocie_stores/src/routes/categoryRoutes');

const app = express();

app.use(helmet())


app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials:true
}));

if(process.env.NODE_ENV === 'development'){
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}


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

app.get('/', (req,res) => {
    res.json({
        message: 'Acocie Stores API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
        auth: '/api/v1/auth',
        users: '/api/v1/users',
        admin: '/api/v1/admin',
        health: '/health'
    }
    });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use('/api/v1/products',productRoutes);
app.use('/api/v1/categories',categoryRoutes);

app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl
  });
});

app.use((err, req, res, next) => {
    console.error('Global error handler',err);

    res.status(err.status || 500).json({
        error: err.message || 'Internal Server error',
        ...(process.env.NODE_ENV === 'development' && {stack:err.stack})
    });
});


const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try{
        await testConnection();

        if(process.env.NODE_ENV === 'development'){
            await sequelize.sync({alter:false});
            console.log('Database models syncronized');
        }

        app.listen(PORT, () =>{
            console.log('\n========================================');
            console.log(` Acocie Stores API Server Running`);
            console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(` Port: ${PORT}`);
            console.log(` URL: http://localhost:${PORT}`);
            console.log(` Health: http://localhost:${PORT}/health`);
            console.log('========================================\n');
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