
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrderItem = sequelize.define('OrderItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'order_id',
      references: {
        model: 'orders',
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
      },
      comment: 'Reference to original product'
    },
    variantId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'variant_id',
      references: {
        model: 'product_variants',
        key: 'id'
      }
    },
    vendorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'vendor_id',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'For multi-vendor order splitting'
    },
    productName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'product_name',
      comment: 'Snapshot at purchase time'
    },
    variantName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'variant_name',
      comment: 'Snapshot at purchase time'
    },
    sku: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Snapshot at purchase time'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'unit_price',
      comment: 'Price per unit at purchase time'
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'quantity × unit_price'
    }
  }, {
    tableName: 'order_items',
    indexes: [
      { fields: ['order_id'] },
      { fields: ['product_id'] },
      { fields: ['vendor_id'] }
    ]
  });

  OrderItem.associate = (models) => {
    OrderItem.belongsTo(models.Order, {
      foreignKey: 'orderId',
      as: 'order'
    });

    OrderItem.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product'
    });

    OrderItem.belongsTo(models.ProductVariant, {
      foreignKey: 'variantId',
      as: 'variant'
    });

    OrderItem.belongsTo(models.User, {
      foreignKey: 'vendorId',
      as: 'vendor'
    });
  };

  return OrderItem;
};