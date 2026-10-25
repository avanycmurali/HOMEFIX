import { pool } from '../config/db.js';

export const runVoiceComplaintMigration = async () => {
  const connection = await pool.getConnection();
  try {
    console.log('🔄 Checking bookings table for voice complaint columns...');

    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'bookings'
    `);

    const colNames = columns.map((c) => c.COLUMN_NAME.toLowerCase());

    const columnsToAdd = [
      { name: 'voice_complaint_url', type: 'VARCHAR(255) NULL AFTER problem_image_url' },
      { name: 'voice_transcription', type: 'TEXT NULL AFTER voice_complaint_url' },
      { name: 'detected_service', type: 'VARCHAR(100) NULL AFTER voice_transcription' },
      { name: 'detected_problem', type: 'VARCHAR(150) NULL AFTER detected_service' },
      { name: 'detected_keywords', type: 'TEXT NULL AFTER detected_problem' },
      { name: 'detection_method', type: 'VARCHAR(50) NULL AFTER detected_keywords' },
    ];

    for (const col of columnsToAdd) {
      if (!colNames.includes(col.name.toLowerCase())) {
        console.log(`  ➕ Adding column: ${col.name}`);
        await connection.query(`ALTER TABLE bookings ADD COLUMN ${col.name} ${col.type}`);
      } else {
        console.log(`  ✓ Column already exists: ${col.name}`);
      }
    }

    console.log('✅ Voice complaint migration completed successfully.');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Execute if run directly from CLI
if (process.argv[1]?.endsWith('migrateVoiceComplaints.js')) {
  runVoiceComplaintMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
