'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('order_items', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey:   true,
        allowNull:    false
      },
      order_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'orders', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE'
      },
      product_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'products', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'RESTRICT'
      },
      variant_id: {
        type:       Sequelize.UUID,
        allowNull:  true,
        references: { model: 'product_variants', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'SET NULL'
      },
      vendor_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'RESTRICT'
      },
      product_name: {
        type:      Sequelize.STRING(255),
        allowNull: false
      },
      variant_name: {
        type:      Sequelize.STRING(255),
        allowNull: true
      },
      sku: {
        type:      Sequelize.STRING(100),
        allowNull: false
      },
      quantity: {
        type:      Sequelize.INTEGER,
        allowNull: false
      },
      unit_price: {
        type:      Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      subtotal: {
        type:      Sequelize.DECIMAL(10, 2),
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

    await queryInterface.addIndex('order_items', ['order_id'],   { name: 'order_items_order_idx' });
    await queryInterface.addIndex('order_items', ['product_id'], { name: 'order_items_product_idx' });
    await queryInterface.addIndex('order_items', ['vendor_id'],  { name: 'order_items_vendor_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('order_items');
  }
};
