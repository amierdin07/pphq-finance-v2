
import Database from "better-sqlite3";
const db = new Database("database.sqlite");
const count = db.prepare("SELECT COUNT(*) as count FROM transactions").get();
console.log("Total transactions:", count.count);
