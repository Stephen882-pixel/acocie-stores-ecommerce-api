
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'acocie_stores',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  // RDS requires SSL — only enabled in production to keep local dev simple
  ...(process.env.NODE_ENV === 'production' && {
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false }
    }
  })
});

const testConnection = async () =>{
    try{
        await sequelize.authenticate();
        console.log('  \x1b[32m\u2714\x1b[0m  Database connected');
    }catch(error){
        console.error('  \x1b[31m\u2717\x1b[0m  Database connection failed:', error.message);
        process.exit(1);
    }
};

module.exports = { sequelize, testConnection };