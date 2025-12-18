const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Cart = sequelize.define('Cart', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      unique: true,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Null for guest carts'
    },
    sessionId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      field: 'session_id',
      comment: 'For guest carts, generated UUID'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at',
      comment: 'Guest carts expire after 7 days'
    }
  }, {
    tableName: 'carts',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['session_id'] },
      { fields: ['expires_at'] }
    ],
    validate: {
      eitherUserOrSession() {
        if (!this.userId && !this.sessionId) {
          throw new Error('Cart must have either userId or sessionId');
        }
      }
    }
  });

  Cart.associate = (models) => {
    Cart.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    Cart.hasMany(models.CartItem, {
      foreignKey: 'cartId',
      as: 'items',
      onDelete: 'CASCADE'
    });
  };

  return Cart;
};