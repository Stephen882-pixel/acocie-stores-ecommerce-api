const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SseEvent = sequelize.define('SseEvent', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    event: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    feature: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    level: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    audience: {
      type: DataTypes.ENUM('user', 'role', 'all'),
      allowNull: false
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
    role: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: false
    }
  }, {
    tableName: 'sse_events',
    updatedAt: false
  });

  return SseEvent;
};
