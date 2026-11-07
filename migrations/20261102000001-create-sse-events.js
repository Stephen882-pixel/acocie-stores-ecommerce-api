'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sse_events', {
      id: {
        type:          Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey:    true,
        allowNull:     false
      },
      event: {
        type:      Sequelize.STRING(100),
        allowNull: false
      },
      feature: {
        type:      Sequelize.STRING(50),
        allowNull: false
      },
      level: {
        type:      Sequelize.STRING(10),
        allowNull: false
      },
      audience: {
        type:      Sequelize.ENUM('user', 'role', 'all'),
        allowNull: false
      },
      user_id: {
        type:       Sequelize.UUID,
        allowNull:  true,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE'
      },
      role: {
        type:      Sequelize.STRING(50),
        allowNull: true
      },
      data: {
        type:      Sequelize.JSONB,
        allowNull: false
      },
      created_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.literal('now()')
      }
    }, { ifNotExists: true });

    await queryInterface.addConstraint('sse_events', {
      type:   'check',
      name:   'sse_events_audience_target_chk',
      fields: ['audience'],
      where:  Sequelize.literal(
        "(audience = 'user' AND user_id IS NOT NULL AND role IS NULL) OR " +
        "(audience = 'role' AND role IS NOT NULL AND user_id IS NULL) OR " +
        "(audience = 'all' AND user_id IS NULL AND role IS NULL)"
      )
    });

    await queryInterface.addIndex('sse_events', ['user_id', 'created_at'], { name: 'sse_events_user_id_created_at_idx' });
    await queryInterface.addIndex('sse_events', ['role', 'created_at'],    { name: 'sse_events_role_created_at_idx' });
    await queryInterface.addIndex('sse_events', ['created_at'],            { name: 'sse_events_created_at_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sse_events');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sse_events_audience";');
  }
};
