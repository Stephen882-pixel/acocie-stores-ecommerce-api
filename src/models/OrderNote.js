const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrderNote = sequelize.define('OrderNote', {
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
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    noteType: {
      type: DataTypes.ENUM('customer_note', 'vendor_note', 'admin_note', 'system_note'),
      allowNull: false,
      field: 'note_type'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    isVisibleToCustomer: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_visible_to_customer',
      comment: 'Private admin notes are hidden from customer'
    }
  }, {
    tableName: 'order_notes',
    indexes: [
      { fields: ['order_id'] },
      { fields: ['note_type'] },
      { fields: ['created_at'] }
    ]
  });

  OrderNote.associate = (models) => {
    OrderNote.belongsTo(models.Order, {
      foreignKey: 'orderId',
      as: 'order'
    });

    OrderNote.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return OrderNote;
};