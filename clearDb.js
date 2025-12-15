const { sequelize, Address, LoginHistory,OTPCode,RefreshToken,User } = require('../acocie_stores/src/models'); 

async function clearDatabase() {
  try {
    await sequelize.sync({ force: true });
    console.log('Database cleared successfully!');
  } catch (error) {
    console.error('Error clearing the database:', error);
  } finally {
    await sequelize.close();
  }
}

clearDatabase();

