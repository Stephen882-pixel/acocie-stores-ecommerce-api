const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Address = sequelize.define('Address', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
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
    label: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'E.g., Home, Office, etc.'
    },
    fullName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'full_name'
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    addressLine1: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'address_line1'
    },
    addressLine2: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'address_line2'
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    postalCode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'postal_code'
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'Kenya'
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_default'
    }
  }, {
    tableName: 'addresses',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['is_default'] }
    ]
  });

  Address.associate = (models) => {
    Address.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return Address;
};