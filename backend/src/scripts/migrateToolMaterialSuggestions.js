import { pool } from '../config/db.js';

/**
 * Migration script: Enhance tool_material_suggestions table
 *
 * Adds columns to support persisting booking-specific tool and material suggestions
 * while preserving the existing knowledge-base records:
 * - booking_id INT NULL (FK -> bookings.id ON DELETE CASCADE)
 * - technician_id INT NULL (FK -> users.id ON DELETE SET NULL)
 * - suggestion_type ENUM('tool', 'material') NULL
 * - suggestion_name VARCHAR(255) NULL
 * - reason TEXT NULL
 * - Makes issue_keyword, recommended_tools, required_materials NULL-able for booking-level item rows
 */
async function migrateToolMaterialSuggestions() {
  const connection = await pool.getConnection();
  try {
    console.log('🔄 Checking tool_material_suggestions table structure...');

    // 1. Check existing columns
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'tool_material_suggestions'
    `);

    const existingCols = new Set(columns.map((c) => c.COLUMN_NAME));

    // 2. Modify existing columns to be nullable for item-level suggestion records
    console.log('🔄 Modifying legacy knowledge-base columns to allow NULLs...');
    await connection.query(`
      ALTER TABLE tool_material_suggestions
        MODIFY COLUMN issue_keyword VARCHAR(100) NULL,
        MODIFY COLUMN recommended_tools TEXT NULL,
        MODIFY COLUMN required_materials TEXT NULL
    `);

    // 3. Add booking_id if missing
    if (!existingCols.has('booking_id')) {
      console.log('➕ Adding booking_id column...');
      await connection.query(`
        ALTER TABLE tool_material_suggestions
          ADD COLUMN booking_id INT NULL AFTER id
      `);
      try {
        await connection.query(`
          ALTER TABLE tool_material_suggestions
            ADD CONSTRAINT fk_tool_suggestion_booking 
            FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
        `);
      } catch (e) {
        console.log('Notice adding fk_tool_suggestion_booking:', e.message);
      }
    }

    // 4. Add technician_id if missing
    if (!existingCols.has('technician_id')) {
      console.log('➕ Adding technician_id column...');
      await connection.query(`
        ALTER TABLE tool_material_suggestions
          ADD COLUMN technician_id INT NULL AFTER booking_id
      `);
      try {
        await connection.query(`
          ALTER TABLE tool_material_suggestions
            ADD CONSTRAINT fk_tool_suggestion_tech 
            FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL
        `);
      } catch (e) {
        console.log('Notice adding fk_tool_suggestion_tech:', e.message);
      }
    }

    // 5. Add suggestion_type if missing
    if (!existingCols.has('suggestion_type')) {
      console.log('➕ Adding suggestion_type column...');
      await connection.query(`
        ALTER TABLE tool_material_suggestions
          ADD COLUMN suggestion_type ENUM('tool', 'material') NULL AFTER technician_id
      `);
    }

    // 6. Add suggestion_name if missing
    if (!existingCols.has('suggestion_name')) {
      console.log('➕ Adding suggestion_name column...');
      await connection.query(`
        ALTER TABLE tool_material_suggestions
          ADD COLUMN suggestion_name VARCHAR(255) NULL AFTER suggestion_type
      `);
    }

    // 7. Add reason if missing
    if (!existingCols.has('reason')) {
      console.log('➕ Adding reason column...');
      await connection.query(`
        ALTER TABLE tool_material_suggestions
          ADD COLUMN reason TEXT NULL AFTER suggestion_name
      `);
    }

    // 8. Add index on booking_id if missing
    const [indexes] = await connection.query(`
      SHOW INDEX FROM tool_material_suggestions WHERE Key_name = 'idx_tool_booking_id'
    `);
    if (indexes.length === 0) {
      console.log('➕ Adding index on booking_id...');
      await connection.query(`
        ALTER TABLE tool_material_suggestions
          ADD INDEX idx_tool_booking_id (booking_id)
      `);
    }

    console.log('✅ tool_material_suggestions migration completed successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    connection.release();
  }
}

migrateToolMaterialSuggestions()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
