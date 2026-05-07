'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('carts', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey:   true,
        allowNull:    false
      },
      user_id: {
        type:       Sequelize.UUID,
        allowNull:  true,
        unique:     true,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE'
      },
      session_id: {
        type:      Sequelize.STRING(100),
        allowNull: true,
        unique:    true
      },
      expires_at: {
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

    await queryInterface.addIndex('carts', ['user_id'],    { name: 'carts_user_idx' });
    await queryInterface.addIndex('carts', ['session_id'], { name: 'carts_session_idx' });
    await queryInterface.addIndex('carts', ['expires_at'], { name: 'carts_expires_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('carts');
  }
};
