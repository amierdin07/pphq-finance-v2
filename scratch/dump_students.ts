
import Database from "better-sqlite3";
const db = new Database("database.sqlite");
const students = db.prepare("SELECT * FROM students").all();
console.log("Total students in DB:", students.length);
students.forEach(s => {
    console.log(`- ID: ${s.id}, Name: ${s.name}, BranchId: ${s.branchId}`);
});
