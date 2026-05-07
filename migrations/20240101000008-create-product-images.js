'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_images', {
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
      image_url: {
        type:      Sequelize.STRING(500),
        allowNull: false
      },
      alt_text: {
        type:      Sequelize.STRING(255),
        allowNull: true
      },
      is_primary: {
        type:         Sequelize.BOOLEAN,
        defaultValue: false
      },
      display_order: {
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

    await queryInterface.addIndex('product_images', ['product_id'], { name: 'product_images_product_idx' });
    await queryInterface.addIndex('product_images', ['is_primary'],  { name: 'product_images_primary_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('product_images');
  }
};
