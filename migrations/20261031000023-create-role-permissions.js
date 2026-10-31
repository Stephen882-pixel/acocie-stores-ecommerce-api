'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('role_permissions', {
      role_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        primaryKey: true,
        references: { model: 'roles', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE'
      },
      permission_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        primaryKey: true,
        references: { model: 'permissions', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE'
      },
      created_at: {
        type:      Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type:      Sequelize.DATE,
        allowNull: false
      }
    }, { ifNotExists: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('role_permissions');
  }
};
