const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RefreshToken = sequelize.define('RefreshToken', {
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
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at'
    }
  }, {
    tableName: 'refresh_tokens',
    updatedAt: false,
    indexes: [
      { fields: ['token'] },
      { fields: ['user_id'] },
      { fields: ['expires_at'] }
    ]
  });

  RefreshToken.associate = (models) => {
    RefreshToken.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return RefreshToken;
};
