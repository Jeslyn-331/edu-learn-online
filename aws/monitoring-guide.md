# 📊 Monitoring & Scaling Guide - EduLearn

## CloudWatch Monitoring, Auto Scaling, and Cost Optimization

---

## 1. Amazon CloudWatch - Monitoring

### 1.1 Enable CloudWatch for EC2

CloudWatch is automatically enabled for basic EC2 metrics. For detailed monitoring:

1. Go to **EC2 → Select Instance → Actions → Monitor and Troubleshoot**
2. Enable **Detailed Monitoring** (1-minute intervals instead of 5-minute)

### 1.2 Key Metrics to Monitor

| Metric | Service | Threshold | Action |
|--------|---------|-----------|--------|
| CPU Utilization | EC2 | > 80% | Scale up |
| Memory Usage | EC2 (custom) | > 85% | Scale up |
| Database Connections | RDS | > 80% of max | Increase instance |
| Free Storage Space | RDS | < 20% | Increase storage |
| Read/Write Latency | RDS | > 20ms | Optimize queries |
| 4xx Errors | ALB | > 5% of requests | Check application |
| 5xx Errors | ALB | > 1% of requests | Check server logs |

### 1.3 Create CloudWatch Alarms

**High CPU Alarm:**
1. Go to **CloudWatch → Alarms → Create Alarm**
2. Select metric: **EC2 → Per-Instance → CPUUtilization**
3. Configure:
   - **Threshold**: Greater than 80%
   - **Period**: 5 minutes
   - **Evaluation periods**: 2 consecutive
   - **Action**: Send notification to SNS topic

```bash
# AWS CLI command to create CPU alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "edulearn-high-cpu" \
    --alarm-description "Alert when CPU exceeds 80%" \
    --metric-name CPUUtilization \
    --namespace AWS/EC2 \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --dimensions Name=InstanceId,Value=i-xxxxx \
    --alarm-actions arn:aws:sns:us-east-1:xxxxx:edulearn-alerts
```

**RDS Storage Alarm:**
```bash
aws cloudwatch put-metric-alarm \
    --alarm-name "edulearn-rds-storage-low" \
    --alarm-description "Alert when RDS free storage < 5GB" \
    --metric-name FreeStorageSpace \
    --namespace AWS/RDS \
    --statistic Average \
    --period 300 \
    --threshold 5368709120 \
    --comparison-operator LessThanThreshold \
    --evaluation-periods 1 \
    --dimensions Name=DBInstanceIdentifier,Value=edulearn-db \
    --alarm-actions arn:aws:sns:us-east-1:xxxxx:edulearn-alerts
```

### 1.4 Create SNS Topic for Notifications

1. Go to **SNS → Topics → Create Topic**
   - **Name**: `edulearn-alerts`
   - **Type**: Standard
2. Create subscription:
   - **Protocol**: Email
   - **Endpoint**: your-email@example.com
3. Confirm the subscription via email

### 1.5 CloudWatch Dashboard

Create a custom dashboard to view all metrics at once:

1. Go to **CloudWatch → Dashboards → Create Dashboard**
   - **Name**: `EduLearn-Dashboard`
2. Add widgets:
   - **EC2 CPU Utilization** (line graph)
   - **RDS Connections** (line graph)
   - **RDS Free Storage** (number)
   - **Application Load Balancer Request Count** (bar chart)
   - **Error Rate** (line graph)

### 1.6 Application Logging

Configure PM2 to send logs to CloudWatch:

```bash
# Install CloudWatch agent on EC2
sudo yum install -y amazon-cloudwatch-agent

# Create configuration
sudo nano /opt/aws/amazon-cloudwatch-agent/etc/config.json
```

```json
{
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/home/ec2-user/.pm2/logs/edulearn-api-out.log",
                        "log_group_name": "edulearn-app-logs",
                        "log_stream_name": "app-output"
                    },
                    {
                        "file_path": "/home/ec2-user/.pm2/logs/edulearn-api-error.log",
                        "log_group_name": "edulearn-app-logs",
                        "log_stream_name": "app-errors"
                    },
                    {
                        "file_path": "/var/log/nginx/access.log",
                        "log_group_name": "edulearn-nginx-logs",
                        "log_stream_name": "access"
                    }
                ]
            }
        }
    }
}
```

```bash
# Start CloudWatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config -m ec2 \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json -s
```

---

## 2. Auto Scaling

### 2.1 Why Auto Scaling?

When many users are purchasing courses simultaneously, a single server may not handle the load. Auto Scaling automatically adds or removes EC2 instances based on demand.

### 2.2 Set Up Auto Scaling

**Step 1: Create a Launch Template**

1. Go to **EC2 → Launch Templates → Create**
   - **Name**: `edulearn-launch-template`
   - **AMI**: Your configured AMI (create from existing EC2)
   - **Instance Type**: `t2.micro`
   - **Security Group**: `edulearn-ec2-sg`
   - **User Data** (startup script):

```bash
#!/bin/bash
cd /home/ec2-user/edulearn/backend
pm2 start server.js --name edulearn-api
sudo systemctl start nginx
```

**Step 2: Create an Application Load Balancer (ALB)**

1. Go to **EC2 → Load Balancers → Create**
   - **Type**: Application Load Balancer
   - **Name**: `edulearn-alb`
   - **Scheme**: Internet-facing
   - **Subnets**: Select public subnets
2. Create Target Group:
   - **Name**: `edulearn-targets`
   - **Port**: 80
   - **Health Check Path**: `/api/health`

**Step 3: Create Auto Scaling Group**

1. Go to **EC2 → Auto Scaling Groups → Create**
   - **Name**: `edulearn-asg`
   - **Launch Template**: `edulearn-launch-template`
   - **VPC**: `edulearn-vpc`
   - **Subnets**: Public subnets
   - **Load Balancer**: Attach `edulearn-alb`
2. Configure scaling:
   - **Minimum**: 1 instance
   - **Desired**: 1 instance
   - **Maximum**: 4 instances

**Step 4: Create Scaling Policies**

**Scale Out (add instances):**
- Metric: Average CPU > 70%
- Add: 1 instance
- Cooldown: 300 seconds

**Scale In (remove instances):**
- Metric: Average CPU < 30%
- Remove: 1 instance
- Cooldown: 300 seconds

```bash
# AWS CLI - Create scaling policy
aws autoscaling put-scaling-policy \
    --auto-scaling-group-name edulearn-asg \
    --policy-name scale-out \
    --policy-type TargetTrackingScaling \
    --target-tracking-configuration '{
        "PredefinedMetricSpecification": {
            "PredefinedMetricType": "ASGAverageCPUUtilization"
        },
        "TargetValue": 70.0
    }'
```

### 2.3 RDS Read Replicas (Database Scaling)

For read-heavy workloads (many users browsing courses):

1. Go to **RDS → Select Database → Actions → Create Read Replica**
2. Configure:
   - **Instance Class**: `db.t3.micro`
   - **Region**: Same region
3. Update application to use read replica for SELECT queries

---

## 3. Handling High Traffic (Course Purchases)

### 3.1 Database Connection Pooling

Already implemented in our backend:

```javascript
const pool = mysql.createPool({
    connectionLimit: 10,    // Max connections per instance
    waitForConnections: true,
    queueLimit: 0
});
```

### 3.2 Caching Strategy

Add Redis/ElastiCache for frequently accessed data:

```
Cache these:
- Course listings (TTL: 5 minutes)
- Course details (TTL: 2 minutes)
- User profile (TTL: 1 minute)

Don't cache:
- Wallet balance (always fresh)
- Purchase operations (always real-time)
```

### 3.3 Database Optimization

```sql
-- Indexes already created in schema for:
-- users.email (login lookups)
-- courses.instructor_id (instructor queries)
-- lessons.course_id (course-lesson joins)
-- enrollments (user_id, course_id) unique
-- purchases (user_id, lesson_id, course_id)
-- transactions (user_id, type, date)
```

---

## 4. Cost Optimization Strategies

### 4.1 Right-Sizing

| Service | Development | Production |
|---------|------------|------------|
| EC2 | t2.micro (Free Tier) | t3.small or t3.medium |
| RDS | db.t3.micro (Free Tier) | db.t3.small |
| S3 | Standard | Standard + Lifecycle rules |

### 4.2 Reserved Instances

For production workloads running 24/7:
- **1-year Reserved Instance**: ~40% savings
- **3-year Reserved Instance**: ~60% savings

### 4.3 S3 Cost Optimization

```
Lifecycle Rules:
- Move old videos to S3 Infrequent Access after 90 days
- Move to S3 Glacier after 365 days (archival)
- Delete incomplete multipart uploads after 7 days
```

### 4.4 Auto Scaling Cost Benefits

- Scale down to 1 instance during low traffic (nights/weekends)
- Scale up only when needed
- Pay only for what you use

### 4.5 CloudWatch Cost Tips

- Use basic monitoring (free) for development
- Enable detailed monitoring only for production
- Set log retention periods (don't keep logs forever)

### 4.6 Estimated Monthly Costs

| Service | Free Tier | Production (Small) |
|---------|-----------|-------------------|
| EC2 (t2.micro) | $0 | ~$8.50/month |
| RDS (db.t3.micro) | $0 | ~$15/month |
| S3 (10GB) | $0 | ~$0.23/month |
| CloudWatch | $0 | ~$3/month |
| Data Transfer | $0 (1GB) | ~$5/month |
| **Total** | **$0** | **~$32/month** |

---

## 5. Monitoring Checklist

- [ ] CloudWatch basic monitoring enabled for EC2
- [ ] CloudWatch alarms set for CPU, memory, storage
- [ ] SNS topic created for alert notifications
- [ ] CloudWatch dashboard created
- [ ] Application logs sent to CloudWatch Logs
- [ ] Auto Scaling group configured
- [ ] Load Balancer health checks configured
- [ ] RDS monitoring enabled
- [ ] Cost alerts set in AWS Billing
- [ ] Log retention policies configured

---

## 6. Suggested Improvements

1. **CDN**: Use CloudFront to cache and serve static assets globally
2. **ElastiCache**: Add Redis for session storage and caching
3. **SQS**: Use message queues for async operations (email notifications)
4. **Lambda**: Use serverless functions for background tasks
5. **CI/CD**: Set up CodePipeline for automated deployments
6. **Backup**: Enable automated RDS snapshots and S3 versioning
7. **Multi-AZ**: Deploy RDS in Multi-AZ for high availability
8. **WAF**: Add Web Application Firewall for DDoS protection
