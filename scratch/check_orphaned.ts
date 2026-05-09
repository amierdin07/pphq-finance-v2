
import Database from "better-sqlite3";
const db = new Database("database.sqlite");
const branches = db.prepare("SELECT id FROM branches").all().map(b => b.id);
const orphaned = db.prepare("SELECT * FROM students WHERE branchId NOT IN (" + branches.map(id => `'${id}'`).join(",") + ")").all();
console.log("Total orphaned students:", orphaned.length);
if (orphaned.length > 0) {
    console.log("Orphaned sample:", orphaned.slice(0, 10));
}
