# ☁️ AWS Deployment Guide - EduLearn

## Step-by-Step AWS Deployment for EduLearn Application

---

## 📌 Overview

This guide walks you through deploying EduLearn on AWS with:
- **VPC** for network isolation
- **EC2** or **Elastic Beanstalk** for the application
- **RDS (MySQL)** for the database
- **S3** for static assets (videos/images)

---

## Step 1: Create a VPC (Virtual Private Cloud)

A VPC provides an isolated network for your application.

### 1.1 Create the VPC

1. Go to **AWS Console → VPC → Create VPC**
2. Configure:
   - **Name**: `edulearn-vpc`
   - **IPv4 CIDR block**: `10.0.0.0/16`
   - Click **Create VPC**

### 1.2 Create Subnets

**Public Subnet** (for web server):
1. Go to **Subnets → Create Subnet**
2. Configure:
   - **VPC**: `edulearn-vpc`
   - **Name**: `edulearn-public-subnet`
   - **Availability Zone**: `us-east-1a`
   - **IPv4 CIDR**: `10.0.1.0/24`

**Private Subnet** (for database):
1. Create another subnet:
   - **Name**: `edulearn-private-subnet-1`
   - **Availability Zone**: `us-east-1a`
   - **IPv4 CIDR**: `10.0.2.0/24`

2. Create a second private subnet (required for RDS):
   - **Name**: `edulearn-private-subnet-2`
   - **Availability Zone**: `us-east-1b`
   - **IPv4 CIDR**: `10.0.3.0/24`

### 1.3 Create Internet Gateway

1. Go to **Internet Gateways → Create**
   - **Name**: `edulearn-igw`
2. **Attach** it to `edulearn-vpc`

### 1.4 Configure Route Tables

**Public Route Table:**
1. Go to **Route Tables → Create**
   - **Name**: `edulearn-public-rt`
   - **VPC**: `edulearn-vpc`
2. Add route:
   - **Destination**: `0.0.0.0/0`
   - **Target**: `edulearn-igw`
3. **Associate** with `edulearn-public-subnet`

**Private Route Table:**
1. Create another route table:
   - **Name**: `edulearn-private-rt`
2. Associate with both private subnets
3. No internet route (keeps database private)

---

## Step 2: Set Up Amazon RDS (Database)

### 2.1 Create DB Subnet Group

1. Go to **RDS → Subnet Groups → Create**
   - **Name**: `edulearn-db-subnet-group`
   - **VPC**: `edulearn-vpc`
   - Add both private subnets

### 2.2 Create Security Group for RDS

1. Go to **EC2 → Security Groups → Create**
   - **Name**: `edulearn-rds-sg`
   - **VPC**: `edulearn-vpc`
   - **Inbound Rule**:
     - Type: `MySQL/Aurora`
     - Port: `3306`
     - Source: `edulearn-ec2-sg` (the EC2 security group)
   - This ensures **only the backend can access the database**

### 2.3 Create RDS Instance

1. Go to **RDS → Create Database**
2. Configure:
   - **Engine**: MySQL 8.0
   - **Template**: Free Tier (for development)
   - **DB Instance Identifier**: `edulearn-db`
   - **Master Username**: `admin`
   - **Master Password**: (choose a strong password)
   - **DB Instance Class**: `db.t3.micro` (Free Tier)
   - **Storage**: 20 GB (General Purpose SSD)
   - **VPC**: `edulearn-vpc`
   - **Subnet Group**: `edulearn-db-subnet-group`
   - **Public Access**: **No** (important for security!)
   - **Security Group**: `edulearn-rds-sg`
   - **Database Name**: `edulearn`
3. Click **Create Database**
4. Wait for status to become "Available"
5. Note the **Endpoint** (e.g., `edulearn-db.xxxxx.us-east-1.rds.amazonaws.com`)

### 2.4 Initialize Database

Connect to RDS from your EC2 instance and run the schema:

```bash
# SSH into your EC2 instance first, then:
mysql -h edulearn-db.xxxxx.us-east-1.rds.amazonaws.com -u admin -p < database/schema.sql
```

---

## Step 3: Set Up Amazon S3 (Storage)

### 3.1 Create S3 Bucket

1. Go to **S3 → Create Bucket**
   - **Name**: `edulearn-assets-[your-unique-id]`
   - **Region**: `us-east-1`
   - **Block Public Access**: Uncheck "Block all public access" (for public assets)
   - Enable **Versioning** (optional but recommended)

### 3.2 Configure Bucket Policy

Add this bucket policy to allow public read access for course assets:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::edulearn-assets-[your-unique-id]/*"
        }
    ]
}
```

### 3.3 Enable CORS

Add CORS configuration for the bucket:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```

### 3.4 Create Folders

Create these folders in the bucket:
- `videos/` - For lesson videos
- `images/` - For course thumbnails
- `assets/` - For other static files

---

## Step 4: Deploy Application on EC2

### 4.1 Create Security Group for EC2

1. Go to **EC2 → Security Groups → Create**
   - **Name**: `edulearn-ec2-sg`
   - **VPC**: `edulearn-vpc`
   - **Inbound Rules**:
     - SSH (Port 22) - Your IP only
     - HTTP (Port 80) - Anywhere (0.0.0.0/0)
     - HTTPS (Port 443) - Anywhere (0.0.0.0/0)
     - Custom TCP (Port 5000) - Anywhere (for API during development)

### 4.2 Launch EC2 Instance

1. Go to **EC2 → Launch Instance**
2. Configure:
   - **Name**: `edulearn-server`
   - **AMI**: Amazon Linux 2023 or Ubuntu 22.04
   - **Instance Type**: `t2.micro` (Free Tier)
   - **Key Pair**: Create or select existing
   - **Network**: `edulearn-vpc`
   - **Subnet**: `edulearn-public-subnet`
   - **Auto-assign Public IP**: Enable
   - **Security Group**: `edulearn-ec2-sg`
   - **Storage**: 20 GB

### 4.3 Connect and Set Up Server

```bash
# SSH into the instance
ssh -i your-key.pem ec2-user@your-ec2-public-ip

# Update system
sudo yum update -y   # Amazon Linux
# OR
sudo apt update && sudo apt upgrade -y   # Ubuntu

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs   # Amazon Linux
# OR
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs   # Ubuntu

# Install MySQL client (to connect to RDS)
sudo yum install -y mysql   # Amazon Linux
# OR
sudo apt install -y mysql-client   # Ubuntu

# Install Git
sudo yum install -y git   # Amazon Linux
# OR
sudo apt install -y git   # Ubuntu

# Install PM2 (process manager for Node.js)
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo yum install -y nginx   # Amazon Linux
# OR
sudo apt install -y nginx   # Ubuntu
```

### 4.4 Deploy the Application

```bash
# Clone your project (or upload via SCP)
cd /home/ec2-user
git clone https://github.com/your-repo/edulearn.git
cd edulearn

# Install backend dependencies
cd backend
npm install

# Create .env file with production settings
cat > .env << 'EOF'
PORT=5000
NODE_ENV=production
DB_HOST=edulearn-db.xxxxx.us-east-1.rds.amazonaws.com
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=your_rds_password
DB_NAME=edulearn
JWT_SECRET=your_production_secret_key_change_this
JWT_EXPIRES_IN=24h
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=edulearn-assets-your-id
FRONTEND_URL=http://your-ec2-public-ip
EOF

# Initialize database
mysql -h edulearn-db.xxxxx.us-east-1.rds.amazonaws.com -u admin -p < ../database/schema.sql

# Start backend with PM2
pm2 start server.js --name edulearn-api
pm2 save
pm2 startup  # Auto-start on reboot

# Build frontend
cd ../frontend
npm install
npm run build
```

### 4.5 Configure Nginx

```bash
sudo nano /etc/nginx/conf.d/edulearn.conf
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-ec2-public-ip;

    # Serve frontend static files
    root /home/ec2-user/edulearn/frontend/dist;
    index index.html;

    # Frontend routes (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## Step 5: Alternative - Deploy with Elastic Beanstalk

If you prefer a managed deployment:

### 5.1 Install EB CLI

```bash
pip install awsebcli
```

### 5.2 Initialize and Deploy

```bash
cd backend

# Initialize Elastic Beanstalk
eb init edulearn-app --platform node.js --region us-east-1

# Create environment
eb create edulearn-production \
  --instance-type t2.micro \
  --single \
  --vpc.id vpc-xxxxx \
  --vpc.publicip \
  --vpc.ec2subnets subnet-xxxxx

# Set environment variables
eb setenv \
  DB_HOST=edulearn-db.xxxxx.rds.amazonaws.com \
  DB_PORT=3306 \
  DB_USER=admin \
  DB_PASSWORD=your_password \
  DB_NAME=edulearn \
  JWT_SECRET=your_secret \
  NODE_ENV=production

# Deploy
eb deploy
```

---

## Step 6: Domain and SSL (Optional)

### 6.1 Register Domain (Route 53)
1. Go to **Route 53 → Register Domain**
2. Point domain to your EC2 Elastic IP or Load Balancer

### 6.2 SSL Certificate (ACM)
1. Go to **ACM → Request Certificate**
2. Add your domain name
3. Validate via DNS
4. Attach to your Load Balancer or use Certbot on EC2

---

## 📋 Deployment Checklist

- [ ] VPC created with public and private subnets
- [ ] Internet Gateway attached and route tables configured
- [ ] RDS MySQL instance running in private subnet
- [ ] Database schema initialized
- [ ] S3 bucket created for static assets
- [ ] EC2 instance launched in public subnet
- [ ] Node.js and dependencies installed
- [ ] Backend running with PM2
- [ ] Frontend built and served by Nginx
- [ ] Security groups properly configured
- [ ] Environment variables set (no hardcoded secrets)
- [ ] Application accessible via public IP

---

## 🔧 Useful Commands

```bash
# Check backend status
pm2 status
pm2 logs edulearn-api

# Restart backend
pm2 restart edulearn-api

# Check Nginx status
sudo systemctl status nginx

# View Nginx logs
sudo tail -f /var/log/nginx/error.log

# Connect to RDS
mysql -h your-rds-endpoint -u admin -p edulearn
```
