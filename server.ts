import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import cors from "cors";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite Databases
const dbPphq = new Database("database.sqlite");
const dbPjc = new Database("database_pjc.sqlite");

const runMigration = (db: any, isPjc: boolean) => {
  // Auto-migration for SQLite
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT,
      name TEXT,
      role TEXT,
      branchId TEXT,
      isActive INTEGER DEFAULT 1,
      avatarUrl TEXT,
      unitHeadName TEXT,
      unitTreasurerName TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- Insert default settings
    INSERT OR IGNORE INTO settings (key, value) VALUES ('appLogoUrl', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('appName', 'PPHQ Finance');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('appSubtitle', 'Sistem Keuangan PPHQ');

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      date TEXT,
      description TEXT,
      amount REAL,
      category TEXT,
      type TEXT,
      nature TEXT,
      branchId TEXT,
      createdBy TEXT,
      item TEXT,
      attachmentUrl TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      name TEXT,
      location TEXT,
      isPrivate INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      createdBy TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS announcement_reads (
      announcementId TEXT,
      userId TEXT,
      readAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (announcementId, userId)
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      parentPhone TEXT,
      isActive INTEGER DEFAULT 1,
      branchId TEXT
    );
  `);

  if (isPjc) {
    // Insert default admin for PJC
    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, password, name, role, isActive) 
      VALUES ('admin-pjc', 'admin@pjc.com', 'admin123', 'Super Admin PJC', 'Admin', 1)
    `).run();
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('appName', 'PJC Finance')").run();
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('appSubtitle', 'Sistem Keuangan PJC')").run();
  } else {
    // Insert default admin for PPHQ if no users exist
    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, password, name, role, isActive) 
      VALUES ('admin-1', 'admin@pphq.org', 'admin123', 'Super Admin', 'Admin', 1)
    `).run();
  }

  // Migration: Ensure columns exist for existing database
  try { db.exec("ALTER TABLE users ADD COLUMN password TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN avatarUrl TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN unitHeadName TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN unitTreasurerName TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE transactions ADD COLUMN item TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE transactions ADD COLUMN attachmentUrl TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE branches ADD COLUMN isPrivate INTEGER DEFAULT 0"); } catch (e) {}
};

runMigration(dbPphq, false);
runMigration(dbPjc, true);

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

async function startServer() {
  const app = express();
  const PORT = 4000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" })); // Increase limit for base64 images
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Helper to generate IDs
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Helper to save base64 as file
  const saveImage = (base64String: string | undefined): string | null => {
    if (!base64String || !base64String.startsWith("data:image")) return null;
    
    const matches = base64String.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;
    
    const extension = matches[1];
    const data = Buffer.from(matches[2], "base64");
    const fileName = `receipt_${Date.now()}_${generateId()}.${extension === "jpeg" ? "jpg" : extension}`;
    const filePath = path.join(uploadsDir, fileName);
    
    fs.writeFileSync(filePath, data);
    return `/uploads/${fileName}`;
  };

  // API Route - Handling actions from AppContext
  app.post("/api/action", (req, res) => {
    const { action, payload } = req.body;
    
    // Select database dynamically based on headers or payload domain
    let db = dbPphq;
    const tenantHeader = req.headers["x-tenant-domain"];
    const host = req.headers.host || "";
    const referer = req.headers.referer || "";
    
    if (action === "login") {
      const email = payload?.email || "";
      if (typeof email === "string" && email.toLowerCase().endsWith("@pjc.com")) {
        db = dbPjc;
      }
    } else if (tenantHeader === "pjc.com" || 
               (typeof tenantHeader === "string" && tenantHeader.toLowerCase().endsWith("pjc.com")) ||
               host.toLowerCase().includes("pjc.com") ||
               referer.toLowerCase().includes("pjc.com")) {
      db = dbPjc;
    }
    
    try {
      // 1. System Actions
      if (action === "getAllData") {
        const users = db.prepare("SELECT * FROM users").all();
        const branches = db.prepare("SELECT * FROM branches").all().map((b: any) => ({ ...b, isPrivate: b.isPrivate === 1 }));
        const categories = db.prepare("SELECT * FROM categories").all();
        const allTransactions = db.prepare("SELECT * FROM transactions").all();
        const students = db.prepare("SELECT * FROM students").all();
        const settingsRows = db.prepare("SELECT * FROM settings").all() as any[];
        const settings = settingsRows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
        return res.json({ status: "success", data: { users, branches, categories, allTransactions, students, settings } });
      }

      if (action === "getSettings") {
        const settingsRows = db.prepare("SELECT * FROM settings").all() as any[];
        const settings = settingsRows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
        return res.json({ status: "success", data: { settings } });
      }

      if (action === "addStudent") {
        const { student } = payload;
        const id = generateId();
        db.prepare("INSERT INTO students (id, name, address, parentPhone, isActive, branchId) VALUES (?, ?, ?, ?, ?, ?)")
          .run(id, student.name, student.address || null, student.parentPhone || null, student.isActive ? 1 : 0, student.branchId);
        const newStudent = db.prepare("SELECT * FROM students WHERE id = ?").get(id);
        return res.json({ status: "success", data: { newStudent } });
      }

      if (action === "importStudentsWithPayments") {
        const { branchId, year, importData, createdBy } = payload;
        const months = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];

        db.transaction(() => {
          for (const item of importData) {
            const studentId = generateId();
            // 1. Insert student
            db.prepare("INSERT INTO students (id, name, address, parentPhone, isActive, branchId) VALUES (?, ?, ?, ?, 1, ?)")
              .run(studentId, item.name, item.address || null, item.parentPhone || null, branchId);

            // 2. Insert payments if any
            if (item.payments) {
              for (const [monthName, amount] of Object.entries(item.payments)) {
                if (amount && (amount as number) > 0) {
                  const txId = generateId();
                  const monthIndex = months.indexOf(monthName);
                  const displayMonthIndex = monthIndex !== -1 ? monthIndex : 0;
                  const monthStr = String(displayMonthIndex + 1).padStart(2, '0');
                  const txDate = `${year}-${monthStr}-10T08:00:00.000Z`;
                  const txDescription = `Infaq Bulanan ${monthName} ${year} - ${item.name}`;

                  db.prepare(`
                    INSERT INTO transactions (id, date, description, amount, category, type, nature, branchId, createdBy, item)
                    VALUES (?, ?, ?, ?, 'Infaq Bulanan', 'Income', 'Money', ?, ?, ?)
                  `).run(txId, txDate, txDescription, amount, branchId, createdBy || null, studentId);
                }
              }
            }
          }
        })();

        return res.json({ status: "success" });
      }

      if (action === "updateStudent") {
        const { student } = payload;
        db.prepare("UPDATE students SET name = ?, address = ?, parentPhone = ?, isActive = ?, branchId = ? WHERE id = ?")
          .run(student.name, student.address || null, student.parentPhone || null, student.isActive ? 1 : 0, student.branchId, student.id);
        const updatedStudent = db.prepare("SELECT * FROM students WHERE id = ?").get(student.id);
        return res.json({ status: "success", data: { updatedStudent } });
      }



      if (action === "deleteStudent") {
        const { id } = payload;
        db.prepare("DELETE FROM students WHERE id = ?").run(id);
        return res.json({ status: "success", data: { id } });
      }

      if (action === "deleteStudents") {
        const { ids } = payload;
        const placeholders = ids.map(() => '?').join(',');
        db.prepare(`DELETE FROM students WHERE id IN (${placeholders})`).run(...ids);
        return res.json({ status: "success" });
      }



      if (action === "moveStudents") {
        const { fromBranchId, toBranchId } = payload;
        
        db.transaction(() => {
          // 1. Get student IDs from source branch
          const studentsToMove = db.prepare("SELECT id FROM students WHERE branchId = ?").all(fromBranchId) as any[];
          const studentIds = studentsToMove.map(s => s.id);
          
          if (studentIds.length > 0) {
            // 2. Update students
            db.prepare("UPDATE students SET branchId = ? WHERE branchId = ?").run(toBranchId, fromBranchId);
            
            // 3. Update transactions for these students specifically
            // This is safer than updating by branchId alone
            const placeholders = studentIds.map(() => '?').join(',');
            db.prepare(`UPDATE transactions SET branchId = ? WHERE item IN (${placeholders})`).run(toBranchId, ...studentIds);
          }
        })();
        
        return res.json({ status: "success" });
      }



      if (action === "resetData") {
        db.transaction(() => {
          db.prepare("DELETE FROM transactions").run();
          db.prepare("DELETE FROM branches").run();
          db.prepare("DELETE FROM categories").run();
          db.prepare("DELETE FROM users WHERE role NOT IN ('Admin')").run();
        })();
        const users = db.prepare("SELECT * FROM users").all();
        const branches = db.prepare("SELECT * FROM branches").all().map((b: any) => ({ ...b, isPrivate: b.isPrivate === 1 }));
        const categories = db.prepare("SELECT * FROM categories").all();
        const allTransactions = db.prepare("SELECT * FROM transactions").all();
        return res.json({ status: "success", data: { users, branches, categories, allTransactions } });
      }

      // 2. Auth Actions
      if (action === "login") {
        const { email, password } = payload;
        const user = db.prepare("SELECT * FROM users WHERE email = ? AND isActive = 1").get(email) as any;
        
        if (user) {
          const validPassword = user.password || 'admin123';
          if (validPassword === password) {
            return res.json({ status: "success", data: { user } });
          } else {
            return res.json({ status: "error", message: "Kata sandi salah." });
          }
        } else {
          return res.json({ status: "error", message: "User tidak ditemukan atau tidak aktif." });
        }
      }

      // 3. User Actions
      if (action === "updateUser") {
        const { user } = payload;
        db.prepare("UPDATE users SET name = ?, email = ?, password = ?, avatarUrl = ?, unitHeadName = ?, unitTreasurerName = ? WHERE id = ?")
          .run(user.name, user.email, user.password, user.avatarUrl || null, user.unitHeadName || null, user.unitTreasurerName || null, user.id);
        const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
        return res.json({ status: "success", data: { user: updatedUser } });
      }

      if (action === "updateSettings") {
        const { settings } = payload;
        Object.entries(settings).forEach(([key, value]) => {
          db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
        });
        return res.json({ status: "success", data: { settings } });
      }

      if (action === "addUser") {
        const { user } = payload;
        const id = generateId();
        db.prepare("INSERT INTO users (id, name, email, password, role, branchId, isActive, avatarUrl, unitHeadName, unitTreasurerName) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
          .run(id, user.name, user.email, user.password, user.role, user.branchId, user.isActive ? 1 : 0, user.avatarUrl || null, user.unitHeadName || null, user.unitTreasurerName || null);
        const newUser = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
        return res.json({ status: "success", data: { newUser } });
      }

      if (action === "updateUserByAdmin") {
        const { user } = payload;
        db.prepare("UPDATE users SET name = ?, email = ?, password = COALESCE(?, password), role = ?, branchId = ?, isActive = ?, avatarUrl = ?, unitHeadName = ?, unitTreasurerName = ? WHERE id = ?")
          .run(user.name, user.email, user.password || null, user.role, user.branchId, user.isActive ? 1 : 0, user.avatarUrl || null, user.unitHeadName || null, user.unitTreasurerName || null, user.id);
        const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
        return res.json({ status: "success", data: { updatedUser } });
      }

      if (action === "deleteUser") {
        const { id } = payload;
        db.prepare("DELETE FROM users WHERE id = ?").run(id);
        return res.json({ status: "success", data: { id } });
      }

      // 4. Transaction Actions
      if (action === "addTransaction") {
        const { transaction } = payload;
        const id = generateId();
        const attachmentUrl = saveImage(transaction.attachmentUrl);
        
        db.prepare(`
          INSERT INTO transactions (id, date, description, amount, category, type, nature, branchId, createdBy, item, attachmentUrl)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, transaction.date, transaction.description, transaction.amount, transaction.category, transaction.type, transaction.nature, transaction.branchId, transaction.createdBy, transaction.item, attachmentUrl);
        
        const newTransaction = db.prepare("SELECT * FROM transactions WHERE id = ?").get(id);
        return res.json({ status: "success", data: { newTransaction } });
      }

      if (action === "updateTransaction") {
        const { transaction } = payload;
        let attachmentUrl = transaction.attachmentUrl;
        
        // If it's a new base64 image, save it. Otherwise keep existing URL.
        if (attachmentUrl && attachmentUrl.startsWith("data:image")) {
          attachmentUrl = saveImage(attachmentUrl);
        }

        db.prepare(`
          UPDATE transactions SET date = ?, description = ?, amount = ?, category = ?, type = ?, nature = ?, branchId = ?, item = ?, attachmentUrl = ?
          WHERE id = ?
        `).run(transaction.date, transaction.description, transaction.amount, transaction.category, transaction.type, transaction.nature, transaction.branchId, transaction.item, attachmentUrl, transaction.id);
        const updatedTransaction = db.prepare("SELECT * FROM transactions WHERE id = ?").get(transaction.id);
        return res.json({ status: "success", data: { updatedTransaction } });
      }

      if (action === "deleteTransaction") {
        const { id } = payload;
        db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
        return res.json({ status: "success", data: { id } });
      }

      // 5. Category Actions
      if (action === "addCategory") {
        const { category } = payload;
        const id = generateId();
        db.prepare("INSERT INTO categories (id, name, type) VALUES (?, ?, ?)")
          .run(id, category.name, category.type);
        const newCategory = db.prepare("SELECT * FROM categories WHERE id = ?").get(id);
        return res.json({ status: "success", data: { newCategory } });
      }

      if (action === "updateCategory") {
        const { category } = payload;
        db.prepare("UPDATE categories SET name = ?, type = ? WHERE id = ?")
          .run(category.name, category.type, category.id);
        const updatedCategory = db.prepare("SELECT * FROM categories WHERE id = ?").get(category.id);
        return res.json({ status: "success", data: { updatedCategory } });
      }

      if (action === "deleteCategory") {
        const { id } = payload;
        db.prepare("DELETE FROM categories WHERE id = ?").run(id);
        return res.json({ status: "success", data: { id } });
      }

      // 6. Branch Actions
      if (action === "addBranch") {
        const { branch } = payload;
        const id = generateId();
        db.prepare("INSERT INTO branches (id, name, location, isPrivate) VALUES (?, ?, ?, ?)")
          .run(id, branch.name, branch.location, branch.isPrivate ? 1 : 0);
        const newBranch = db.prepare("SELECT * FROM branches WHERE id = ?").get(id) as any;
        return res.json({ status: "success", data: { newBranch: { ...newBranch, isPrivate: newBranch.isPrivate === 1 } } });
      }

      if (action === "updateBranch") {
        const { branch } = payload;
        db.prepare("UPDATE branches SET name = ?, location = ?, isPrivate = ? WHERE id = ?")
          .run(branch.name, branch.location, branch.isPrivate ? 1 : 0, branch.id);
        const updatedBranch = db.prepare("SELECT * FROM branches WHERE id = ?").get(branch.id) as any;
        return res.json({ status: "success", data: { updatedBranch: { ...updatedBranch, isPrivate: updatedBranch.isPrivate === 1 } } });
      }

      if (action === "deleteBranch") {
        const { id } = payload;
        db.transaction(() => {
          db.prepare("DELETE FROM transactions WHERE branchId = ?").run(id);
          db.prepare("DELETE FROM users WHERE branchId = ?").run(id);
          db.prepare("DELETE FROM branches WHERE id = ?").run(id);
        })();
        const users = db.prepare("SELECT * FROM users").all();
        const branches = db.prepare("SELECT * FROM branches").all().map((b: any) => ({ ...b, isPrivate: b.isPrivate === 1 }));
        const allTransactions = db.prepare("SELECT * FROM transactions").all();
        return res.json({ status: "success", data: { users, branches, allTransactions } });
      }

      // 7. Announcement Actions
      if (action === "getAnnouncements") {
        const { userId } = payload;
        const announcements = db.prepare(`
          SELECT a.*, 
            CASE WHEN ar.userId IS NOT NULL THEN 1 ELSE 0 END as isRead
          FROM announcements a
          LEFT JOIN announcement_reads ar ON a.id = ar.announcementId AND ar.userId = ?
          ORDER BY a.createdAt DESC
        `).all(userId);
        return res.json({ status: "success", data: { announcements } });
      }

      if (action === "createAnnouncement") {
        const { announcement } = payload;
        const id = generateId();
        db.prepare("INSERT INTO announcements (id, title, message, createdBy) VALUES (?, ?, ?, ?)") 
          .run(id, announcement.title, announcement.message, announcement.createdBy);
        const newAnnouncement = db.prepare("SELECT * FROM announcements WHERE id = ?").get(id);
        return res.json({ status: "success", data: { announcement: newAnnouncement } });
      }

      if (action === "markAnnouncementRead") {
        const { announcementId, userId } = payload;
        db.prepare("INSERT OR IGNORE INTO announcement_reads (announcementId, userId) VALUES (?, ?)") 
          .run(announcementId, userId);
        return res.json({ status: "success", data: {} });
      }

      if (action === "deleteAnnouncement") {
        const { id } = payload;
        db.prepare("DELETE FROM announcement_reads WHERE announcementId = ?").run(id);
        db.prepare("DELETE FROM announcements WHERE id = ?").run(id);
        return res.json({ status: "success", data: { id } });
      }

      return res.json({ status: "error", message: `Action "${action}" not implemented.` });
    } catch (err: any) {
      console.error(err);
      return res.json({ status: "error", message: err.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get(/.*/, (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
