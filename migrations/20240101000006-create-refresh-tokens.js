'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('refresh_tokens', {
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
      token: {
        type:      Sequelize.TEXT,
        allowNull: false,
        unique:    true
      },
      expires_at: {
        type:      Sequelize.DATE,
        allowNull: false
      },
      created_at: {
        type:      Sequelize.DATE,
        allowNull: false
      }
    }, { ifNotExists: true });

    await queryInterface.addIndex('refresh_tokens', ['token'],      { name: 'refresh_tokens_token_idx' });
    await queryInterface.addIndex('refresh_tokens', ['user_id'],    { name: 'refresh_tokens_user_idx' });
    await queryInterface.addIndex('refresh_tokens', ['expires_at'], { name: 'refresh_tokens_exp_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('refresh_tokens');
  }
};
