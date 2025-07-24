import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { assignmentFunction } from './functions/assignment/resource';
import { scoringFunction } from './functions/scoring/resource';
import { DynamoDBBackupConfig, enablePointInTimeRecovery } from './data/backup-config';
import { CloudWatchMonitoring } from './monitoring/cloudwatch-config';
import { PerformanceOptimization, performanceConfig } from './performance/optimization-config';

/**
 * March Madness Squares Backend Configuration
 * Production-ready setup with monitoring, backup, and performance optimization
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  assignmentFunction,
  scoringFunction,
});

// Configure hosting for the frontend
backend.addOutput({
  custom: {
    hosting: {
      buildCommand: 'npm run build',
      buildPath: 'client/dist',
      startCommand: process.env.NODE_ENV === 'production' ? 'npm start' : 'npm run dev',
    },
  },
});

// Production environment enhancements
if (process.env.NODE_ENV === 'production') {
  // Add DynamoDB backup and disaster recovery
  new DynamoDBBackupConfig(backend.createStack('BackupStack'), 'DynamoDBBackup');
  
  // Add CloudWatch monitoring and alerting
  new CloudWatchMonitoring(backend.createStack('MonitoringStack'), 'CloudWatchMonitoring', {
    alertEmail: process.env.ALERT_EMAIL || 'admin@march-madness-squares.com',
    lambdaFunctionNames: ['assignment', 'scoring'],
    dynamoTableName: 'MarchMadnessSquares', // This will be the actual table name
    appSyncApiId: 'APPSYNC_API_ID', // This will be replaced with actual API ID
  });
  
  // Add performance optimization
  new PerformanceOptimization(backend.createStack('PerformanceStack'), 'PerformanceOptimization', {
    lambdaFunctionNames: ['assignment', 'scoring'],
    dynamoTableName: 'MarchMadnessSquares',
    appSyncApiId: 'APPSYNC_API_ID',
  });
  
  // Configure Lambda functions with production settings
  backend.assignmentFunction.addEnvironment('NODE_ENV', 'production');
  backend.assignmentFunction.addEnvironment('LOG_LEVEL', 'info');
  backend.scoringFunction.addEnvironment('NODE_ENV', 'production');
  backend.scoringFunction.addEnvironment('LOG_LEVEL', 'info');
  
  // Enable DynamoDB point-in-time recovery
  backend.data.addDynamoDbConfig(enablePointInTimeRecovery);
  
  // Configure production security headers
  backend.addOutput({
    custom: {
      security: {
        headers: {
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.amazonaws.com https://*.amplifyapp.com;",
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
}
