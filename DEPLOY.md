# Tutorial Deployment VPS PPHQ Finance v2 (SQLite)

Tutorial ini menggunakan **Express + SQLite**, sehingga database tersimpan langsung sebagai file di folder VPS Anda. Tidak perlu Google Apps Script atau database online lainnya.

## Langkah 1: Persiapan Server VPS

Pastikan Anda menggunakan **Ubuntu 22.04 / 24.04**. Hubungkan ke VPS via SSH, lalu install Node.js:

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx
```

---

## Langkah 2: Ambil Kode dari GitHub

```bash
cd /var/www
# Sesuaikan link repository jika perlu
git clone https://github.com/username/pphq-finance-v2.git pphq-finance
cd pphq-finance
```

---

## Langkah 3: Install & Build

```bash
npm install
npm run build
```
Proses build ini akan membuat folder `dist/` untuk frontend.

---

## Langkah 4: Running Aplikasi dengan PM2

Kita akan menggunakan **PM2** agar aplikasi terus berjalan di background dan otomatis restart jika VPS reboot:

```bash
sudo npm install -g pm2
# Jalankan menggunakan konfigurasi ecosystem yang sudah disediakan
pm2 start ecosystem.config.cjs
# Agar otomatis jalan saat VPS restart
pm2 save
pm2 startup
```

Sekarang aplikasi Anda sudah berjalan di `http://IP_VPS_ANDA:4000`.

---

## Langkah 5: Konfigurasi Nginx (Opsional tapi Direkomendasikan)

Agar bisa diakses lewat domain (contoh: `finance.pphq.org`), buat file konfigurasi nginx:

```bash
sudo nano /etc/nginx/sites-available/pphq-finance
```

Isi dengan:
```nginx
server {
    listen 80;
    server_name finance.pphq.org; # Ganti dengan domain Anda

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Aktifkan:
```bash
sudo ln -s /etc/nginx/sites-available/pphq-finance /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Informasi Login

Aplikasi memiliki **user default**:
- **Email:** `admin@pphq.org`
- **Password:** `admin123`

Setelah masuk, Anda wajib mengganti password di menu Profil atau menambah user lain melalui menu Cabang/User.

---

## Cara Update Aplikasi

Setiap ada perubahan kode di GitHub, jalankan ini di VPS:
```bash
cd /var/www/pphq-finance
git pull
npm install
npm run build
pm2 restart pphq-finance
```

**Database Anda aman:** File `database.sqlite` tidak akan terhapus saat update karena tidak masuk dalam git.

