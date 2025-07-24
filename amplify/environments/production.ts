import { defineBackend } from '@aws-amplify/backend';
import { auth } from '../auth/resource';
import { data } from '../data/resource';
import { assignmentFunction } from '../functions/assignment/resource';
import { scoringFunction } from '../functions/scoring/resource';

/**
 * Production Environment Configuration for March Madness Squares
 * Enhanced security, monitoring, and performance settings for production
 */
const backend = defineBackend({
  auth,
  data,
  assignmentFunction,
  scoringFunction,
});

// Production-specific configuration
backend.addOutput({
  custom: {
    hosting: {
      buildCommand: 'npm run build',
      buildPath: 'client/dist',
      startCommand: 'npm start',
    },
    monitoring: {
      cloudWatch: {
        enabled: true,
        logRetentionDays: 30,
        metricsEnabled: true,
      },
      xray: {
        enabled: true,
        tracingConfig: 'Active',
      },
    },
    security: {
      cors: {
        allowCredentials: true,
        allowedOrigins: [
          'https://main.d1234567890.amplifyapp.com', // Replace with actual domain
          'https://march-madness-squares.com', // Replace with custom domain
        ],
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date'],
      },
      headers: {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    },
    performance: {
      caching: {
        enabled: true,
        ttl: 3600, // 1 hour
      },
      compression: {
        enabled: true,
        level: 6,
      },
    },
  },
});

// Configure DynamoDB backup and point-in-time recovery
backend.data.addToRolePolicy({
  Effect: 'Allow',
  Action: [
    'dynamodb:CreateBackup',
    'dynamodb:DescribeBackup',
    'dynamodb:ListBackups',
    'dynamodb:RestoreTableFromBackup',
    'dynamodb:DescribeContinuousBackups',
    'dynamodb:UpdateContinuousBackups',
  ],
  Resource: '*',
});

// Configure CloudWatch monitoring
backend.addOutput({
  custom: {
    cloudWatch: {
      dashboards: {
        applicationDashboard: {
          widgets: [
            {
              type: 'metric',
              properties: {
                metrics: [
                  ['AWS/Lambda', 'Duration', 'FunctionName', 'assignment'],
                  ['AWS/Lambda', 'Duration', 'FunctionName', 'scoring'],
                  ['AWS/Lambda', 'Errors', 'FunctionName', 'assignment'],
                  ['AWS/Lambda', 'Errors', 'FunctionName', 'scoring'],
                  ['AWS/DynamoDB', 'ConsumedReadCapacityUnits', 'TableName', 'MarchMadnessSquares'],
                  ['AWS/DynamoDB', 'ConsumedWriteCapacityUnits', 'TableName', 'MarchMadnessSquares'],
                  ['AWS/AppSync', 'Latency'],
                  ['AWS/AppSync', '4XXError'],
                  ['AWS/AppSync', '5XXError'],
                ],
                period: 300,
                stat: 'Average',
                region: 'us-east-1',
                title: 'March Madness Squares - Application Metrics',
              },
            },
          ],
        },
      },
      alarms: [
        {
          name: 'HighLambdaErrors',
          description: 'Alert when Lambda error rate is high',
          metric: 'AWS/Lambda',
          statistic: 'Sum',
          threshold: 10,
          comparisonOperator: 'GreaterThanThreshold',
          evaluationPeriods: 2,
          period: 300,
        },
        {
          name: 'HighDynamoDBThrottling',
          description: 'Alert when DynamoDB throttling occurs',
          metric: 'AWS/DynamoDB',
          statistic: 'Sum',
          threshold: 5,
          comparisonOperator: 'GreaterThanThreshold',
          evaluationPeriods: 1,
          period: 300,
        },
      ],
    },
  },
});

export default backend;