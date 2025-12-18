
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CartItem = sequelize.define('CartItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    cartId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'cart_id',
      references: {
        model: 'carts',
        key: 'id'
      }
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'product_id',
      references: {
        model: 'products',
        key: 'id'
      }
    },
    variantId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'variant_id',
      references: {
        model: 'product_variants',
        key: 'id'
      },
      comment: 'Null if product has no variants'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1
      }
    },
    priceAtAddition: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'price_at_addition',
      comment: 'Price snapshot when added to cart'
    }
  }, {
    tableName: 'cart_items',
    indexes: [
      { fields: ['cart_id'] },
      { fields: ['product_id'] },
      { fields: ['variant_id'] },
      { 
        unique: true, 
        fields: ['cart_id', 'product_id', 'variant_id'],
        name: 'unique_cart_product_variant'
      }
    ]
  });

  CartItem.associate = (models) => {
    CartItem.belongsTo(models.Cart, {
      foreignKey: 'cartId',
      as: 'cart'
    });

    CartItem.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product'
    });

    CartItem.belongsTo(models.ProductVariant, {
      foreignKey: 'variantId',
      as: 'variant'
    });
  };

  return CartItem;
};