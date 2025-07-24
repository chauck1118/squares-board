# Production Deployment Guide

This guide covers the complete production deployment process for the March Madness Squares application using AWS Amplify.

## Prerequisites

### Required Tools
- Node.js 18+ and npm 9+
- AWS CLI configured with appropriate permissions
- AWS Amplify CLI (`@aws-amplify/cli`)
- Git for version control

### AWS Permissions Required
Your AWS user/role needs the following permissions:
- Full access to AWS Amplify
- Full access to AWS AppSync
- Full access to Amazon DynamoDB
- Full access to AWS Lambda
- Full access to Amazon Cognito
- Full access to AWS CloudWatch
- Full access to AWS Backup
- Full access to Amazon SNS
- IAM permissions for creating roles and policies

## Environment Setup

### 1. Configure Environment Variables

Create a `.env.production` file with the following variables:

```bash
NODE_ENV=production
AWS_REGION=us-east-1
ALERT_EMAIL=admin@your-domain.com
CUSTOM_DOMAIN=march-madness-squares.com  # Optional
```

### 2. Install Dependencies

```bash
npm ci
cd client && npm ci && cd ..
```

## Deployment Process

### Automated Deployment

The easiest way to deploy to production is using the automated deployment script:

```bash
npm run deploy:production
```

This script will:
1. ✅ Check prerequisites
2. 📦 Install dependencies
3. 🧪 Run tests
4. 🔨 Build the application
5. ☁️  Deploy backend infrastructure
6. 💾 Configure DynamoDB backup and recovery
7. 📊 Set up CloudWatch monitoring
8. 🚨 Create CloudWatch alarms
9. 📈 Configure DynamoDB auto-scaling
10. 🔥 Run load tests
11. 🏥 Verify deployment health

### Manual Deployment Steps

If you prefer to deploy manually or need to troubleshoot:

#### 1. Deploy Backend Infrastructure

```bash
npx ampx deploy --branch production
```

#### 2. Configure DynamoDB Backup

```bash
# Enable point-in-time recovery
aws dynamodb update-continuous-backups \
    --table-name MarchMadnessSquares \
    --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true

# Create backup vault
aws backup create-backup-vault \
    --backup-vault-name march-madness-squares-backup-vault \
    --encryption-key-arn alias/aws/backup
```

#### 3. Set Up Monitoring

```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
    --dashboard-name "march-madness-squares-production" \
    --dashboard-body file://scripts/cloudwatch-dashboard.json

# Create SNS topic for alerts
aws sns create-topic --name march-madness-squares-alerts
```

#### 4. Configure Auto-scaling

```bash
# Register DynamoDB auto-scaling targets
aws application-autoscaling register-scalable-target \
    --service-namespace dynamodb \
    --resource-id table/MarchMadnessSquares \
    --scalable-dimension dynamodb:table:ReadCapacityUnits \
    --min-capacity 5 \
    --max-capacity 100
```

## Post-Deployment Validation

### Automated Validation

Run the production validation script to verify all components:

```bash
npm run validate:production
```

This will check:
- ✅ Amplify app accessibility
- ✅ AppSync API health
- ✅ DynamoDB table status and configuration
- ✅ Lambda function health
- ✅ CloudWatch monitoring setup
- ✅ Backup configuration
- ✅ Security settings
- ✅ Performance metrics

### Manual Health Checks

1. **Application Accessibility**
   ```bash
   curl -I https://YOUR_APP_ID.amplifyapp.com
   ```

2. **GraphQL API Health**
   ```bash
   curl -X POST https://YOUR_API_ID.appsync-api.us-east-1.amazonaws.com/graphql \
        -H "Content-Type: application/json" \
        -d '{"query": "query { __typename }"}'
   ```

3. **DynamoDB Status**
   ```bash
   aws dynamodb describe-table --table-name MarchMadnessSquares
   ```

## Load Testing

### Automated Load Testing

Run load tests to validate performance under load:

```bash
npm run load:test
```

### Custom Load Testing

Configure custom load test parameters:

```bash
CONCURRENT_USERS=100 \
TEST_DURATION=300000 \
RAMP_UP_TIME=60000 \
node scripts/load-test.js
```

## Monitoring and Alerting

### CloudWatch Dashboard

Access your production dashboard:
- URL: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=march-madness-squares-production

### Key Metrics to Monitor

1. **Lambda Functions**
   - Duration (should be < 5 seconds average)
   - Error rate (should be < 1%)
   - Invocation count

2. **DynamoDB**
   - Read/Write capacity utilization (should be < 80%)
   - Throttled requests (should be 0)
   - System errors

3. **AppSync API**
   - Latency (should be < 1 second)
   - 4XX/5XX errors
   - Request count

4. **Application Metrics**
   - Active boards
   - Active users
   - Squares claimed
   - Payments processed

### Alert Configuration

Alerts are automatically configured for:
- High Lambda error rates (> 5 errors in 10 minutes)
- High Lambda duration (> 10 seconds average)
- DynamoDB throttling (> 1 throttled request)
- AppSync 5XX errors (> 10 errors in 10 minutes)

## Backup and Disaster Recovery

### Backup Schedule

Automated backups are configured with the following schedule:
- **Daily**: 2 AM UTC, retained for 30 days
- **Weekly**: Monday 3 AM UTC, retained for 90 days
- **Monthly**: 1st of month 4 AM UTC, retained for 365 days

### Point-in-Time Recovery

DynamoDB point-in-time recovery is enabled, allowing restoration to any point within the last 35 days.

### Disaster Recovery Testing

Automated DR tests run weekly to validate backup integrity and restore procedures.

## Performance Optimization

### Automatic Optimizations

The system includes automated performance monitoring that:
- Monitors Lambda function performance every 15 minutes
- Analyzes DynamoDB capacity utilization
- Optimizes cache settings hourly
- Provides recommendations for manual optimizations

### Manual Performance Tuning

1. **Lambda Memory Optimization**
   - Assignment function: 512MB (recommended)
   - Scoring function: 256MB (recommended)

2. **DynamoDB Capacity**
   - Auto-scaling enabled (5-100 capacity units)
   - Target utilization: 70%

3. **AppSync Caching**
   - TTL: 5 minutes for frequently accessed data
   - Caching keys include user ID and board ID

## Security Configuration

### HTTPS and Security Headers

All traffic is automatically encrypted with HTTPS. Security headers are configured:
- Strict-Transport-Security
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Content-Security-Policy

### Authentication

- AWS Cognito User Pools for authentication
- JWT tokens with configurable expiration
- Role-based access control for admin functions

### Data Protection

- DynamoDB encryption at rest (AWS managed keys)
- All API communications encrypted in transit
- Input validation on all GraphQL operations

## Troubleshooting

### Common Issues

1. **Deployment Fails**
   ```bash
   # Check AWS credentials
   aws sts get-caller-identity
   
   # Verify permissions
   aws iam get-user
   ```

2. **High Lambda Duration**
   ```bash
   # Check CloudWatch logs
   aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/"
   ```

3. **DynamoDB Throttling**
   ```bash
   # Check current capacity
   aws dynamodb describe-table --table-name MarchMadnessSquares
   
   # Check auto-scaling status
   aws application-autoscaling describe-scalable-targets --service-namespace dynamodb
   ```

### Log Locations

- **Lambda Logs**: `/aws/lambda/[function-name]`
- **AppSync Logs**: `/aws/appsync/apis/[api-id]`
- **Amplify Logs**: Available in Amplify Console

### Support Contacts

For production issues:
1. Check CloudWatch alarms and dashboard
2. Review application logs
3. Run validation script: `npm run validate:production`
4. Contact system administrator if issues persist

## Maintenance

### Regular Tasks

1. **Weekly**
   - Review CloudWatch dashboard
   - Check backup status
   - Review performance metrics

2. **Monthly**
   - Update dependencies
   - Review and rotate access keys
   - Analyze cost optimization opportunities

3. **Quarterly**
   - Conduct disaster recovery drill
   - Review and update monitoring thresholds
   - Security audit and penetration testing

### Updates and Deployments

For production updates:
1. Test thoroughly in staging environment
2. Schedule maintenance window
3. Deploy using automated script
4. Run validation checks
5. Monitor for 24 hours post-deployment

## Cost Optimization

### Monitoring Costs

- Use AWS Cost Explorer to track spending
- Set up billing alerts for unexpected cost increases
- Review DynamoDB capacity utilization monthly

### Optimization Strategies

1. **DynamoDB**: Use on-demand billing during low usage periods
2. **Lambda**: Optimize memory allocation based on performance metrics
3. **CloudWatch**: Adjust log retention periods based on compliance requirements
4. **Backup**: Review backup retention policies quarterly

---

## Quick Reference

### Important URLs
- **Application**: https://[APP_ID].amplifyapp.com
- **GraphQL API**: https://[API_ID].appsync-api.us-east-1.amazonaws.com/graphql
- **CloudWatch Dashboard**: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=march-madness-squares-production

### Key Commands
```bash
# Deploy to production
npm run deploy:production

# Validate production environment
npm run validate:production

# Run load tests
npm run load:test

# Check application logs
aws logs tail /aws/lambda/assignment --follow

# Monitor DynamoDB metrics
aws cloudwatch get-metric-statistics --namespace AWS/DynamoDB --metric-name ConsumedReadCapacityUnits
```

### Emergency Contacts
- **System Administrator**: admin@your-domain.com
- **AWS Support**: [Your AWS Support Plan]
- **On-call Engineer**: [Emergency Contact]