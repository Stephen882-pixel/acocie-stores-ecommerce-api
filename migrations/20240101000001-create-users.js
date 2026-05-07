'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey:   true,
        allowNull:    false
      },
      first_name: {
        type:      Sequelize.STRING(50),
        allowNull: false
      },
      last_name: {
        type:      Sequelize.STRING(50),
        allowNull: false
      },
      email: {
        type:      Sequelize.STRING(100),
        allowNull: false,
        unique:    true
      },
      phone: {
        type:      Sequelize.STRING(20),
        allowNull: true,
        unique:    true
      },
      password_hash: {
        type:      Sequelize.STRING(255),
        allowNull: false
      },
      role: {
        type:         Sequelize.ENUM('customer', 'vendor', 'admin', 'super_admin'),
        allowNull:    false,
        defaultValue: 'customer'
      },
      status: {
        type:         Sequelize.ENUM('active', 'suspended', 'banned'),
        allowNull:    false,
        defaultValue: 'active'
      },
      is_verified: {
        type:         Sequelize.BOOLEAN,
        defaultValue: false
      },
      profile_completed: {
        type:         Sequelize.BOOLEAN,
        defaultValue: false
      },
      last_login_at: {
        type:      Sequelize.DATE,
        allowNull: true
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

    await queryInterface.addIndex('users', ['email'],  { name: 'users_email_idx' });
    await queryInterface.addIndex('users', ['role'],   { name: 'users_role_idx' });
    await queryInterface.addIndex('users', ['status'], { name: 'users_status_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_status";');
  }
};
