const { sequelize } = require('../config/database');


const UserModel = require('./User');
const OTPCodeModel = require('./OTPCode');
const RefreshTokenModel = require('./RefreshToken');
const AddressModel = require('./Address');
const LoginHistoryModel = require('./LoginHistory');


const CategoryModel = require('./Category');
const ProductModel = require('./Product');
const ProductImageModel = require('./ProductImage');
const ProductVariantModel = require('./ProductVariant');
const InventoryModel = require('./Inventory');

const User = UserModel(sequelize);
const OTPCode = OTPCodeModel(sequelize);
const RefreshToken = RefreshTokenModel(sequelize);
const Address = AddressModel(sequelize);
const LoginHistory = LoginHistoryModel(sequelize);

const Category = CategoryModel(sequelize);
const Product = ProductModel(sequelize)
const ProductImage = ProductImageModel(sequelize);
const ProductVariant = ProductVariantModel(sequelize);
const Inventory = InventoryModel(sequelize);




const models = {
  User,
  OTPCode,
  RefreshToken,
  Address,
  LoginHistory,
  Category,
  Product,
  ProductImage,
  ProductVariant,
  Inventory
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