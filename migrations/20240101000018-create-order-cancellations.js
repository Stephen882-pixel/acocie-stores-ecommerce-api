'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('order_cancellations', {
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
      type: {
        type:      Sequelize.ENUM('cancellation', 'return', 'refund'),
        allowNull: false
      },
      status: {
        type:         Sequelize.ENUM('pending', 'approved', 'rejected', 'completed'),
        allowNull:    false,
        defaultValue: 'pending'
      },
      reason: {
        type:      Sequelize.TEXT,
        allowNull: false
      },
      requested_by_user_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'RESTRICT'
      },
      processed_by_user_id: {
        type:       Sequelize.UUID,
        allowNull:  true,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'SET NULL'
      },
      refund_amount: {
        type:      Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      refund_method: {
        type:      Sequelize.STRING(50),
        allowNull: true
      },
      admin_notes: {
        type:      Sequelize.TEXT,
        allowNull: true
      },
      requested_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.NOW
      },
      processed_at: {
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

    await queryInterface.addIndex('order_cancellations', ['order_id'],     { name: 'cancellations_order_idx' });
    await queryInterface.addIndex('order_cancellations', ['type'],         { name: 'cancellations_type_idx' });
    await queryInterface.addIndex('order_cancellations', ['status'],       { name: 'cancellations_status_idx' });
    await queryInterface.addIndex('order_cancellations', ['requested_at'], { name: 'cancellations_requested_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('order_cancellations');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_order_cancellations_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_order_cancellations_status";');
  }
};
