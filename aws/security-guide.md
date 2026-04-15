# 🔐 Security Implementation Guide - EduLearn

## Comprehensive Security Measures for the EduLearn Platform

---

## 1. IAM (Identity and Access Management)

### 1.1 Create IAM Roles (Least Privilege Principle)

**EC2 Instance Role** - Only permissions the server needs:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::edulearn-assets-*/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:*:*:*"
        }
    ]
}
```

**Steps to create:**
1. Go to **IAM → Roles → Create Role**
2. Select **AWS Service → EC2**
3. Attach the custom policy above
4. Name: `edulearn-ec2-role`
5. Attach this role to your EC2 instance

### 1.2 Create IAM Users

- **Admin User**: Full access (for deployment only)
- **Developer User**: Limited access (no billing, no IAM changes)
- **CI/CD User**: Programmatic access only (for automated deployments)

### 1.3 Enable MFA (Multi-Factor Authentication)

1. Go to **IAM → Users → Select User → Security Credentials**
2. Click **Assign MFA Device**
3. Choose **Virtual MFA Device**
4. Scan QR code with Google Authenticator or Authy
5. Enter two consecutive codes to verify
6. **Enable MFA for the root account** (critical!)

---

## 2. Application Security

### 2.1 Password Hashing (bcrypt)

Passwords are **never stored in plain text**. We use bcrypt with 10 salt rounds:

```javascript
// How passwords are hashed in our app (routes/auth.js)
const bcrypt = require('bcryptjs');

// Registration - hash password before storing
const hashedPassword = await bcrypt.hash(password, 10);

// Login - compare password with stored hash
const isValid = await bcrypt.compare(inputPassword, storedHash);
```

**Why bcrypt?**
- Automatically generates a unique salt for each password
- Computationally expensive (slow to brute-force)
- Industry standard for password hashing

### 2.2 JWT Token Security

```javascript
// Token generation with expiration
const token = jwt.sign(
    { user_id, email, role },
    process.env.JWT_SECRET,  // Secret from environment variable
    { expiresIn: '24h' }     // Token expires in 24 hours
);
```

**Security measures:**
- JWT secret stored in environment variables (never in code)
- Tokens expire after 24 hours
- Token verified on every protected request
- Invalid tokens are rejected immediately

### 2.3 API Endpoint Protection

```
Public Routes (no auth required):
  GET  /api/courses          - Browse courses
  GET  /api/courses/:id      - View course details
  POST /api/auth/register    - Create account
  POST /api/auth/login       - Login

Protected Routes (JWT required):
  GET  /api/auth/me           - Get profile
  POST /api/wallet/topup      - Add money
  POST /api/purchases/*       - Buy content
  GET  /api/dashboard         - View purchases

Instructor Routes (JWT + instructor role):
  POST /api/courses           - Create course
  PUT  /api/courses/:id       - Update course
  DELETE /api/courses/:id     - Delete course
  GET  /api/admin/*           - Instructor dashboard

Admin Routes (JWT + admin role):
  Full access to all endpoints
```

### 2.4 Input Validation

All user inputs are validated before processing:

```javascript
// Email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password minimum length
if (password.length < 6) { /* reject */ }

// Price validation
if (price < 0) { /* reject */ }

// Amount limits
if (topupAmount > 10000) { /* reject */ }
```

### 2.5 SQL Injection Prevention

We use **parameterized queries** (prepared statements) to prevent SQL injection:

```javascript
// ✅ SAFE - Parameterized query
const [users] = await pool.query(
    'SELECT * FROM users WHERE email = ?',
    [email]  // Parameter is safely escaped
);

// ❌ UNSAFE - Never do this!
// const [users] = await pool.query(
//     `SELECT * FROM users WHERE email = '${email}'`
// );
```

### 2.6 Security Headers (Helmet.js)

```javascript
const helmet = require('helmet');
app.use(helmet());
```

Helmet automatically sets these security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HSTS)
- Content Security Policy headers

### 2.7 CORS Configuration

```javascript
app.use(cors({
    origin: process.env.FRONTEND_URL,  // Only allow our frontend
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## 3. Wallet & Transaction Security

### 3.1 Database Transactions (ACID Compliance)

All financial operations use database transactions to ensure data consistency:

```javascript
const connection = await pool.getConnection();
try {
    await connection.beginTransaction();
    
    // 1. Check balance
    // 2. Deduct from buyer
    // 3. Record purchase
    // 4. Credit instructor
    // 5. Record wallet history
    
    await connection.commit();  // All succeed together
} catch (error) {
    await connection.rollback();  // All fail together
} finally {
    connection.release();
}
```

### 3.2 Balance Verification

Before every purchase:
1. Check if user has sufficient balance
2. Verify the item hasn't been purchased already
3. Prevent buying own content
4. Validate the item exists and is available

### 3.3 Amount Limits

- Maximum top-up: $10,000 per transaction
- Minimum top-up: $1
- Prices cannot be negative
- All amounts stored as DECIMAL(10,2) for precision

---

## 4. Network Security (AWS)

### 4.1 Security Groups

**EC2 Security Group** (`edulearn-ec2-sg`):
| Type | Port | Source | Purpose |
|------|------|--------|---------|
| SSH | 22 | Your IP only | Admin access |
| HTTP | 80 | 0.0.0.0/0 | Web traffic |
| HTTPS | 443 | 0.0.0.0/0 | Secure web traffic |

**RDS Security Group** (`edulearn-rds-sg`):
| Type | Port | Source | Purpose |
|------|------|--------|---------|
| MySQL | 3306 | edulearn-ec2-sg | Backend only |

**Key principle**: Database is in a private subnet with NO public access.

### 4.2 Network ACLs

Additional layer of security at the subnet level:
- Public subnet: Allow HTTP/HTTPS inbound, all outbound
- Private subnet: Allow MySQL from public subnet only

### 4.3 Encryption

**Data in Transit:**
- Use HTTPS (SSL/TLS) for all web traffic
- RDS connections use SSL

**Data at Rest:**
- Enable RDS encryption (AES-256)
- Enable S3 server-side encryption (SSE-S3)

```bash
# Enable RDS encryption during creation
# Check "Enable encryption" in RDS console

# Enable S3 encryption
# Bucket → Properties → Default encryption → SSE-S3
```

---

## 5. Environment Variables Security

### 5.1 Never Commit Secrets

Add `.env` to `.gitignore`:

```
# .gitignore
.env
node_modules/
```

### 5.2 Use AWS Systems Manager Parameter Store

For production, store secrets in AWS Parameter Store:

```bash
# Store secrets
aws ssm put-parameter \
    --name "/edulearn/db-password" \
    --value "your-password" \
    --type "SecureString"

# Retrieve in application
aws ssm get-parameter \
    --name "/edulearn/db-password" \
    --with-decryption
```

---

## 6. Security Checklist

### Application Level
- [x] Passwords hashed with bcrypt (10 salt rounds)
- [x] JWT tokens with expiration
- [x] Role-based access control (student, instructor, admin)
- [x] Input validation on all endpoints
- [x] Parameterized SQL queries (prevent SQL injection)
- [x] Security headers via Helmet.js
- [x] CORS restricted to frontend origin
- [x] Database transactions for financial operations

### AWS Level
- [ ] IAM roles with least privilege
- [ ] MFA enabled on all IAM users
- [ ] MFA enabled on root account
- [ ] RDS in private subnet (no public access)
- [ ] Security groups properly configured
- [ ] RDS encryption enabled
- [ ] S3 encryption enabled
- [ ] SSL/TLS for all connections
- [ ] Environment variables (no hardcoded secrets)
- [ ] CloudTrail enabled for audit logging

---

## 7. Suggested Security Improvements

1. **Rate Limiting**: Add express-rate-limit to prevent brute-force attacks
2. **CAPTCHA**: Add reCAPTCHA on login/register forms
3. **Password Reset**: Implement secure password reset via email
4. **Session Management**: Add token refresh mechanism
5. **Audit Logging**: Log all admin actions for accountability
6. **WAF (Web Application Firewall)**: Use AWS WAF for additional protection
7. **Penetration Testing**: Regular security testing
8. **Dependency Scanning**: Use `npm audit` to check for vulnerabilities
