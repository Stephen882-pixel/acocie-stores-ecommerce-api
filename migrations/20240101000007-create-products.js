'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('products', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey:   true,
        allowNull:    false
      },
      vendor_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'RESTRICT'
      },
      category_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'categories', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'RESTRICT'
      },
      name: {
        type:      Sequelize.STRING(255),
        allowNull: false
      },
      slug: {
        type:      Sequelize.STRING(300),
        allowNull: false,
        unique:    true
      },
      description: {
        type:      Sequelize.TEXT,
        allowNull: true
      },
      short_description: {
        type:      Sequelize.STRING(500),
        allowNull: true
      },
      sku: {
        type:      Sequelize.STRING(100),
        allowNull: false,
        unique:    true
      },
      price: {
        type:      Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      compare_price: {
        type:      Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      cost_price: {
        type:      Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      status: {
        type:         Sequelize.ENUM('draft', 'active', 'inactive', 'out_of_stock'),
        allowNull:    false,
        defaultValue: 'draft'
      },
      is_featured: {
        type:         Sequelize.BOOLEAN,
        defaultValue: false
      },
      stock_quantity: {
        type:         Sequelize.INTEGER,
        defaultValue: 0
      },
      low_stock_threshold: {
        type:         Sequelize.INTEGER,
        defaultValue: 5
      },
      weight: {
        type:      Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      dimensions: {
        type:      Sequelize.JSONB,
        allowNull: true
      },
      tags: {
        type:         Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
      },
      meta_title: {
        type:      Sequelize.STRING(200),
        allowNull: true
      },
      meta_description: {
        type:      Sequelize.TEXT,
        allowNull: true
      },
      view_count: {
        type:         Sequelize.INTEGER,
        defaultValue: 0
      },
      sold_count: {
        type:         Sequelize.INTEGER,
        defaultValue: 0
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

    await queryInterface.addIndex('products', ['vendor_id'],   { name: 'products_vendor_idx' });
    await queryInterface.addIndex('products', ['category_id'], { name: 'products_category_idx' });
    await queryInterface.addIndex('products', ['slug'],        { name: 'products_slug_idx' });
    await queryInterface.addIndex('products', ['sku'],         { name: 'products_sku_idx' });
    await queryInterface.addIndex('products', ['status'],      { name: 'products_status_idx' });
    await queryInterface.addIndex('products', ['is_featured'], { name: 'products_featured_idx' });
    await queryInterface.addIndex('products', ['price'],       { name: 'products_price_idx' });
    await queryInterface.addIndex('products', ['created_at'],  { name: 'products_created_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('products');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_products_status";');
  }
};
