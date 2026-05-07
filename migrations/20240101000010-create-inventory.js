'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('inventory', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey:   true,
        allowNull:    false
      },
      product_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        unique:     true,
        references: { model: 'products', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE'
      },
      total_stock: {
        type:         Sequelize.INTEGER,
        defaultValue: 0
      },
      available_stock: {
        type:         Sequelize.INTEGER,
        defaultValue: 0
      },
      reserved_stock: {
        type:         Sequelize.INTEGER,
        defaultValue: 0
      },
      low_stock_alert: {
        type:         Sequelize.BOOLEAN,
        defaultValue: false
      },
      last_restocked_at: {
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

    await queryInterface.addIndex('inventory', ['product_id'],     { name: 'inventory_product_idx' });
    await queryInterface.addIndex('inventory', ['low_stock_alert'], { name: 'inventory_alert_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('inventory');
  }
};
