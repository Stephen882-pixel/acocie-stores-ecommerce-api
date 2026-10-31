'use strict';

// Rows are inserted by the server on startup (permissionService.syncPermissions).

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('permissions', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey:   true,
        allowNull:    false
      },
      key: {
        type:      Sequelize.STRING(100),
        allowNull: false,
        unique:    true
      },
      resource: {
        type:      Sequelize.STRING(50),
        allowNull: false
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

    await queryInterface.addIndex('permissions', ['resource'], { name: 'permissions_resource_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('permissions');
  }
};
