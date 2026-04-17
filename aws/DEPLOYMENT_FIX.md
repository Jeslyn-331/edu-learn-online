# 🔧 EduLearn – AWS Deployment Fix Guide
## Why Your Changes Are Not Reflected

---

## 🎯 ROOT CAUSE (Most Likely Reason)

Your application is still running on **localhost (WampServer)** instead of AWS.

Here's what's happening:

```
❌ CURRENT (Wrong):
Browser → Frontend (localhost:5173) → Backend (localhost:5000) → WampServer MySQL

✅ CORRECT (AWS):
Browser → Frontend (EC2/EB URL) → Backend (EC2/EB URL) → AWS RDS MySQL
```

There are **3 places** you need to update:

| # | File | What to Change |
|---|------|----------------|
| 1 | `backend/.env` | DB_HOST → AWS RDS endpoint |
| 2 | `frontend/vite.config.js` | proxy target → AWS backend URL |
| 3 | `frontend/src/services/api.js` | baseURL → AWS backend URL |

---

## 📋 STEP-BY-STEP FIX

---

### STEP 1: Get Your AWS Information

Before changing anything, collect these values from your AWS Console:

**A. RDS Endpoint** (your database URL):
- Go to AWS Console → RDS → Databases → Click your database
- Copy the **Endpoint** (looks like: `edulearn-db.abc123xyz.us-east-1.rds.amazonaws.com`)

**B. EC2 / Elastic Beanstalk URL** (your backend URL):
- EC2: Go to EC2 → Instances → Copy **Public IPv4 DNS** or **Public IP**
  - Example: `ec2-54-123-45-67.us-east-1.compute.amazonaws.com`
- Elastic Beanstalk: Go to EB → Your Environment → Copy the **URL**
  - Example: `edulearn-env.eba-abc123.us-east-1.elasticbeanstalk.com`

---

### STEP 2: Fix Backend Database Connection

**File:** `backend/.env`

Change from (localhost/WampServer):
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=edulearn
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

Change to (AWS RDS):
```env
DB_HOST=edulearn-db.abc123xyz.us-east-1.rds.amazonaws.com   ← Your RDS endpoint
DB_PORT=3306
DB_USER=admin                                                  ← Your RDS username
DB_PASSWORD=YourRDSPassword123                                 ← Your RDS password
DB_NAME=edulearn
NODE_ENV=production
FRONTEND_URL=http://your-eb-url.elasticbeanstalk.com          ← Your EB/EC2 URL
JWT_SECRET=use_a_strong_random_secret_here_minimum_32_chars
```

---

### STEP 3: Fix Frontend API URL

**Option A: If running frontend LOCALLY but backend on AWS**

Edit `frontend/vite.config.js`:
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://your-ec2-or-eb-url.amazonaws.com',  // ← Change this
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://your-ec2-or-eb-url.amazonaws.com',  // ← Change this
        changeOrigin: true
      }
    }
  }
})
```

**Option B: If deploying BOTH frontend and backend on AWS (Production)**

Edit `frontend/src/services/api.js`:
```javascript
const API = axios.create({
    // Change from '/api' (relative) to full AWS URL:
    baseURL: 'http://your-ec2-or-eb-url.amazonaws.com/api',
    headers: {
        'Content-Type': 'application/json'
    }
});
```

Also update the uploads URL in any component that uses `/uploads/`:
```javascript
// Change from:
<video src={`/uploads/${lesson.video_file}`} />

// To:
<video src={`http://your-ec2-or-eb-url.amazonaws.com/uploads/${lesson.video_file}`} />
```

---

### STEP 4: Redeploy Your Application

After making changes, you MUST redeploy. Here's how:

**If using Elastic Beanstalk:**
```bash
# 1. Install EB CLI (if not installed)
pip install awsebcli

# 2. Navigate to your project
cd "d:\CC asgm"

# 3. Build the frontend first
cd frontend
npm run build

# 4. Copy build to backend's public folder
# (or configure EB to serve static files)

# 5. Deploy to Elastic Beanstalk
cd ..
eb deploy
```

**If using EC2 (SSH method):**
```bash
# 1. SSH into your EC2 instance
ssh -i "your-key.pem" ec2-user@your-ec2-public-ip

# 2. Navigate to your app folder
cd /var/app/current   # or wherever your app is deployed

# 3. Pull latest changes (if using Git)
git pull origin main

# 4. Install dependencies
cd backend && npm install

# 5. Restart the application
pm2 restart all
# OR
sudo systemctl restart your-app-service
```

---

### STEP 5: Verify the Fix is Working

**Test 1: Check backend is reachable**
Open your browser and go to:
```
http://your-ec2-or-eb-url.amazonaws.com/api/health
```
You should see:
```json
{"status": "OK", "message": "EduLearn API is running!"}
```

**Test 2: Check database connection**
Look at your EC2/EB logs. You should see:
```
✅ Database connected successfully!
   Host: edulearn-db.abc123xyz.us-east-1.rds.amazonaws.com:3306
   Database: edulearn
```

**Test 3: Check frontend is calling correct API**
1. Open your app in browser
2. Press F12 → Network tab
3. Click Login or load any page
4. Check the API calls - they should go to your AWS URL, NOT localhost

---

## 🔐 AWS Security Checklist

Before going live, make sure:

### RDS Security Group
- ✅ RDS Security Group allows inbound on port 3306 FROM your EC2 Security Group
- ❌ Do NOT allow 0.0.0.0/0 (public access) to RDS

### EC2 Security Group
- ✅ Allow inbound port 80 (HTTP) from 0.0.0.0/0
- ✅ Allow inbound port 443 (HTTPS) from 0.0.0.0/0
- ✅ Allow inbound port 22 (SSH) from your IP only
- ✅ Allow inbound port 5000 (Node.js) if needed

### Environment Variables on AWS
**NEVER put secrets in code.** Set them in:
- **Elastic Beanstalk**: Configuration → Software → Environment Properties
- **EC2**: Use a `.env` file on the server (not in Git)

---

## 📁 File Upload / Video Issue

If videos are stored locally (in `backend/uploads/`) and you deployed to AWS:

**Problem:** Files uploaded on your local machine are NOT on the AWS server.

**Solution Options:**

**Option A (Simple): Keep local uploads on EC2**
- Videos uploaded to EC2 stay on EC2
- Works fine as long as you don't restart/replace the instance

**Option B (Recommended): Use AWS S3**
```env
# In backend/.env on AWS:
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=edulearn-videos
```

---

## 🚨 Quick Diagnosis Checklist

Run through this checklist to find your issue:

```
[ ] 1. Is WampServer running? → If yes, your app is using local DB
[ ] 2. Is backend .env pointing to RDS endpoint? → Check DB_HOST
[ ] 3. Is frontend proxy pointing to AWS URL? → Check vite.config.js
[ ] 4. Did you rebuild frontend after changes? → Run: npm run build
[ ] 5. Did you redeploy to AWS after changes? → Run: eb deploy OR git pull on EC2
[ ] 6. Are EC2/EB security groups allowing traffic? → Check AWS Console
[ ] 7. Is RDS accessible from EC2? → Check RDS security group
```

---

## 💡 Summary

| Issue | Cause | Fix |
|-------|-------|-----|
| Changes not reflected | Not redeployed | Run `eb deploy` or `git pull` on EC2 |
| DB still using WampServer | `DB_HOST=localhost` in .env | Change to RDS endpoint |
| API calls going to localhost | `vite.config.js` proxy wrong | Update proxy target to AWS URL |
| Videos not loading | Files on local machine | Upload to S3 or re-upload on EC2 |
| App crashes on AWS | Wrong DB credentials | Check RDS username/password in .env |
