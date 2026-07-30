const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

console.log('Current working directory:', process.cwd());

const dbPath = path.join(__dirname, '../database.sqlite');
console.log('Database path:', dbPath);
if (fs.existsSync(dbPath)) {
  console.log('Database file size:', fs.statSync(dbPath).size, 'bytes');
  try {
    const db = new Database(dbPath);
    const txCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get().count;
    const studentCount = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
    console.log('Transactions count:', txCount);
    console.log('Students count:', studentCount);
  } catch (err) {
    console.error('Error reading database:', err);
  }
} else {
  console.log('Database file not found at:', dbPath);
}
