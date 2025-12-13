const { sequelize } = require('../config/database');


const UserModel = require('./User');
const OTPCodeModel = require('./OTPCode');
const RefreshTokenModel = require('./RefreshToken');
const AddressModel = require('./Address');
const LoginHistoryModel = require('./LoginHistory');

const User = UserModel(sequelize);
const OTPCode = OTPCodeModel(sequelize);
const RefreshToken = RefreshTokenModel(sequelize);
const Address = AddressModel(sequelize);
const LoginHistory = LoginHistoryModel(sequelize);


const models = {
  User,
  OTPCode,
  RefreshToken,
  Address,
  LoginHistory
};

Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = {
  sequelize,
  ...models
};