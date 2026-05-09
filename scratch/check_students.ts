
import Database from "better-sqlite3";
const db = new Database("database.sqlite");


const branches = db.prepare("SELECT * FROM branches").all();
const students = db.prepare("SELECT s.*, b.name as branchName FROM students s LEFT JOIN branches b ON s.branchId = b.id").all();

console.log("Total Students:", students.length);
console.log("Students sample:");
console.table(students.slice(0, 20));

const studentCounts = db.prepare("SELECT branchId, COUNT(*) as count FROM students GROUP BY branchId").all();

console.log("\nStudent Counts per Branch:");
console.table(studentCounts.map(sc => {
    const branch = branches.find(b => b.id === sc.branchId);
    return {
        branchId: sc.branchId,
        branchName: branch ? branch.name : "Unknown",
        count: sc.count
    };
}));

