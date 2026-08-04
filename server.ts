import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import cors from "cors";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

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
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;

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
  app.post("/api/hqai/chat", async (req, res) => {
    const { prompt, chatHistory, currentUser } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.json({ status: "error", message: "Prompt tidak boleh kosong." });
    }

    let db = dbPphq;
    const tenantHeader = req.headers["x-tenant-domain"];
    const host = req.headers.host || "";
    const referer = req.headers.referer || "";

    if (tenantHeader === "pjc.com" || 
        (typeof tenantHeader === "string" && tenantHeader.toLowerCase().endsWith("pjc.com")) ||
        host.toLowerCase().includes("pjc.com") ||
        referer.toLowerCase().includes("pjc.com")) {
      db = dbPjc;
    }

    try {
      const settingsRows = db.prepare("SELECT * FROM settings").all() as any[];
      const settings = settingsRows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {}) as any;

      const branches = db.prepare("SELECT id, name, location FROM branches").all() as any[];
      const categories = db.prepare("SELECT name, type FROM categories").all() as any[];
      const students = db.prepare("SELECT id, name, branchId, isActive FROM students").all() as any[];
      const transactions = db.prepare("SELECT date, description, amount, category, type, nature, branchId FROM transactions ORDER BY date DESC LIMIT 50").all() as any[];

      // Monthly summary calculation per YYYY-MM
      const monthlySummary: Record<string, { income: number; expense: number }> = {};
      const allTxForMonth = db.prepare("SELECT date, amount, type, nature, branchId FROM transactions").all() as any[];
      
      allTxForMonth.forEach((tx: any) => {
        if ((tx.nature === 'Money' || !tx.nature) && tx.date) {
          const monthKey = tx.date.slice(0, 7); // e.g. "2026-05"
          if (currentUser && currentUser.branchId && currentUser.role !== "Admin" && tx.branchId !== currentUser.branchId) {
            return; // Skip transactions from other branches for unit user
          }
          if (!monthlySummary[monthKey]) {
            monthlySummary[monthKey] = { income: 0, expense: 0 };
          }
          if (tx.type === 'Income') monthlySummary[monthKey].income += (tx.amount || 0);
          if (tx.type === 'Expense') monthlySummary[monthKey].expense += (tx.amount || 0);
        }
      });

      const formattedMonthlyList = Object.keys(monthlySummary)
        .sort().reverse()
        .slice(0, 12)
        .map(m => `${m}: Pemasukan Rp ${monthlySummary[m].income.toLocaleString('id-ID')}, Pengeluaran Rp ${monthlySummary[m].expense.toLocaleString('id-ID')}`);

      const formattedMonthlyStr = formattedMonthlyList.length > 0 ? formattedMonthlyList.join("\n- ") : "Belum ada transaksi.";
      const currentDateStr = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

      let totalIncome = 0;
      let totalExpense = 0;
      allTxForMonth.forEach((tx: any) => {
        if (tx.nature === 'Money' || !tx.nature) {
          if (tx.type === 'Income') totalIncome += (tx.amount || 0);
          if (tx.type === 'Expense') totalExpense += (tx.amount || 0);
        }
      });
      const netBalance = totalIncome - totalExpense;

      let userUnitContext = "";
      if (currentUser && currentUser.branchId && currentUser.role !== "Admin") {
        const userBranchObj = branches.find((b: any) => b.id === currentUser.branchId);
        const userBranchName = userBranchObj ? userBranchObj.name : "Unit Cabang";

        let unitIncome = 0;
        let unitExpense = 0;
        const unitTx = db.prepare("SELECT date, description, amount, category, type, nature FROM transactions WHERE branchId = ? ORDER BY date DESC").all(currentUser.branchId) as any[];
        unitTx.forEach((tx: any) => {
          if (tx.nature === 'Money' || !tx.nature) {
            if (tx.type === 'Income') unitIncome += (tx.amount || 0);
            if (tx.type === 'Expense') unitExpense += (tx.amount || 0);
          }
        });
        const unitNetBalance = unitIncome - unitExpense;
        const unitStudents = students.filter((s: any) => s.branchId === currentUser.branchId);

        // Build per-month per-CATEGORY breakdown (matches what user sees in the app)
        const unitCategoryMonthMap: Record<string, Record<string, number>> = {};
        // Also build per-month per-keyword (first word of desc) for item-level queries
        const unitKeywordMonthMap: Record<string, Record<string, number>> = {};
        unitTx.forEach((tx: any) => {
          if ((tx.nature === 'Money' || !tx.nature) && tx.type === 'Expense' && tx.date) {
            const monthKey = tx.date.slice(0, 7);
            // Group by category
            const cat = (tx.category || 'Lainnya').trim();
            if (!unitCategoryMonthMap[monthKey]) unitCategoryMonthMap[monthKey] = {};
            unitCategoryMonthMap[monthKey][cat] = (unitCategoryMonthMap[monthKey][cat] || 0) + (tx.amount || 0);
            // Group by first keyword of description
            if (tx.description) {
              const keyword = tx.description.trim().toLowerCase().split(/\s+/)[0];
              if (!unitKeywordMonthMap[monthKey]) unitKeywordMonthMap[monthKey] = {};
              unitKeywordMonthMap[monthKey][keyword] = (unitKeywordMonthMap[monthKey][keyword] || 0) + (tx.amount || 0);
            }
          }
        });
        const bulanNames: Record<string, string> = {
          '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
          '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
          '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember'
        };
        const months = Object.keys(unitCategoryMonthMap).sort().reverse().slice(0, 6);
        const unitDescBreakdown = months.map(m => {
          const [yr, mo] = m.split('-');
          const label = `${bulanNames[mo] || mo} ${yr}`;
          // Category breakdown
          const catItems = Object.entries(unitCategoryMonthMap[m] || {})
            .sort((a, b) => b[1] - a[1])
            .map(([cat, amt]) => `  * ${cat}: Rp ${amt.toLocaleString('id-ID')}`)
            .join('\n');
          // Keyword breakdown (for item-level queries like "beras", "bensin")
          const kwItems = Object.entries(unitKeywordMonthMap[m] || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([kw, amt]) => `  * ${kw}: Rp ${amt.toLocaleString('id-ID')}`)
            .join('\n');
          return `=== ${label} ===\nPer Kategori:\n${catItems}\nPer Kata Kunci Deskripsi:\n${kwItems}`;
        }).join('\n\n');

        userUnitContext = `PENGGUNA SAAT INI (AKUN BENDAHARA / AKUN UNIT):
- Nama Pengguna: ${currentUser.name || 'Bendahara Unit'}
- Role / Hak Akses: Bendahara Unit Cabang (${userBranchName})
- Unit / Cabang Terikat: ${userBranchName} (ID: ${currentUser.branchId})

DATA KEUANGAN SPESIFIK UNIT (${userBranchName.toUpperCase()}):
- Total Pemasukan Uang Unit ${userBranchName}: Rp ${unitIncome.toLocaleString('id-ID')}
- Total Pengeluaran Uang Unit ${userBranchName}: Rp ${unitExpense.toLocaleString('id-ID')}
- Saldo Kas Bersih Unit ${userBranchName}: Rp ${unitNetBalance.toLocaleString('id-ID')}
- Jumlah Santri Unit Ini: ${unitStudents.length} santri (${unitStudents.filter((s: any) => s.isActive).length} aktif)

RINGKASAN PEMASUKAN & PENGELUARAN PER BULAN UNIT ${userBranchName.toUpperCase()}:
- ${formattedMonthlyStr}

RINGKASAN PENGELUARAN PER KATEGORI & PER KATA KUNCI (6 BULAN TERAKHIR):
${unitDescBreakdown}

Sample 20 Transaksi Terakhir Unit Ini: ${JSON.stringify(unitTx.slice(0, 20))}

INSTRUKSI WAJIB UNTUK HQAI:
- Pengguna yang sedang bertanya adalah Bendahara dari **Unit ${userBranchName}**.
- Jika pengguna menanyakan kategori (misal: bisyaroh, bahan makanan, listrik), cari di bagian "Per Kategori" pada bulan yang ditanyakan.
- Jika pengguna menanyakan item spesifik (misal: beras, bensin), cari di bagian "Per Kata Kunci Deskripsi".
- DILARANG MEMBERIKAN saldo gabungan SuperAdmin (semua cabang) kepada pengguna akun unit ini!`;
      } else {
        userUnitContext = `PENGGUNA SAAT INI (AKUN SUPERADMIN / PUSAT):
- Role: SuperAdmin (Admin Pusat)
- Hak Akses: Mengelola Seluruh Unit / Cabang (${branches.map((b: any) => b.name).join(', ')})

DATA KEUANGAN GLOBAL (GABUNGAN SELURUH UNIT):
- Total Pemasukan Seluruh Cabang: Rp ${totalIncome.toLocaleString('id-ID')}
- Total Pengeluaran Seluruh Cabang: Rp ${totalExpense.toLocaleString('id-ID')}
- Saldo Kas Bersih Total Gabungan: Rp ${netBalance.toLocaleString('id-ID')}
- RINGKASAN PEMASUKAN & PENGELUARAN PER BULAN GABUNGAN:
- ${formattedMonthlyStr}
- Total Santri Seluruh Cabang: ${students.length} santri (${students.filter((s: any) => s.isActive).length} aktif)
- Sample 10 Transaksi Terakhir: ${JSON.stringify(transactions.slice(0, 10))}`;
      }

      const systemPrompt = `Anda adalah HQAI, Asisten AI Cerdas Resmi untuk Sistem Keuangan PPHQ Finance v2.

PERATURAN UTAMA:
1. Anda HANYA diperbolehkan menjawab pertanyaan terkait aplikasi PPHQ Finance v2, termasuk: data keuangan, saldo kas, transaksi (pemasukan & pengeluaran), infaq santri / syahriyah, statistik unit/cabang, serta panduan pengoperasian aplikasi PPHQ Finance.
2. JIKA pengguna bertanya hal di luar topik aplikasi PPHQ Finance (seperti resep masakan, politik, hiburan, sains, coding umum, atau percakapan umum lainnya yang tidak relevan dengan PPHQ Finance), Anda HARUS MENOLAK dengan sopan dalam Bahasa Indonesia. Contoh respon penolakan: "Mohon maaf, sebagai HQAI saya hanya dapat membantu menjawab pertanyaan seputar aplikasi dan data keuangan PPHQ Finance v2. Silakan tanyakan hal terkait transaksi, saldo kas, atau infaq santri."
3. JAWAB SINGKAT DAN LANGSUNG. Jangan tampilkan rincian transaksi kecuali pengguna SECARA EKSPLISIT meminta rincian. Contoh jawaban yang BENAR: "Pengeluaran beras bulan Juli sebesar Rp 4.868.000." — Jangan menulis daftar panjang atau rincian per item jika tidak diminta.
4. DATA MUNGKIN TIDAK LENGKAP. Jika pengguna mengoreksi angka Anda, terima koreksinya dan katakan: "Terima kasih atas koreksinya. Sepertinya ada transaksi yang tidak tertangkap oleh ringkasan data saya. Untuk data lengkap dan akurat, silakan cek langsung di halaman Transaksi."

WAKTU & DATA CONTEXT KEUANGAN REAL-TIME PPHQ FINANCE:
- Tanggal Hari Ini: ${currentDateStr}
- Nama Aplikasi: ${settings.appName || 'PPHQ Finance'} (${settings.appSubtitle || 'Sistem Keuangan'})
- Daftar Cabang/Unit Terdaftar: ${branches.map((b: any) => `${b.name} (${b.location || 'Utama'})`).join(', ')}
- Kategori Transaksi: ${categories.map((c: any) => `${c.name} [${c.type}]`).join(', ')}

${userUnitContext}

Harap analisis pertanyaan pengguna dan jawab dengan tepat sesuai konteks akun pengguna di atas.`;

      const primaryKey = settings.geminiApiKeyPrimary || process.env.GEMINI_API_KEY || "";
      const secondaryKey = settings.geminiApiKeySecondary || "";
      const baseUrl = settings.hqaiBaseUrl || "";

      const apiKeys = [primaryKey, secondaryKey].filter(k => k && typeof k === "string" && k.trim() !== "");

      if (apiKeys.length === 0) {
        return res.json({
          status: "success",
          data: {
            reply: "⚠️ **API Key HQAI Belum Dikonfigurasi**\n\nSilakan hubungi **SuperAdmin** untuk memasukkan API Key AI di halaman **Pengaturan** > **Pengaturan HQAI** agar fitur AI ini dapat digunakan."
          }
        });
      }

      let aiReply = "";
      let lastError = null;

      const selectedModel = settings.hqaiModel && settings.hqaiModel.trim() !== "" ? settings.hqaiModel.trim() : null;
      const candidateModels = selectedModel ? [selectedModel] : ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"];

      // Sanitize chat history roles for OpenAI/Groq vs Gemini
      const sanitizedOpenAiMessages = [
        { role: "system", content: systemPrompt },
        ...(Array.isArray(chatHistory) ? chatHistory.map((h: any) => ({
          role: h.role === "assistant" || h.role === "model" ? "assistant" : "user",
          content: h.content || ""
        })) : []),
        { role: "user", content: prompt }
      ];

      for (let i = 0; i < apiKeys.length; i++) {
        const apiKey = apiKeys[i].trim();

        for (const modelName of candidateModels) {
          try {
            if (baseUrl && baseUrl.trim() !== "") {
              const cleanBase = baseUrl.replace(/\/$/, "");
              let targetUrl = "";
              if (cleanBase.endsWith("/chat/completions")) {
                targetUrl = cleanBase;
              } else if (cleanBase.endsWith("/v1")) {
                targetUrl = `${cleanBase}/chat/completions`;
              } else {
                targetUrl = `${cleanBase}/v1/chat/completions`;
              }
              const response = await fetch(targetUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                  model: modelName,
                  messages: sanitizedOpenAiMessages
                })
              });

              if (!response.ok) {
                const errText = await response.text();
                console.warn(`[HQAI] ${modelName} HTTP ${response.status}: ${errText.slice(0, 200)}`);
                lastError = new Error(`API Error HTTP ${response.status}: ${errText}`);
                continue;
              }

              const resData = await response.json();
              aiReply = resData.choices?.[0]?.message?.content || "Tidak ada respon dari model.";
              if (aiReply) break;
            } else {
              const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
              const contents = [
                {
                  role: "user",
                  parts: [{ text: `${systemPrompt}\n\nInstruksi Pengguna: ${prompt}` }]
                }
              ];

              const response = await fetch(geminiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents })
              });

              if (!response.ok) {
                const errText = await response.text();
                if (response.status === 404 || response.status === 429 || errText.includes("not found") || errText.includes("RESOURCE_EXHAUSTED") || errText.includes("Quota exceeded")) {
                  console.warn(`[HQAI] Model ${modelName} returned HTTP ${response.status}. Trying next model...`);
                  lastError = new Error(`Gemini API Error HTTP ${response.status}: ${errText}`);
                  continue;
                }
                throw new Error(`Gemini API Error HTTP ${response.status}: ${errText}`);
              }

              const resData = await response.json();
              aiReply = resData.candidates?.[0]?.content?.parts?.[0]?.text || "Tidak ada respon dari Gemini AI.";
              if (aiReply) break;
            }
          } catch (err: any) {
            lastError = err;
            if (err.message.includes("404") || err.message.includes("429") || err.message.includes("not found") || err.message.includes("RESOURCE_EXHAUSTED") || err.message.includes("Quota exceeded")) {
              continue;
            }
            console.warn(`[HQAI Failover] API Key ke-${i + 1} (${modelName}) gagal:`, err.message);
          }
        }

        if (aiReply) break;
      }

      if (!aiReply) {
        if (lastError && (lastError.message.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") || lastError.message.includes("UNAUTHENTICATED") || lastError.message.includes("401"))) {
          return res.json({
            status: "success",
            data: {
              reply: "⚠️ **Tipe Kunci Auth Tidak Didukung (ACCESS_TOKEN_TYPE_UNSUPPORTED)**\n\nKunci berawalan `AQ...` pada screenshot Anda adalah **Auth Key / OAuth Access Token**, bukan **Standard REST API Key** untuk `generateContent`.\n\n👉 **Cara Membuat Standard REST API Key di Google AI Studio**:\n1. Buka [Google AI Studio (aistudio.google.com/app/apikey)](https://aistudio.google.com/app/apikey).\n2. Klik **Create API Key** -> pilih **Create API Key in new project**.\n3. Salin kunci berawalan **`AIzaSy...`** lalu tempelkan ke menu **Pengaturan HQAI**."
            }
          });
        }
        if (lastError && (lastError.message.includes("API_KEY_INVALID") || lastError.message.includes("API key not valid"))) {
          return res.json({
            status: "success",
            data: {
              reply: "⚠️ **API Key Gemini Tidak Valid**\n\nAPI Key yang terpasang belum valid atau belum diisi dengan benar.\n\n👉 Silakan masuk sebagai **SuperAdmin**, lalu buka menu **Pengaturan** > **Pengaturan HQAI** dan masukkan **API Key Gemini** resmi dari [Google AI Studio](https://aistudio.google.com/app/apikey)."
            }
          });
        }
        if (lastError && (lastError.message.includes("403") || lastError.message.includes("PERMISSION_DENIED") || lastError.message.includes("denied access"))) {
          return res.json({
            status: "success",
            data: {
              reply: "⚠️ **Akses API Key Ditolak (Google Error 403: Permission Denied)**\n\nGoogle menolak akses API Key ini (*Your project has been denied access*).\n\n👉 **Solusi Pengurus**: Silakan buat API Key baru menggunakan **akun Gmail standar lain** di [Google AI Studio](https://aistudio.google.com/app/apikey) (pilih *Create API key in new project*), lalu simpan di menu **Pengaturan HQAI**."
            }
          });
        }
        if (lastError && (lastError.message.includes("limit: 0") || lastError.message.includes("429") || lastError.message.includes("RESOURCE_EXHAUSTED") || lastError.message.includes("Quota exceeded") || lastError.message.includes("rate_limit"))) {
          const isGroq = baseUrl && baseUrl.includes("groq");
          const isCustom = baseUrl && baseUrl.trim() !== "";
          let rateLimitMsg = "";
          rateLimitMsg = "Mohon maaf, saya sedang tidak dapat memproses pertanyaan Anda saat ini. Silakan coba beberapa saat lagi. 🙏";
          return res.json({ status: "success", data: { reply: rateLimitMsg } });
        }
        throw lastError || new Error("Gagal mendapatkan respon dari AI.");
      }

      return res.json({ status: "success", data: { reply: aiReply } });
    } catch (err: any) {
      console.error("HQAI Chat Error:", err);
      return res.json({
        status: "error",
        message: `Gagal memproses pertanyaan HQAI: ${err.message || err}`
      });
    }
  });

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

  app.post("/api/gemini-chat", async (req, res) => {
    const { message, history, user } = req.body;
    
    if (!user) {
      return res.json({ status: "error", message: "User tidak terautentikasi." });
    }

    let db = dbPphq;
    const tenantHeader = req.headers["x-tenant-domain"];
    const host = req.headers.host || "";
    const referer = req.headers.referer || "";
    
    if (tenantHeader === "pjc.com" || 
        (typeof tenantHeader === "string" && tenantHeader.toLowerCase().endsWith("pjc.com")) ||
        host.toLowerCase().includes("pjc.com") ||
        referer.toLowerCase().includes("pjc.com") ||
        (user.email && typeof user.email === "string" && user.email.toLowerCase().endsWith("@pjc.com"))) {
      db = dbPjc;
    }

    try {
      // Ambil API Key dari database settings terlebih dahulu, jika tidak ada baru fallback ke .env
      const dbKeyRow = db.prepare("SELECT value FROM settings WHERE key = 'geminiApiKey'").get() as any;
      const apiKeyString = dbKeyRow?.value || process.env.GEMINI_API_KEY || "";

      if (!apiKeyString) {
        return res.json({ status: "error", message: "API Key Gemini belum dikonfigurasi. Silakan isi Gemini API Key di Halaman Pengaturan (Superadmin) atau tambahkan GEMINI_API_KEY di file .env." });
      }

      // Pisahkan key dengan koma untuk mendukung penumpukan key (stacked keys)
      const keys = apiKeyString.split(",").map((k: string) => k.trim()).filter(Boolean);
      if (keys.length === 0) {
        return res.json({ status: "error", message: "API Key Gemini tidak valid atau kosong." });
      }

      // 1. Ambil data transaksi milik user ini secara aman
      let transactions: any[] = [];
      if (user.role === "Admin" || user.role === "SubAdmin") {
        // Admin bisa melihat semua transaksi
        transactions = db.prepare("SELECT * FROM transactions ORDER BY date DESC LIMIT 300").all();
      } else {
        // User cabang hanya bisa melihat transaksi cabangnya
        transactions = db.prepare("SELECT * FROM transactions WHERE branchId = ? ORDER BY date DESC LIMIT 300").all(user.branchId);
      }

      // Ambil data cabang untuk konteks nama cabang
      const branches = db.prepare("SELECT * FROM branches").all();

      // Format data transaksi menjadi ringkasan teks agar hemat token
      const transContext = transactions.map((t: any) => {
        const branchName = branches.find((b: any) => b.id === t.branchId)?.name || t.branchId;
        return `- Tanggal: ${t.date ? t.date.split("T")[0] : "-"}, Deskripsi: ${t.description}, Nominal: Rp ${Number(t.amount || 0).toLocaleString("id-ID")}, Tipe: ${t.type === "Income" ? "Pemasukan" : "Pengeluaran"}, Kategori: ${t.category}, Unit/Cabang: ${branchName}`;
      }).join("\n");

      // Buat system instruction / prompt
      const systemInstruction = `Anda adalah Asisten Keuangan AI Pintar bernama "${user.email.endsWith("@pjc.com") ? "PJC Finance AI" : "PPHQ Finance AI"}".
Anda berbicara kepada user bernama "${user.name}" dengan peran/role "${user.role}".
Tugas Anda adalah membantu menganalisis, merangkum, dan menjawab pertanyaan seputar keuangan mereka secara ramah, sopan, ringkas, dan profesional menggunakan bahasa Indonesia.

Berikut adalah data transaksi terbaru (maksimal 300 transaksi terakhir) yang terkait dengan user ini (data ini sudah difilter secara aman, Anda hanya boleh membahas data ini):
${transContext || "Tidak ada transaksi tercatat."}

Aturan penting:
1. Jangan sebutkan atau bahas data dari akun/cabang lain yang tidak ada di daftar transaksi di atas.
2. Jika user menanyakan tentang budget atau saran hemat, berikan jawaban taktis yang bersahabat.
3. Selalu format angka nominal uang dalam format rupiah (contoh: Rp 50.000).
4. Gunakan gaya bahasa santai tapi sopan (bisa memanggil "Bos" atau "Kak" sesuai kebiasaan mereka).
5. Jangan buat data transaksi fiktif jika tidak ada di dalam daftar di atas.`;

      // Kirim riwayat chat + pesan baru ke Gemini
      const contents = [
        { role: "user", parts: [{ text: systemInstruction }] },
        ...(history || []).map((h: any) => ({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }]
        })),
        { role: "user", parts: [{ text: message }] }
      ];

      // Coba satu per satu key yang tersedia (penumpukan key)
      let responseText = "";
      let isSuccess = false;
      let lastError: any = null;

      for (let i = 0; i < keys.length; i++) {
        try {
          const genAI = new GoogleGenerativeAI(keys[i]);
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const result = await model.generateContent({ contents });
          responseText = result.response.text();
          isSuccess = true;
          break; // Berhasil! Keluar dari loop
        } catch (err: any) {
          console.warn(`[Gemini API Warning] Key ke-${i + 1} gagal digunakan:`, err.message);
          lastError = err;
        }
      }

      if (!isSuccess) {
        throw new Error("Semua API Key Gemini yang ditumpuk gagal digunakan atau telah habis kuota: " + (lastError?.message || ""));
      }

      return res.json({ status: "success", data: responseText });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      return res.json({ status: "error", message: "Gagal memproses ke Gemini: " + error.message });
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
