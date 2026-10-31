const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Permission = sequelize.define('Permission', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    resource: {
      type: DataTypes.STRING(50),
      allowNull: false
    }
  }, {
    tableName: 'permissions',
    indexes: [
      { fields: ['resource'] }
    ]
  });

  return Permission;
};
