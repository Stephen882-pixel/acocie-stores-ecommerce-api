'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('addresses', {
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
      label: {
        type:      Sequelize.STRING(50),
        allowNull: true
      },
      full_name: {
        type:      Sequelize.STRING(100),
        allowNull: false
      },
      phone: {
        type:      Sequelize.STRING(20),
        allowNull: false
      },
      address_line1: {
        type:      Sequelize.STRING(255),
        allowNull: false
      },
      address_line2: {
        type:      Sequelize.STRING(255),
        allowNull: true
      },
      city: {
        type:      Sequelize.STRING(100),
        allowNull: false
      },
      state: {
        type:      Sequelize.STRING(100),
        allowNull: false
      },
      postal_code: {
        type:      Sequelize.STRING(20),
        allowNull: false
      },
      country: {
        type:         Sequelize.STRING(100),
        allowNull:    false,
        defaultValue: 'Kenya'
      },
      is_default: {
        type:         Sequelize.BOOLEAN,
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

    await queryInterface.addIndex('addresses', ['user_id'],    { name: 'addresses_user_idx' });
    await queryInterface.addIndex('addresses', ['is_default'], { name: 'addresses_default_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('addresses');
  }
};
