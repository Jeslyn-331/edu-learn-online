# 🗄️ Database Setup Guide - EduLearn

## Step-by-Step Guide to Set Up MySQL Database Locally

---

## ✅ Option 1: Using WampServer (Your Setup)

WampServer includes MySQL, Apache, and phpMyAdmin - everything you need!

### Step 1: Start WampServer

1. Open **WampServer** (click the icon in your system tray)
2. Wait until the WampServer icon turns **GREEN** (all services running)
3. If it's orange or red, left-click the icon → **Start All Services**

### Step 2: Create the Database via phpMyAdmin

1. **Left-click** the WampServer icon in the system tray
2. Click **phpMyAdmin**
3. It will open in your browser (http://localhost/phpmyadmin)
4. Login with:
   - **Username**: `root`
   - **Password**: *(leave empty, just click Go)*

### Step 3: Import the Schema

1. In phpMyAdmin, click the **"Import"** tab at the top
2. Click **"Choose File"**
3. Navigate to `d:\CC asgm\database\schema.sql` and select it
4. Scroll down and click **"Go"**
5. You should see a success message: "Import has been successfully finished"

### Step 4: Verify

1. In the left sidebar of phpMyAdmin, you should now see **"edulearn"** database
2. Click on it - you'll see all 8 tables:
   - users, courses, lessons, enrollments, progress, transactions, purchases, wallet_history
3. Click on **"users"** table → you'll see 3 sample users

### Your `.env` is already configured for WampServer:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=edulearn
```

> **Note**: WampServer MySQL default has NO password for root user. The `.env` file has already been updated for this.

---

## Option 2: Install MySQL Standalone on Windows

### Step 1: Download MySQL

1. Go to: https://dev.mysql.com/downloads/installer/
2. Download **MySQL Installer for Windows** (the larger file, ~300MB)
3. Run the installer

### Step 2: Install MySQL

1. Choose **"Developer Default"** or **"Server Only"** setup type
2. Click **Next** through the installation
3. When prompted for **Root Password**, set it to something you'll remember
   - For development, you can use: `password` (match the .env file)
   - **Write this password down!**
4. Keep the default port: **3306**
5. Complete the installation

### Step 3: Verify MySQL is Running

Open **Command Prompt** or **PowerShell** and type:

```bash
mysql -u root -p
```

Enter your password when prompted. If you see `mysql>` prompt, MySQL is working!

Type `exit` to leave.

---

## Option 2: Install MySQL via XAMPP (Easiest)

1. Download XAMPP from: https://www.apachefriends.org/
2. Install XAMPP
3. Open XAMPP Control Panel
4. Start **MySQL** service
5. MySQL will be available at `localhost:3306` with user `root` and **no password**

If using XAMPP (no password), update your `.env` file:
```
DB_PASSWORD=
```

---

## Option 3: Use MySQL via Docker

```bash
docker run --name edulearn-mysql -e MYSQL_ROOT_PASSWORD=password -p 3306:3306 -d mysql:8.0
```

---

## Setting Up the Database

### Method A: Using Command Line (Recommended)

**Step 1:** Open Command Prompt/PowerShell and navigate to the project:

```bash
cd "d:\CC asgm"
```

**Step 2:** Run the schema file to create the database and tables:

```bash
mysql -u root -p < database/schema.sql
```

Enter your MySQL root password when prompted.

**Step 3:** Verify the database was created:

```bash
mysql -u root -p -e "USE edulearn; SHOW TABLES;"
```

You should see all 8 tables:
```
+--------------------+
| Tables_in_edulearn |
+--------------------+
| courses            |
| enrollments        |
| lessons            |
| progress           |
| purchases          |
| transactions       |
| users              |
| wallet_history     |
+--------------------+
```

---

### Method B: Using MySQL Workbench (GUI)

1. Download MySQL Workbench: https://dev.mysql.com/downloads/workbench/
2. Open MySQL Workbench
3. Connect to your local MySQL (localhost, port 3306, user root)
4. Go to **File → Open SQL Script**
5. Select `d:\CC asgm\database\schema.sql`
6. Click the **⚡ Execute** button (lightning bolt icon)
7. All tables will be created!

---

### Method C: Using phpMyAdmin (if using XAMPP)

1. Open browser: http://localhost/phpmyadmin
2. Click **"Import"** tab at the top
3. Click **"Choose File"** and select `d:\CC asgm\database\schema.sql`
4. Click **"Go"** at the bottom
5. Done! All tables created.

---

## Configure Backend to Connect to Database

### Step 1: Update the `.env` file

Open `d:\CC asgm\backend\.env` and update the database credentials:

```env
# If you set MySQL root password to "password":
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=edulearn

# If using XAMPP (no password):
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=edulearn
```

### Step 2: Create Test Users with Proper Passwords

The sample data in `schema.sql` has placeholder password hashes. Run this script to create users with real passwords you can log in with:

Open MySQL and run:

```sql
USE edulearn;

-- Delete the placeholder users
DELETE FROM users WHERE email IN ('admin@edulearn.com', 'john@edulearn.com', 'jane@edulearn.com');
```

Then start the backend server and use the **Register** page to create accounts, OR use this API call:

```bash
# Create an instructor account
curl -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" -d "{\"name\": \"John Instructor\", \"email\": \"john@edulearn.com\", \"password\": \"password123\", \"role\": \"instructor\"}"

# Create a student account
curl -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" -d "{\"name\": \"Jane Student\", \"email\": \"jane@edulearn.com\", \"password\": \"password123\", \"role\": \"student\"}"
```

---

## Running the Full Application

### Step 1: Start the Backend

Open a **new terminal** and run:

```bash
cd "d:\CC asgm\backend"
npm run dev
```

You should see:
```
🚀 EduLearn Backend running on port 5000
✅ Database connected successfully
```

**If you see a database connection error**, check:
- Is MySQL running? (Check Services or XAMPP)
- Is the password correct in `.env`?
- Is the `edulearn` database created?

### Step 2: Start the Frontend

Open **another terminal** and run:

```bash
cd "d:\CC asgm\frontend"
npm run dev
```

You should see:
```
VITE ready in 300ms
➜ Local: http://localhost:5173/
```

### Step 3: Open the App

Go to **http://localhost:5173** in your browser!

---

## Quick Test Workflow

1. **Register** a new account (choose "Instructor" role)
2. Go to **Instructor Panel** → Create a course
3. Add some lessons to the course
4. **Register** another account (choose "Student" role)
5. Go to **Wallet** → Top up some money
6. Browse **Courses** → Buy a course or lesson
7. Check **My Learning** dashboard to see purchased content

---

## Troubleshooting

### "Access denied for user 'root'"
- Wrong password in `.env` file
- Fix: Update `DB_PASSWORD` in `backend/.env`

### "Unknown database 'edulearn'"
- Database not created yet
- Fix: Run `mysql -u root -p < database/schema.sql`

### "ECONNREFUSED" error
- MySQL is not running
- Fix: Start MySQL service (or start it in XAMPP)

### "ER_NOT_SUPPORTED_AUTH_MODE"
- MySQL 8 authentication issue
- Fix: Run in MySQL:
```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';
FLUSH PRIVILEGES;
```

### Backend won't start
- Check if port 5000 is already in use
- Fix: Change `PORT=5001` in `.env` and update `vite.config.js` proxy target

---

## Database Schema Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    USERS     │     │   COURSES    │     │   LESSONS    │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ user_id (PK) │◄────│ instructor_id│     │ lesson_id(PK)│
│ name         │     │ course_id(PK)│◄────│ course_id(FK)│
│ email        │     │ title        │     │ title        │
│ password     │     │ description  │     │ content      │
│ role         │     │ price        │     │ video_url    │
│ wallet_balance│    │ is_published │     │ price        │
└──────┬───────┘     └──────┬───────┘     │ is_preview   │
       │                    │              └──────┬───────┘
       │                    │                     │
       ▼                    ▼                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ ENROLLMENTS  │     │  PURCHASES   │     │  PROGRESS    │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ enrollment_id│     │ purchase_id  │     │ progress_id  │
│ user_id (FK) │     │ user_id (FK) │     │ user_id (FK) │
│ course_id(FK)│     │ lesson_id(FK)│     │ lesson_id(FK)│
│ enrolled_at  │     │ course_id(FK)│     │ status       │
└──────────────┘     │ price        │     │ completed_at │
                     └──────────────┘     └──────────────┘

┌──────────────┐     ┌──────────────┐
│ TRANSACTIONS │     │WALLET_HISTORY│
├──────────────┤     ├──────────────┤
│transaction_id│     │ wallet_id    │
│ user_id (FK) │     │ user_id (FK) │
│ amount       │     │ amount       │
│ type         │     │ action       │
│ description  │     │ description  │
│ created_at   │     │ created_at   │
└──────────────┘     └──────────────┘
```
