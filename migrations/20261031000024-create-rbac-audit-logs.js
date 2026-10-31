'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rbac_audit_logs', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey:   true,
        allowNull:    false
      },
      actor_id: {
        type:       Sequelize.UUID,
        allowNull:  true,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'SET NULL'
      },
      action: {
        type:      Sequelize.STRING(50),
        allowNull: false
      },
      target_type: {
        type:      Sequelize.STRING(50),
        allowNull: false
      },
      target_id: {
        type:      Sequelize.UUID,
        allowNull: false
      },
      before: {
        type:      Sequelize.JSONB,
        allowNull: true
      },
      after: {
        type:      Sequelize.JSONB,
        allowNull: true
      },
      created_at: {
        type:      Sequelize.DATE,
        allowNull: false
      }
    }, { ifNotExists: true });

    await queryInterface.addIndex('rbac_audit_logs', ['created_at'], { name: 'rbac_audit_logs_created_at_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rbac_audit_logs');
  }
};
