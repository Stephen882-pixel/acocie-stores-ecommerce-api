const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrderStatusHistory = sequelize.define('OrderStatusHistory', {
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
    oldStatus: {
      type: DataTypes.ENUM(
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded'
      ),
      allowNull: true,
      field: 'old_status',
      comment: 'Null for initial status'
    },
    newStatus: {
      type: DataTypes.ENUM(
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded'
      ),
      allowNull: false,
      field: 'new_status'
    },
    changedByUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'changed_by_user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Null for system changes'
    },
    changeReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'change_reason'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'order_status_history',
    updatedAt: false,
    indexes: [
      { fields: ['order_id'] },
      { fields: ['created_at'] }
    ]
  });

  OrderStatusHistory.associate = (models) => {
    OrderStatusHistory.belongsTo(models.Order, {
      foreignKey: 'orderId',
      as: 'order'
    });

    OrderStatusHistory.belongsTo(models.User, {
      foreignKey: 'changedByUserId',
      as: 'changedBy'
    });
  };

  return OrderStatusHistory;
};