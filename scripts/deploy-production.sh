#!/bin/bash

# Production Deployment Script for March Madness Squares
# This script handles the complete production deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="production"
AWS_REGION="${AWS_REGION:-us-east-1}"
ALERT_EMAIL="${ALERT_EMAIL:-admin@march-madness-squares.com}"

echo -e "${BLUE}🚀 Starting production deployment for March Madness Squares${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Region: ${AWS_REGION}${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

# Check if AWS CLI is installed and configured
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if Amplify CLI is installed
if ! command -v npx ampx &> /dev/null; then
    print_error "Amplify CLI is not installed. Please install it first."
    exit 1
fi

# Check if Node.js and npm are installed
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    print_error "Node.js and npm are required. Please install them first."
    exit 1
fi

print_status "Prerequisites check completed"

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm ci
cd client && npm ci && cd ..
print_status "Dependencies installed"

# Run tests before deployment
echo -e "${BLUE}🧪 Running tests before deployment...${NC}"
npm run test
npm run test:amplify
print_status "Tests passed"

# Build the application
echo -e "${BLUE}🔨 Building application...${NC}"
npm run build
print_status "Application built successfully"

# Deploy backend infrastructure
echo -e "${BLUE}☁️  Deploying backend infrastructure...${NC}"
npx ampx deploy --branch ${ENVIRONMENT}

# Get deployment outputs
AMPLIFY_APP_ID=$(aws amplify list-apps --query "apps[?name=='march-madness-squares'].appId" --output text)
APPSYNC_API_ID=$(aws appsync list-graphql-apis --query "graphqlApis[?name=='march-madness-squares-${ENVIRONMENT}'].apiId" --output text)
DYNAMODB_TABLE_NAME=$(aws dynamodb list-tables --query "TableNames[?contains(@, 'MarchMadnessSquares')]" --output text)

print_status "Backend infrastructure deployed"
echo -e "${BLUE}App ID: ${AMPLIFY_APP_ID}${NC}"
echo -e "${BLUE}AppSync API ID: ${APPSYNC_API_ID}${NC}"
echo -e "${BLUE}DynamoDB Table: ${DYNAMODB_TABLE_NAME}${NC}"

# Configure DynamoDB backup and point-in-time recovery
echo -e "${BLUE}💾 Configuring DynamoDB backup and recovery...${NC}"

# Enable point-in-time recovery
aws dynamodb update-continuous-backups \
    --table-name ${DYNAMODB_TABLE_NAME} \
    --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true

# Create backup vault if it doesn't exist
aws backup create-backup-vault \
    --backup-vault-name march-madness-squares-backup-vault \
    --encryption-key-arn alias/aws/backup || true

print_status "DynamoDB backup and recovery configured"

# Set up CloudWatch monitoring
echo -e "${BLUE}📊 Setting up CloudWatch monitoring...${NC}"

# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
    --dashboard-name "march-madness-squares-production" \
    --dashboard-body file://scripts/cloudwatch-dashboard.json

# Create SNS topic for alerts
ALERT_TOPIC_ARN=$(aws sns create-topic \
    --name march-madness-squares-alerts \
    --query 'TopicArn' --output text)

# Subscribe email to alerts
aws sns subscribe \
    --topic-arn ${ALERT_TOPIC_ARN} \
    --protocol email \
    --notification-endpoint ${ALERT_EMAIL}

print_status "CloudWatch monitoring configured"
echo -e "${BLUE}Alert topic: ${ALERT_TOPIC_ARN}${NC}"

# Create CloudWatch alarms
echo -e "${BLUE}🚨 Creating CloudWatch alarms...${NC}"

# Lambda error alarms
for FUNCTION_NAME in "assignment" "scoring"; do
    aws cloudwatch put-metric-alarm \
        --alarm-name "march-madness-${FUNCTION_NAME}-errors" \
        --alarm-description "High error rate for ${FUNCTION_NAME} function" \
        --metric-name Errors \
        --namespace AWS/Lambda \
        --statistic Sum \
        --period 300 \
        --threshold 5 \
        --comparison-operator GreaterThanThreshold \
        --evaluation-periods 2 \
        --alarm-actions ${ALERT_TOPIC_ARN} \
        --dimensions Name=FunctionName,Value=${FUNCTION_NAME}
done

# DynamoDB throttling alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "march-madness-dynamo-throttling" \
    --alarm-description "DynamoDB requests are being throttled" \
    --metric-name ThrottledRequests \
    --namespace AWS/DynamoDB \
    --statistic Sum \
    --period 300 \
    --threshold 1 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 1 \
    --alarm-actions ${ALERT_TOPIC_ARN} \
    --dimensions Name=TableName,Value=${DYNAMODB_TABLE_NAME}

print_status "CloudWatch alarms created"

# Configure auto-scaling for DynamoDB
echo -e "${BLUE}📈 Configuring DynamoDB auto-scaling...${NC}"

# Register scalable targets
aws application-autoscaling register-scalable-target \
    --service-namespace dynamodb \
    --resource-id table/${DYNAMODB_TABLE_NAME} \
    --scalable-dimension dynamodb:table:ReadCapacityUnits \
    --min-capacity 5 \
    --max-capacity 100

aws application-autoscaling register-scalable-target \
    --service-namespace dynamodb \
    --resource-id table/${DYNAMODB_TABLE_NAME} \
    --scalable-dimension dynamodb:table:WriteCapacityUnits \
    --min-capacity 5 \
    --max-capacity 100

# Create scaling policies
aws application-autoscaling put-scaling-policy \
    --service-namespace dynamodb \
    --resource-id table/${DYNAMODB_TABLE_NAME} \
    --scalable-dimension dynamodb:table:ReadCapacityUnits \
    --policy-name march-madness-read-scaling-policy \
    --policy-type TargetTrackingScaling \
    --target-tracking-scaling-policy-configuration '{
        "TargetValue": 70.0,
        "PredefinedMetricSpecification": {
            "PredefinedMetricType": "DynamoDBReadCapacityUtilization"
        }
    }'

aws application-autoscaling put-scaling-policy \
    --service-namespace dynamodb \
    --resource-id table/${DYNAMODB_TABLE_NAME} \
    --scalable-dimension dynamodb:table:WriteCapacityUnits \
    --policy-name march-madness-write-scaling-policy \
    --policy-type TargetTrackingScaling \
    --target-tracking-scaling-policy-configuration '{
        "TargetValue": 70.0,
        "PredefinedMetricSpecification": {
            "PredefinedMetricType": "DynamoDBWriteCapacityUtilization"
        }
    }'

print_status "DynamoDB auto-scaling configured"

# Run load tests
echo -e "${BLUE}🔥 Running load tests...${NC}"
LOAD_TEST_URL="https://${AMPLIFY_APP_ID}.amplifyapp.com" \
GRAPHQL_ENDPOINT="https://${APPSYNC_API_ID}.appsync-api.${AWS_REGION}.amazonaws.com/graphql" \
CONCURRENT_USERS=50 \
TEST_DURATION=180000 \
node scripts/load-test.js

print_status "Load tests completed"

# Verify deployment health
echo -e "${BLUE}🏥 Verifying deployment health...${NC}"

# Check Amplify app status
APP_STATUS=$(aws amplify get-app --app-id ${AMPLIFY_APP_ID} --query 'app.defaultDomain' --output text)
echo -e "${BLUE}App URL: https://${APP_STATUS}${NC}"

# Check AppSync API health
API_STATUS=$(aws appsync get-graphql-api --api-id ${APPSYNC_API_ID} --query 'graphqlApi.apiId' --output text)
if [ "${API_STATUS}" = "${APPSYNC_API_ID}" ]; then
    print_status "AppSync API is healthy"
else
    print_error "AppSync API health check failed"
    exit 1
fi

# Check DynamoDB table status
TABLE_STATUS=$(aws dynamodb describe-table --table-name ${DYNAMODB_TABLE_NAME} --query 'Table.TableStatus' --output text)
if [ "${TABLE_STATUS}" = "ACTIVE" ]; then
    print_status "DynamoDB table is active"
else
    print_error "DynamoDB table is not active: ${TABLE_STATUS}"
    exit 1
fi

# Final deployment summary
echo -e "${GREEN}🎉 Production deployment completed successfully!${NC}"
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Application URL: https://${APP_STATUS}${NC}"
echo -e "${GREEN}GraphQL Endpoint: https://${APPSYNC_API_ID}.appsync-api.${AWS_REGION}.amazonaws.com/graphql${NC}"
echo -e "${GREEN}CloudWatch Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=march-madness-squares-production${NC}"
echo -e "${GREEN}Alert Topic: ${ALERT_TOPIC_ARN}${NC}"
echo -e "${GREEN}================================${NC}"

# Save deployment info
cat > deployment-info.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "${ENVIRONMENT}",
  "region": "${AWS_REGION}",
  "amplifyAppId": "${AMPLIFY_APP_ID}",
  "appSyncApiId": "${APPSYNC_API_ID}",
  "dynamoTableName": "${DYNAMODB_TABLE_NAME}",
  "alertTopicArn": "${ALERT_TOPIC_ARN}",
  "applicationUrl": "https://${APP_STATUS}",
  "graphqlEndpoint": "https://${APPSYNC_API_ID}.appsync-api.${AWS_REGION}.amazonaws.com/graphql"
}
EOF

print_status "Deployment information saved to deployment-info.json"

echo -e "${BLUE}📧 Please check your email (${ALERT_EMAIL}) to confirm SNS subscription for alerts.${NC}"
echo -e "${BLUE}🔍 Monitor the application using the CloudWatch dashboard link above.${NC}"