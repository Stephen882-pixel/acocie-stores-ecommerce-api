const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RbacAuditLog = sequelize.define('RbacAuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    actorId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'actor_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    targetType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'target_type'
    },
    targetId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'target_id'
    },
    before: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    after: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'rbac_audit_logs',
    updatedAt: false,
    indexes: [
      { fields: ['created_at'] }
    ]
  });

  return RbacAuditLog;
};
