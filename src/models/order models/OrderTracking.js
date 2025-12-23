
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrderTracking = sequelize.define('OrderTracking', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'order_id',
      references: {
        model: 'orders',
        key: 'id'
      }
    },
    carrier: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'DHL, FedEx, Acocie Courier, etc.'
    },
    trackingNumber: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'tracking_number'
    },
    trackingUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'tracking_url'
    },
    estimatedDelivery: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'estimated_delivery'
    },
    currentLocation: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'current_location',
      comment: 'City, region, or facility'
    },
    trackingStatus: {
      type: DataTypes.ENUM(
        'in_transit',
        'out_for_delivery',
        'delivered',
        'failed_attempt',
        'returned'
      ),
      allowNull: true,
      field: 'tracking_status'
    },
    lastUpdated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'last_updated'
    }
  }, {
    tableName: 'order_tracking',
    indexes: [
      { fields: ['order_id'] },
      { fields: ['tracking_number'] }
    ]
  });

  OrderTracking.associate = (models) => {
    OrderTracking.belongsTo(models.Order, {
      foreignKey: 'orderId',
      as: 'order'
    });
  };

  return OrderTracking;
};