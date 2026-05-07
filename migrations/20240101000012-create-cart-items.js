'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cart_items', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey:   true,
        allowNull:    false
      },
      cart_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'carts', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE'
      },
      product_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'products', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE'
      },
      variant_id: {
        type:       Sequelize.UUID,
        allowNull:  true,
        references: { model: 'product_variants', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'SET NULL'
      },
      quantity: {
        type:         Sequelize.INTEGER,
        allowNull:    false,
        defaultValue: 1
      },
      price_at_addition: {
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

    await queryInterface.addIndex('cart_items', ['cart_id'],    { name: 'cart_items_cart_idx' });
    await queryInterface.addIndex('cart_items', ['product_id'], { name: 'cart_items_product_idx' });
    await queryInterface.addIndex('cart_items', ['variant_id'], { name: 'cart_items_variant_idx' });
    await queryInterface.addIndex('cart_items', ['cart_id', 'product_id', 'variant_id'], {
      unique: true,
      name:   'cart_items_unique_cart_product_variant'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cart_items');
  }
};
