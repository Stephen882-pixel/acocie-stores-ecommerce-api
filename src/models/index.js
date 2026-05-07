const { sequelize } = require('../config/database');


const UserModel = require('../components/auth/models/User');
const OTPCodeModel = require('../components/auth/models/OTPCode');
const RefreshTokenModel = require('../components/auth/models/RefreshToken');
const AddressModel = require('../components/auth/models/Address');
const LoginHistoryModel = require('../components/auth/models/LoginHistory');


const CategoryModel = require('../components/category/models/Category');
const ProductModel = require('../components/product/models/Product');
const ProductImageModel = require('../components/product/models/ProductImage');
const ProductVariantModel = require('../components/product/models/ProductVariant');
const InventoryModel = require('../components/checkout/models/Inventory');

const CartModel = require('../components/cart/models/Cart');
const CartItemModel = require('../components/cart/models/CartItem');
const OrderModel = require('../components/orders/models/Order');
const OrderItemModel = require('../components/orders/models/OrderItem');

const OrderStatusHistoryModel = require('../components/orders/models/OrderStatusHistory');
const OrderTrackingModel = require('../components/orders/models/OrderTracking');
const OrderCancellationModel = require('../components/orders/models/OrderCancellation');
const OrderNoteModel = require('../components/orders/models/OrderNote');

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

