
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    firstName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'first_name',
      validate: {
        notEmpty: true,
        len: [2, 50]
      }
    },
    lastName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'last_name',
      validate: {
        notEmpty: true,
        len: [2, 50]
      }
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash'
    },
    role: {
      type: DataTypes.ENUM('customer', 'vendor', 'admin', 'super_admin'),
      defaultValue: 'customer',
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'suspended', 'banned'),
      defaultValue: 'active',
      allowNull: false
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_verified'
    },
    profileCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'profile_completed'
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login_at'
    }
  }, {
    tableName: 'users',
    indexes: [
      { fields: ['email'] },
      { fields: ['role'] },
      { fields: ['status'] }
    ]
  });

  User.associate = (models) => {
    User.hasMany(models.RefreshToken, {
      foreignKey: 'userId',
      as: 'refreshTokens',
      onDelete: 'CASCADE'
    });
    
    User.hasMany(models.OTPCode, {
      foreignKey: 'userId',
      as: 'otpCodes',
      onDelete: 'CASCADE'
    });
    
    User.hasMany(models.Address, {
      foreignKey: 'userId',
      as: 'addresses',
      onDelete: 'CASCADE'
    });
    
    User.hasMany(models.LoginHistory, {
      foreignKey: 'userId',
      as: 'loginHistory',
      onDelete: 'CASCADE'
    });
  };

  // Instance methods
  User.prototype.toJSON = function() {
    const values = { ...this.get() };
    delete values.passwordHash;
    return values;
  };

  return User;
};