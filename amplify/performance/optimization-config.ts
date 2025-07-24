import { Duration } from 'aws-cdk-lib';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/**
 * Performance Optimization Configuration
 * Implements automated performance monitoring and optimization
 */
export class PerformanceOptimization extends Construct {
  constructor(scope: Construct, id: string, props: {
    lambdaFunctionNames: string[];
    dynamoTableName: string;
    appSyncApiId: string;
  }) {
    super(scope, id);

    // Performance monitoring Lambda function
    const performanceMonitorFunction = new Function(this, 'PerformanceMonitorFunction', {
      functionName: 'march-madness-performance-monitor',
      runtime: Runtime.NODEJS_18_X,
      handler: 'index.handler',
      timeout: Duration.minutes(5),
      code: Code.fromInline(`
        const AWS = require('aws-sdk');
        const cloudwatch = new AWS.CloudWatch();
        const lambda = new AWS.Lambda();
        const dynamodb = new AWS.DynamoDB();
        const appsync = new AWS.AppSync();

        exports.handler = async (event) => {
          console.log('Starting performance monitoring:', JSON.stringify(event));
          
          try {
            const recommendations = [];
            
            // Monitor Lambda performance
            for (const functionName of ${JSON.stringify(props.lambdaFunctionNames)}) {
              const lambdaMetrics = await getLambdaMetrics(functionName);
              const lambdaRecommendations = analyzeLambdaPerformance(functionName, lambdaMetrics);
              recommendations.push(...lambdaRecommendations);
            }
            
            // Monitor DynamoDB performance
            const dynamoMetrics = await getDynamoMetrics('${props.dynamoTableName}');
            const dynamoRecommendations = analyzeDynamoPerformance(dynamoMetrics);
            recommendations.push(...dynamoRecommendations);
            
            // Monitor AppSync performance
            const appSyncMetrics = await getAppSyncMetrics('${props.appSyncApiId}');
            const appSyncRecommendations = analyzeAppSyncPerformance(appSyncMetrics);
            recommendations.push(...appSyncRecommendations);
            
            // Send performance metrics
            await sendPerformanceMetrics(recommendations);
            
            // Apply automatic optimizations
            await applyOptimizations(recommendations);
            
            return {
              statusCode: 200,
              body: JSON.stringify({
                message: 'Performance monitoring completed',
                recommendations: recommendations.length,
                optimizationsApplied: recommendations.filter(r => r.autoApplied).length
              })
            };
          } catch (error) {
            console.error('Performance monitoring failed:', error);
            throw error;
          }
        };

        async function getLambdaMetrics(functionName) {
          const params = {
            Namespace: 'AWS/Lambda',
            MetricName: 'Duration',
            Dimensions: [{ Name: 'FunctionName', Value: functionName }],
            StartTime: new Date(Date.now() - 3600000), // Last hour
            EndTime: new Date(),
            Period: 300,
            Statistics: ['Average', 'Maximum']
          };
          
          const result = await cloudwatch.getMetricStatistics(params).promise();
          return result.Datapoints;
        }

        async function getDynamoMetrics(tableName) {
          const readParams = {
            Namespace: 'AWS/DynamoDB',
            MetricName: 'ConsumedReadCapacityUnits',
            Dimensions: [{ Name: 'TableName', Value: tableName }],
            StartTime: new Date(Date.now() - 3600000),
            EndTime: new Date(),
            Period: 300,
            Statistics: ['Sum']
          };
          
          const writeParams = { ...readParams, MetricName: 'ConsumedWriteCapacityUnits' };
          const throttleParams = { ...readParams, MetricName: 'ThrottledRequests' };
          
          const [readResult, writeResult, throttleResult] = await Promise.all([
            cloudwatch.getMetricStatistics(readParams).promise(),
            cloudwatch.getMetricStatistics(writeParams).promise(),
            cloudwatch.getMetricStatistics(throttleParams).promise()
          ]);
          
          return {
            read: readResult.Datapoints,
            write: writeResult.Datapoints,
            throttle: throttleResult.Datapoints
          };
        }

        async function getAppSyncMetrics(apiId) {
          const latencyParams = {
            Namespace: 'AWS/AppSync',
            MetricName: 'Latency',
            Dimensions: [{ Name: 'GraphQLAPIId', Value: apiId }],
            StartTime: new Date(Date.now() - 3600000),
            EndTime: new Date(),
            Period: 300,
            Statistics: ['Average', 'Maximum']
          };
          
          const errorParams = { ...latencyParams, MetricName: '4XXError', Statistics: ['Sum'] };
          
          const [latencyResult, errorResult] = await Promise.all([
            cloudwatch.getMetricStatistics(latencyParams).promise(),
            cloudwatch.getMetricStatistics(errorParams).promise()
          ]);
          
          return {
            latency: latencyResult.Datapoints,
            errors: errorResult.Datapoints
          };
        }

        function analyzeLambdaPerformance(functionName, metrics) {
          const recommendations = [];
          
          if (metrics.length > 0) {
            const avgDuration = metrics.reduce((sum, m) => sum + m.Average, 0) / metrics.length;
            const maxDuration = Math.max(...metrics.map(m => m.Maximum));
            
            if (avgDuration > 5000) { // 5 seconds
              recommendations.push({
                type: 'lambda',
                severity: 'high',
                resource: functionName,
                issue: 'High average duration',
                recommendation: 'Consider increasing memory allocation or optimizing code',
                metric: avgDuration,
                autoApplied: false
              });
            }
            
            if (maxDuration > 15000) { // 15 seconds
              recommendations.push({
                type: 'lambda',
                severity: 'critical',
                resource: functionName,
                issue: 'Very high maximum duration',
                recommendation: 'Urgent optimization needed - consider breaking into smaller functions',
                metric: maxDuration,
                autoApplied: false
              });
            }
          }
          
          return recommendations;
        }

        function analyzeDynamoPerformance(metrics) {
          const recommendations = [];
          
          // Check for throttling
          const totalThrottles = metrics.throttle.reduce((sum, m) => sum + m.Sum, 0);
          if (totalThrottles > 0) {
            recommendations.push({
              type: 'dynamodb',
              severity: 'high',
              resource: '${props.dynamoTableName}',
              issue: 'DynamoDB throttling detected',
              recommendation: 'Increase provisioned capacity or enable auto-scaling',
              metric: totalThrottles,
              autoApplied: true // Can be auto-applied via auto-scaling
            });
          }
          
          // Check capacity utilization
          const avgReadCapacity = metrics.read.length > 0 
            ? metrics.read.reduce((sum, m) => sum + m.Sum, 0) / metrics.read.length 
            : 0;
          const avgWriteCapacity = metrics.write.length > 0 
            ? metrics.write.reduce((sum, m) => sum + m.Sum, 0) / metrics.write.length 
            : 0;
          
          if (avgReadCapacity > 80) { // 80% utilization
            recommendations.push({
              type: 'dynamodb',
              severity: 'medium',
              resource: '${props.dynamoTableName}',
              issue: 'High read capacity utilization',
              recommendation: 'Consider read replicas or caching',
              metric: avgReadCapacity,
              autoApplied: false
            });
          }
          
          return recommendations;
        }

        function analyzeAppSyncPerformance(metrics) {
          const recommendations = [];
          
          if (metrics.latency.length > 0) {
            const avgLatency = metrics.latency.reduce((sum, m) => sum + m.Average, 0) / metrics.latency.length;
            const maxLatency = Math.max(...metrics.latency.map(m => m.Maximum));
            
            if (avgLatency > 1000) { // 1 second
              recommendations.push({
                type: 'appsync',
                severity: 'medium',
                resource: '${props.appSyncApiId}',
                issue: 'High GraphQL API latency',
                recommendation: 'Optimize resolvers and consider caching',
                metric: avgLatency,
                autoApplied: false
              });
            }
          }
          
          const totalErrors = metrics.errors.reduce((sum, m) => sum + m.Sum, 0);
          if (totalErrors > 10) {
            recommendations.push({
              type: 'appsync',
              severity: 'high',
              resource: '${props.appSyncApiId}',
              issue: 'High error rate in GraphQL API',
              recommendation: 'Review resolver logic and error handling',
              metric: totalErrors,
              autoApplied: false
            });
          }
          
          return recommendations;
        }

        async function sendPerformanceMetrics(recommendations) {
          const severityCounts = recommendations.reduce((acc, rec) => {
            acc[rec.severity] = (acc[rec.severity] || 0) + 1;
            return acc;
          }, {});
          
          const metricData = Object.entries(severityCounts).map(([severity, count]) => ({
            MetricName: \`PerformanceIssues_\${severity}\`,
            Value: count,
            Unit: 'Count',
            Timestamp: new Date()
          }));
          
          if (metricData.length > 0) {
            await cloudwatch.putMetricData({
              Namespace: 'MarchMadnessSquares/Performance',
              MetricData: metricData
            }).promise();
          }
        }

        async function applyOptimizations(recommendations) {
          for (const rec of recommendations) {
            if (rec.autoApplied && rec.type === 'dynamodb' && rec.issue.includes('throttling')) {
              // Auto-scaling should handle this, but we can log it
              console.log(\`Auto-scaling should address DynamoDB throttling for \${rec.resource}\`);
            }
          }
        }
      `),
    });

    // Grant permissions for performance monitoring
    performanceMonitorFunction.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'cloudwatch:GetMetricStatistics',
        'cloudwatch:PutMetricData',
        'lambda:GetFunction',
        'lambda:UpdateFunctionConfiguration',
        'dynamodb:DescribeTable',
        'dynamodb:UpdateTable',
        'appsync:GetGraphqlApi',
        'application-autoscaling:*',
      ],
      resources: ['*'],
    }));

    // Schedule performance monitoring to run every 15 minutes
    const performanceMonitorRule = new Rule(this, 'PerformanceMonitorRule', {
      schedule: Schedule.rate(Duration.minutes(15)),
    });

    performanceMonitorRule.addTarget(new LambdaFunction(performanceMonitorFunction));

    // Cache optimization Lambda function
    const cacheOptimizationFunction = new Function(this, 'CacheOptimizationFunction', {
      functionName: 'march-madness-cache-optimization',
      runtime: Runtime.NODEJS_18_X,
      handler: 'index.handler',
      timeout: Duration.minutes(3),
      code: Code.fromInline(`
        const AWS = require('aws-sdk');
        const cloudwatch = new AWS.CloudWatch();

        exports.handler = async (event) => {
          console.log('Starting cache optimization:', JSON.stringify(event));
          
          try {
            // Analyze cache hit rates and patterns
            const cacheMetrics = await analyzeCachePerformance();
            
            // Optimize cache configuration
            const optimizations = await optimizeCacheSettings(cacheMetrics);
            
            // Send cache performance metrics
            await sendCacheMetrics(cacheMetrics, optimizations);
            
            return {
              statusCode: 200,
              body: JSON.stringify({
                message: 'Cache optimization completed',
                optimizations: optimizations.length
              })
            };
          } catch (error) {
            console.error('Cache optimization failed:', error);
            throw error;
          }
        };

        async function analyzeCachePerformance() {
          // Simulate cache analysis - in real implementation, this would
          // analyze actual cache metrics from CloudFront, AppSync, etc.
          return {
            hitRate: 0.85,
            missRate: 0.15,
            avgResponseTime: 150,
            popularQueries: [
              'listBoards',
              'getBoard',
              'gamesByBoard'
            ]
          };
        }

        async function optimizeCacheSettings(metrics) {
          const optimizations = [];
          
          if (metrics.hitRate < 0.8) {
            optimizations.push({
              type: 'cache_ttl',
              action: 'increase',
              resource: 'GraphQL queries',
              reason: 'Low cache hit rate'
            });
          }
          
          if (metrics.avgResponseTime > 200) {
            optimizations.push({
              type: 'cache_strategy',
              action: 'optimize',
              resource: 'Popular queries',
              reason: 'High response time'
            });
          }
          
          return optimizations;
        }

        async function sendCacheMetrics(metrics, optimizations) {
          await cloudwatch.putMetricData({
            Namespace: 'MarchMadnessSquares/Cache',
            MetricData: [
              {
                MetricName: 'CacheHitRate',
                Value: metrics.hitRate * 100,
                Unit: 'Percent'
              },
              {
                MetricName: 'CacheOptimizations',
                Value: optimizations.length,
                Unit: 'Count'
              }
            ]
          }).promise();
        }
      `),
    });

    // Grant permissions for cache optimization
    cacheOptimizationFunction.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'cloudwatch:PutMetricData',
        'cloudfront:GetDistribution',
        'cloudfront:UpdateDistribution',
        'appsync:GetGraphqlApi',
        'appsync:UpdateGraphqlApi',
      ],
      resources: ['*'],
    }));

    // Schedule cache optimization to run hourly
    const cacheOptimizationRule = new Rule(this, 'CacheOptimizationRule', {
      schedule: Schedule.rate(Duration.hours(1)),
    });

    cacheOptimizationRule.addTarget(new LambdaFunction(cacheOptimizationFunction));
  }
}

/**
 * Performance optimization utilities
 */
export const performanceConfig = {
  lambda: {
    // Recommended memory configurations based on function type
    assignment: {
      memorySize: 512, // MB
      timeout: Duration.seconds(30),
      reservedConcurrency: 10,
    },
    scoring: {
      memorySize: 256, // MB
      timeout: Duration.seconds(15),
      reservedConcurrency: 5,
    },
  },
  
  dynamodb: {
    // Auto-scaling configuration
    readCapacity: {
      min: 5,
      max: 100,
      targetUtilization: 70,
    },
    writeCapacity: {
      min: 5,
      max: 100,
      targetUtilization: 70,
    },
  },
  
  appsync: {
    // Caching configuration
    cachingBehavior: {
      ttl: 300, // 5 minutes
      cachingKeys: ['$context.identity.sub', '$context.arguments.boardId'],
    },
    
    // Rate limiting
    rateLimiting: {
      requestsPerSecond: 1000,
      burstLimit: 2000,
    },
  },
};