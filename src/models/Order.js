const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'order_number',
      comment: 'Human-readable order number: ORD-2024-00001'
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
    status: {
      type: DataTypes.ENUM(
        'pending',
        'confirmed', 
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded'
      ),
      defaultValue: 'pending',
      allowNull: false
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
      defaultValue: 'pending',
      allowNull: false,
      field: 'payment_status'
    },
    shippingAddressId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'shipping_address_id',
      references: {
        model: 'addresses',
        key: 'id'
      }
    },
    billingAddressId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'billing_address_id',
      references: {
        model: 'addresses',
        key: 'id'
      },
      comment: 'Same as shipping if null'
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Sum of all item subtotals'
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'tax_amount'
    },
    shippingCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'shipping_cost'
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'discount_amount'
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'total_amount',
      comment: 'subtotal + tax + shipping - discount'
    },
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'payment_method',
      comment: 'e.g., card, mpesa, cash_on_delivery'
    },
    paymentReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'payment_reference',
      comment: 'Payment gateway transaction ID'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Customer notes/instructions'
    },
    confirmedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'confirmed_at'
    },
    shippedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'shipped_at'
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'delivered_at'
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'cancelled_at'
    }
  }, {
    tableName: 'orders',
    indexes: [
      { fields: ['order_number'] },
      { fields: ['user_id'] },
      { fields: ['status'] },
      { fields: ['payment_status'] },
      { fields: ['created_at'] }
    ]
  });

  Order.associate = (models) => {
    Order.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    Order.belongsTo(models.Address, {
      foreignKey: 'shippingAddressId',
      as: 'shippingAddress'
    });

    Order.belongsTo(models.Address, {
      foreignKey: 'billingAddressId',
      as: 'billingAddress'
    });

    Order.hasMany(models.OrderItem, {
      foreignKey: 'orderId',
      as: 'items',
      onDelete: 'CASCADE'
    });
  };


  Order.generateOrderNumber = async () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const count = await Order.count({
      where: {
        createdAt: {
          [sequelize.Sequelize.Op.gte]: new Date(year, date.getMonth(), 1)
        }
      }
    });
    
    const orderNum = String(count + 1).padStart(5, '0');
    return `ORD-${year}${month}-${orderNum}`;
  };

  return Order;
};