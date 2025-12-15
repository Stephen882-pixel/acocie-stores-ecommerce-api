const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OTPCode = sequelize.define(
    'OTPCode',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },

      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'user_id'
      },

      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: { isEmail: true }
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
      },

      // ✅ THIS IS THE FIX
      createdAt: {
        type: DataTypes.DATE,
        field: 'created_at'
      }
    },
    {
      tableName: 'otp_codes',
      timestamps: true,
      updatedAt: false
    }
  );

  return OTPCode;
};
