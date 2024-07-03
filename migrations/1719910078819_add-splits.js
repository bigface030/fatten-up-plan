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
  pgm.createTable('splits', {
    record_id: {
      type: 'uuid',
      notNull: true,
      references: '"records"',
      onDelete: 'cascade',
    },
    username: { type: 'varchar', notNull: true },
    amount: { type: 'numeric(12, 2)', notNull: true },
  });
  pgm.renameTypeValue('activity', 'offset', 'transfer');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('splits');
  pgm.renameTypeValue('activity', 'transfer', 'offset');
};
