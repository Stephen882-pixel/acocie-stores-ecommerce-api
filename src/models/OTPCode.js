const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OTPCode = sequelize.define('OTPCode', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    otpCode: {
      type: DataTypes.STRING(6),
      allowNull: false,
      field: 'otp_code'
    },
    purpose: {
      type: DataTypes.ENUM('signup', 'password_reset', 'email_verification'),
      allowNull: false
    },
    isUsed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_used'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at'
    }
  }, {
    tableName: 'otp_codes',
    updatedAt: false,
    indexes: [
      { fields: ['email', 'purpose'] },
      { fields: ['expires_at'] }
    ]
  });

  OTPCode.associate = (models) => {
    OTPCode.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return OTPCode;
};