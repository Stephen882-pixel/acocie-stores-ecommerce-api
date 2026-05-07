require('dotenv').config();

const shared = {
  username:         process.env.DB_USER     || 'postgres',
  password:         process.env.DB_PASSWORD || null,
  database:         process.env.DB_NAME     || 'acocie_stores',
  host:             process.env.DB_HOST     || 'localhost',
  port:             parseInt(process.env.DB_PORT) || 5432,
  dialect:          'postgres',
  migrationStorage: 'sequelize',
  seederStorage:    'sequelize',
  define: {
    timestamps:  true,
    underscored: true,
    createdAt:   'created_at',
    updatedAt:   'updated_at'
  }
};

module.exports = {
  development: { ...shared },
  test:        { ...shared, database: process.env.DB_NAME_TEST || 'acocie_stores_test' },
  production:  { ...shared }
};
