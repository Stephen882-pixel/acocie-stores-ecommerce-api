

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Inventory = sequelize.define('Inventory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'product_id',
      references: {
        model: 'products',
        key: 'id'
      }
    },
    totalStock: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_stock',
      validate: {
        min: 0
      }
    },
    availableStock: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'available_stock',
      validate: {
        min: 0
      }
    },
    reservedStock: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'reserved_stock',
      comment: 'Stock in pending orders'
    },
    lowStockAlert: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'low_stock_alert'
    },
    lastRestockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_restocked_at'
    }
  }, {
    tableName: 'inventory',
    indexes: [
      { fields: ['product_id'] },
      { fields: ['low_stock_alert'] }
    ]
  });

  Inventory.associate = (models) => {
    Inventory.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product'
    });
  };

  return Inventory;
};