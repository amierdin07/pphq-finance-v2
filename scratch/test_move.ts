
import Database from "better-sqlite3";
const db = new Database("database.sqlite");

const branches = db.prepare("SELECT id FROM branches").all();
if (branches.length < 2) {
    console.log("Not enough branches to test move.");
    process.exit(0);
}

const fromBranchId = branches[0].id;
const toBranchId = branches[1].id;

const countBefore = db.prepare("SELECT COUNT(*) as count FROM students WHERE branchId = ?").get(fromBranchId).count;
console.log(`Students in branch ${fromBranchId} before move: ${countBefore}`);

db.prepare("UPDATE students SET branchId = ? WHERE branchId = ?").run(toBranchId, fromBranchId);

const countAfterFrom = db.prepare("SELECT COUNT(*) as count FROM students WHERE branchId = ?").get(fromBranchId).count;
const countAfterTo = db.prepare("SELECT COUNT(*) as count FROM students WHERE branchId = ?").get(toBranchId).count;

console.log(`Students in branch ${fromBranchId} after move: ${countAfterFrom}`);
console.log(`Students in branch ${toBranchId} after move: ${countAfterTo}`);

// Move back
db.prepare("UPDATE students SET branchId = ? WHERE branchId = ?").run(fromBranchId, toBranchId);
console.log("Moved back.");
