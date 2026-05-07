'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('login_history', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey:   true,
        allowNull:    false
      },
      user_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE'
      },
      ip_address: {
        type:      Sequelize.STRING(45),
        allowNull: true
      },
      user_agent: {
        type:      Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type:         Sequelize.ENUM('success', 'failed'),
        allowNull:    false,
        defaultValue: 'success'
      },
      login_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.NOW
      }
    }, { ifNotExists: true });

    await queryInterface.addIndex('login_history', ['user_id'],  { name: 'login_history_user_idx' });
    await queryInterface.addIndex('login_history', ['login_at'], { name: 'login_history_at_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('login_history');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_login_history_status";');
  }
};
