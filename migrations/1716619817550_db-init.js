/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createTable('channels', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar', notNull: true, unique: true },
    metadata: { type: 'varchar' },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    deleted_at: { type: 'timestamptz' },
    created_by: { type: 'varchar' },
    deleted_by: { type: 'varchar' },
  });
  pgm.createType('activity', ['expenditure', 'income', 'offset']);
  pgm.createTable('records', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    channel_id: {
      type: 'uuid',
      notNull: true,
      references: '"channels"',
      onDelete: 'cascade',
    },
    accounting_date: { type: 'date', notNull: true, default: pgm.func('current_date') },
    activity: { type: 'activity', notNull: true },
    description: { type: 'varchar' },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    deleted_at: { type: 'timestamptz' },
    created_by: { type: 'varchar' },
    deleted_by: { type: 'varchar' },
  });
  pgm.createTable('transactions', {
    record_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: '"records"',
      onDelete: 'cascade',
    },
    username: { type: 'varchar', notNull: true },
    amount: { type: 'numeric(12, 2)', notNull: true },
    customized_classification: { type: 'varchar' },
    customized_tag: { type: 'varchar' },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('transactions');
  pgm.dropTable('records');
  pgm.dropTable('channels');
  pgm.dropType('activity');
};
