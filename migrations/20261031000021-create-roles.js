'use strict';

const { randomUUID } = require('crypto');

// The 5 system roles. users.role gets a foreign key to roles.name in a later migration.
const SYSTEM_ROLES = [
  { name: 'customer',       display_name: 'Customer' },
  { name: 'vendor_pending', display_name: 'Vendor (pending approval)' },
  { name: 'vendor',         display_name: 'Vendor' },
  { name: 'admin',          display_name: 'Admin' },
  { name: 'super_admin',    display_name: 'Super Admin' }
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('roles', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey:   true,
        allowNull:    false
      },
      name: {
        type:      Sequelize.STRING(50),
        allowNull: false,
        unique:    true
      },
      display_name: {
        type:      Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type:      Sequelize.TEXT,
        allowNull: true
      },
      is_system: {
        type:         Sequelize.BOOLEAN,
        allowNull:    false,
        defaultValue: false
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

    const now = new Date();
    await queryInterface.bulkInsert('roles', SYSTEM_ROLES.map((role) => ({
      id:         randomUUID(),
      ...role,
      is_system:  true,
      created_at: now,
      updated_at: now
    })));
  },

  async down(queryInterface) {
    await queryInterface.dropTable('roles');
  }
};
