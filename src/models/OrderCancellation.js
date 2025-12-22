
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrderCancellation = sequelize.define('OrderCancellation', {
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
    type: {
      type: DataTypes.ENUM('cancellation', 'return', 'refund'),
      allowNull: false,
      comment: 'Type of request'
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'completed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Customer or admin reason'
    },
    requestedByUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'requested_by_user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    processedByUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'processed_by_user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    refundAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'refund_amount'
    },
    refundMethod: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'refund_method',
      comment: 'original_payment, store_credit, bank_transfer'
    },
    adminNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'admin_notes'
    },
    requestedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'requested_at'
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'processed_at'
    }
  }, {
    tableName: 'order_cancellations',
    indexes: [
      { fields: ['order_id'] },
      { fields: ['type'] },
      { fields: ['status'] },
      { fields: ['requested_at'] }
    ]
  });

  OrderCancellation.associate = (models) => {
    OrderCancellation.belongsTo(models.Order, {
      foreignKey: 'orderId',
      as: 'order'
    });

    OrderCancellation.belongsTo(models.User, {
      foreignKey: 'requestedByUserId',
      as: 'requestedBy'
    });

    OrderCancellation.belongsTo(models.User, {
      foreignKey: 'processedByUserId',
      as: 'processedBy'
    });
  };

  return OrderCancellation;
};
