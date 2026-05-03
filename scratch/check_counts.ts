import Database from "better-sqlite3";
const db = new Database("database.sqlite");
const tables = ['transactions', 'students', 'users', 'branches', 'categories'];
tables.forEach(table => {
    const count = db.prepare(`SELECT count(*) as count FROM ${table}`).get().count;
    console.log(`${table}: ${count}`);
});
