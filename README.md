# EduLearn – Online Course / EdTech Portal

## 📌 System Architecture

### Overview
EduLearn is a full-stack web application that allows users to browse, purchase, and learn from online courses. Instructors can create and sell courses/lessons. The system includes a wallet-based payment system.

### Architecture Diagram (Text)

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS Cloud (VPC)                          │
│                                                                 │
│  ┌──────────────── Public Subnet ────────────────┐              │
│  │                                                │              │
│  │  ┌─────────────┐    ┌──────────────────────┐  │              │
│  │  │   Internet   │    │  EC2 / Elastic       │  │              │
│  │  │   Gateway    │───▶│  Beanstalk           │  │              │
│  │  └─────────────┘    │  (Node.js Backend)   │  │              │
│  │                      │  + React Frontend    │  │              │
│  │                      └──────────┬───────────┘  │              │
│  └─────────────────────────────────┼──────────────┘              │
│                                    │                             │
│  ┌──────────────── Private Subnet ─┼──────────────┐              │
│  │                                 │               │              │
│  │                      ┌──────────▼───────────┐  │              │
│  │                      │  Amazon RDS          │  │              │
│  │                      │  (MySQL/PostgreSQL)  │  │              │
│  │                      └──────────────────────┘  │              │
│  └─────────────────────────────────────────────────┘              │
│                                                                 │
│  ┌─────────────────────────────────────────────────┐              │
│  │  Amazon S3 – Static Assets (videos, images)    │              │
│  └─────────────────────────────────────────────────┘              │
│                                                                 │
│  ┌─────────────────────────────────────────────────┐              │
│  │  CloudWatch – Monitoring & Logging              │              │
│  │  Auto Scaling – Handle traffic spikes           │              │
│  │  IAM – Role-based access control                │              │
│  └─────────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | React (Vite) | User interface for browsing, purchasing, learning |
| Backend | Node.js (Express) | RESTful API, business logic, authentication |
| Database | MySQL (Amazon RDS) | Store users, courses, lessons, transactions |
| Storage | Amazon S3 | Store video files and images |
| Compute | EC2 / Elastic Beanstalk | Host the application |
| Networking | VPC, Subnets, IGW | Secure network architecture |
| Security | IAM, JWT, bcrypt | Authentication & authorization |
| Monitoring | CloudWatch | Logs, metrics, alarms |

### Data Flow
1. User accesses the frontend (React app) via browser
2. Frontend makes API calls to the Express backend
3. Backend authenticates requests using JWT tokens
4. Backend performs CRUD operations on MySQL database
5. Static assets (videos/images) are served from S3
6. All actions are logged via CloudWatch

## 📦 Project Structure

```
edulearn/
├── backend/                 # Express.js API server
│   ├── config/             # Database & app configuration
│   ├── middleware/          # Auth middleware
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── controllers/        # Route handlers
│   ├── database/           # SQL scripts
│   ├── .env.example        # Environment variables template
│   ├── server.js           # Entry point
│   └── package.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service calls
│   │   ├── context/        # Auth context
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── aws/                    # AWS deployment guides
│   ├── deployment-guide.md
│   ├── security-guide.md
│   └── monitoring-guide.md
├── database/               # Database scripts
│   └── schema.sql
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0+ (or Amazon RDS)
- npm or yarn

### Local Development

1. **Clone and install dependencies:**
```bash
cd backend && npm install
cd ../frontend && npm install
```

2. **Set up database:**
```bash
mysql -u root -p < database/schema.sql
```

3. **Configure environment:**
```bash
cp backend/.env.example backend/.env
# Edit .env with your database credentials
```

4. **Start backend:**
```bash
cd backend && npm run dev
```

5. **Start frontend:**
```bash
cd frontend && npm run dev
```

6. **Open browser:** http://localhost:5173
