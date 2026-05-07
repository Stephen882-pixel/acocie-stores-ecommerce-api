'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_variants', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey:   true,
        allowNull:    false
      },
      product_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'products', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE'
      },
      sku: {
        type:      Sequelize.STRING(100),
        allowNull: false,
        unique:    true
      },
      name: {
        type:      Sequelize.STRING(255),
        allowNull: false
      },
      options: {
        type:      Sequelize.JSONB,
        allowNull: false
      },
      price: {
        type:      Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      compare_price: {
        type:      Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      stock_quantity: {
        type:         Sequelize.INTEGER,
        defaultValue: 0
      },
      image_url: {
        type:      Sequelize.STRING(500),
        allowNull: true
      },
      is_active: {
        type:         Sequelize.BOOLEAN,
        defaultValue: true
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

    await queryInterface.addIndex('product_variants', ['product_id'], { name: 'variants_product_idx' });
    await queryInterface.addIndex('product_variants', ['sku'],        { name: 'variants_sku_idx' });
    await queryInterface.addIndex('product_variants', ['is_active'],  { name: 'variants_active_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('product_variants');
  }
};
