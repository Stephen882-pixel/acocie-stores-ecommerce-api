'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('categories', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey:   true,
        allowNull:    false
      },
      name: {
        type:      Sequelize.STRING(100),
        allowNull: false
      },
      slug: {
        type:      Sequelize.STRING(120),
        allowNull: false,
        unique:    true
      },
      description: {
        type:      Sequelize.TEXT,
        allowNull: true
      },
      parent_id: {
        type:       Sequelize.UUID,
        allowNull:  true,
        references: { model: 'categories', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'SET NULL'
      },
      image_url: {
        type:      Sequelize.STRING(500),
        allowNull: true
      },
      is_active: {
        type:         Sequelize.BOOLEAN,
        defaultValue: true
      },
      display_order: {
        type:         Sequelize.INTEGER,
        defaultValue: 0
      },
      meta_title: {
        type:      Sequelize.STRING(200),
        allowNull: true
      },
      meta_description: {
        type:      Sequelize.TEXT,
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

    await queryInterface.addIndex('categories', ['slug'],          { name: 'categories_slug_idx' });
    await queryInterface.addIndex('categories', ['parent_id'],     { name: 'categories_parent_idx' });
    await queryInterface.addIndex('categories', ['is_active'],     { name: 'categories_active_idx' });
    await queryInterface.addIndex('categories', ['display_order'], { name: 'categories_order_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('categories');
  }
};
