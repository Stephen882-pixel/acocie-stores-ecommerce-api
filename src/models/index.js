const { sequelize } = require('../config/database');


const UserModel = require('./auth models/User');
const OTPCodeModel = require('./auth models/OTPCode');
const RefreshTokenModel = require('./auth models/RefreshToken');
const AddressModel = require('./auth models/Address');
const LoginHistoryModel = require('./auth models/LoginHistory');


const CategoryModel = require('./category models/Category');
const ProductModel = require('./product models/Product');
const ProductImageModel = require('./product models/ProductImage');
const ProductVariantModel = require('./product models/ProductVariant');
const InventoryModel = require('./checkout models/Inventory');

const CartModel = require('./cart models/Cart');
const CartItemModel = require('./cart models/CartItem');
const OrderModel = require('./order models/Order');
const OrderItemModel = require('./order models/OrderItem');

const OrderStatusHistoryModel = require('./order models/OrderStatusHistory');
const OrderTrackingModel = require('./order models/OrderTracking');
const OrderCancellationModel = require('./order models/OrderCancellation');
const OrderNoteModel = require('./order models/OrderNote');

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

const Cart = CartModel(sequelize);
const CartItem = CartItemModel(sequelize);
const Order = OrderModel(sequelize);
const OrderItem = OrderItemModel(sequelize);

const OrderStatusHistory = OrderStatusHistoryModel(sequelize);
const OrderTracking = OrderTrackingModel(sequelize);
const OrderCancellation = OrderCancellationModel(sequelize);
const OrderNote = OrderNoteModel(sequelize);




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
  Inventory,
  Cart,
  CartItem,
  Order,
  OrderItem,
  OrderStatusHistory,
  OrderTracking,
  OrderCancellation,
  OrderNote
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

