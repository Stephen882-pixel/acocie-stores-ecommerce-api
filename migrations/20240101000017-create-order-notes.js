'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('order_notes', {
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
      user_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'RESTRICT'
      },
      note_type: {
        type:      Sequelize.ENUM('customer_note','vendor_note','admin_note','system_note'),
        allowNull: false
      },
      content: {
        type:      Sequelize.TEXT,
        allowNull: false
      },
      is_visible_to_customer: {
        type:         Sequelize.BOOLEAN,
        allowNull:    false,
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

    await queryInterface.addIndex('order_notes', ['order_id'],  { name: 'order_notes_order_idx' });
    await queryInterface.addIndex('order_notes', ['note_type'], { name: 'order_notes_type_idx' });
    await queryInterface.addIndex('order_notes', ['created_at'],{ name: 'order_notes_created_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('order_notes');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_order_notes_note_type";');
  }
};
