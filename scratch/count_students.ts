
import Database from "better-sqlite3";
const db = new Database("database.sqlite");
const students = db.prepare("SELECT * FROM students").all();
console.log("Total students:", students.length);
console.log("Students:", JSON.stringify(students.slice(0, 5), null, 2));
