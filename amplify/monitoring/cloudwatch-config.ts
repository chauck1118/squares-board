import { Duration } from 'aws-cdk-lib';
import { Alarm, Dashboard, GraphWidget, Metric, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

/**
 * CloudWatch Monitoring and Logging Configuration
 * Comprehensive monitoring for March Madness Squares application
 */
export class CloudWatchMonitoring extends Construct {
  public readonly dashboard: Dashboard;
  public readonly alertTopic: Topic;

  constructor(scope: Construct, id: string, props: {
    alertEmail: string;
    lambdaFunctionNames: string[];
    dynamoTableName: string;
    appSyncApiId: string;
  }) {
    super(scope, id);

    // Create SNS topic for alerts
    this.alertTopic = new Topic(this, 'AlertTopic', {
      topicName: 'march-madness-squares-alerts',
      displayName: 'March Madness Squares Alerts',
    });

    this.alertTopic.addSubscription(new EmailSubscription(props.alertEmail));

    // Create log groups with retention policies
    const lambdaLogGroups = props.lambdaFunctionNames.map((functionName, index) => 
      new LogGroup(this, `LambdaLogGroup${index}`, {
        logGroupName: `/aws/lambda/${functionName}`,
        retention: RetentionDays.ONE_MONTH,
      })
    );

    const appSyncLogGroup = new LogGroup(this, 'AppSyncLogGroup', {
      logGroupName: `/aws/appsync/apis/${props.appSyncApiId}`,
      retention: RetentionDays.ONE_MONTH,
    });

    // Create CloudWatch Dashboard
    this.dashboard = new Dashboard(this, 'ApplicationDashboard', {
      dashboardName: 'march-madness-squares-production',
    });

    // Lambda metrics widgets
    const lambdaMetricsWidget = new GraphWidget({
      title: 'Lambda Function Metrics',
      left: [
        new Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Duration',
          dimensionsMap: { FunctionName: 'assignment' },
          statistic: 'Average',
        }),
        new Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Duration',
          dimensionsMap: { FunctionName: 'scoring' },
          statistic: 'Average',
        }),
      ],
      right: [
        new Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Errors',
          dimensionsMap: { FunctionName: 'assignment' },
          statistic: 'Sum',
        }),
        new Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Errors',
          dimensionsMap: { FunctionName: 'scoring' },
          statistic: 'Sum',
        }),
      ],
    });

    // DynamoDB metrics widget
    const dynamoMetricsWidget = new GraphWidget({
      title: 'DynamoDB Metrics',
      left: [
        new Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'ConsumedReadCapacityUnits',
          dimensionsMap: { TableName: props.dynamoTableName },
          statistic: 'Sum',
        }),
        new Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'ConsumedWriteCapacityUnits',
          dimensionsMap: { TableName: props.dynamoTableName },
          statistic: 'Sum',
        }),
      ],
      right: [
        new Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'ThrottledRequests',
          dimensionsMap: { TableName: props.dynamoTableName },
          statistic: 'Sum',
        }),
        new Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'SystemErrors',
          dimensionsMap: { TableName: props.dynamoTableName },
          statistic: 'Sum',
        }),
      ],
    });

    // AppSync metrics widget
    const appSyncMetricsWidget = new GraphWidget({
      title: 'AppSync API Metrics',
      left: [
        new Metric({
          namespace: 'AWS/AppSync',
          metricName: 'Latency',
          dimensionsMap: { GraphQLAPIId: props.appSyncApiId },
          statistic: 'Average',
        }),
      ],
      right: [
        new Metric({
          namespace: 'AWS/AppSync',
          metricName: '4XXError',
          dimensionsMap: { GraphQLAPIId: props.appSyncApiId },
          statistic: 'Sum',
        }),
        new Metric({
          namespace: 'AWS/AppSync',
          metricName: '5XXError',
          dimensionsMap: { GraphQLAPIId: props.appSyncApiId },
          statistic: 'Sum',
        }),
      ],
    });

    // Application-specific metrics widget
    const applicationMetricsWidget = new GraphWidget({
      title: 'Application Business Metrics',
      left: [
        new Metric({
          namespace: 'MarchMadnessSquares',
          metricName: 'ActiveBoards',
          statistic: 'Average',
        }),
        new Metric({
          namespace: 'MarchMadnessSquares',
          metricName: 'ActiveUsers',
          statistic: 'Average',
        }),
      ],
      right: [
        new Metric({
          namespace: 'MarchMadnessSquares',
          metricName: 'SquaresClaimed',
          statistic: 'Sum',
        }),
        new Metric({
          namespace: 'MarchMadnessSquares',
          metricName: 'PaymentsProcessed',
          statistic: 'Sum',
        }),
      ],
    });

    // Add widgets to dashboard
    this.dashboard.addWidgets(
      lambdaMetricsWidget,
      dynamoMetricsWidget,
      appSyncMetricsWidget,
      applicationMetricsWidget
    );

    // Create alarms
    this.createAlarms(props);
  }

  private createAlarms(props: {
    lambdaFunctionNames: string[];
    dynamoTableName: string;
    appSyncApiId: string;
  }): void {
    // Lambda error rate alarms
    props.lambdaFunctionNames.forEach((functionName) => {
      const errorAlarm = new Alarm(this, `${functionName}ErrorAlarm`, {
        alarmName: `march-madness-${functionName}-errors`,
        alarmDescription: `High error rate for ${functionName} function`,
        metric: new Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Errors',
          dimensionsMap: { FunctionName: functionName },
          statistic: 'Sum',
        }),
        threshold: 5,
        evaluationPeriods: 2,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      });

      errorAlarm.addAlarmAction(new SnsAction(this.alertTopic));

      // Lambda duration alarm
      const durationAlarm = new Alarm(this, `${functionName}DurationAlarm`, {
        alarmName: `march-madness-${functionName}-duration`,
        alarmDescription: `High duration for ${functionName} function`,
        metric: new Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Duration',
          dimensionsMap: { FunctionName: functionName },
          statistic: 'Average',
        }),
        threshold: 10000, // 10 seconds
        evaluationPeriods: 3,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      });

      durationAlarm.addAlarmAction(new SnsAction(this.alertTopic));
    });

    // DynamoDB throttling alarm
    const throttlingAlarm = new Alarm(this, 'DynamoThrottlingAlarm', {
      alarmName: 'march-madness-dynamo-throttling',
      alarmDescription: 'DynamoDB requests are being throttled',
      metric: new Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'ThrottledRequests',
        dimensionsMap: { TableName: props.dynamoTableName },
        statistic: 'Sum',
      }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    throttlingAlarm.addAlarmAction(new SnsAction(this.alertTopic));

    // AppSync error rate alarm
    const appSyncErrorAlarm = new Alarm(this, 'AppSyncErrorAlarm', {
      alarmName: 'march-madness-appsync-errors',
      alarmDescription: 'High error rate in AppSync API',
      metric: new Metric({
        namespace: 'AWS/AppSync',
        metricName: '5XXError',
        dimensionsMap: { GraphQLAPIId: props.appSyncApiId },
        statistic: 'Sum',
      }),
      threshold: 10,
      evaluationPeriods: 2,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    appSyncErrorAlarm.addAlarmAction(new SnsAction(this.alertTopic));

    // Custom application health alarm
    const applicationHealthAlarm = new Alarm(this, 'ApplicationHealthAlarm', {
      alarmName: 'march-madness-application-health',
      alarmDescription: 'Application health check failure',
      metric: new Metric({
        namespace: 'MarchMadnessSquares',
        metricName: 'HealthCheckFailures',
        statistic: 'Sum',
      }),
      threshold: 3,
      evaluationPeriods: 2,
      treatMissingData: TreatMissingData.BREACHING,
    });

    applicationHealthAlarm.addAlarmAction(new SnsAction(this.alertTopic));
  }
}

/**
 * Custom metrics helper for application-specific monitoring
 */
export class CustomMetrics {
  static async publishMetric(
    metricName: string,
    value: number,
    unit: string = 'Count',
    dimensions: Record<string, string> = {}
  ): Promise<void> {
    const AWS = require('aws-sdk');
    const cloudwatch = new AWS.CloudWatch();

    const params = {
      Namespace: 'MarchMadnessSquares',
      MetricData: [
        {
          MetricName: metricName,
          Value: value,
          Unit: unit,
          Timestamp: new Date(),
          Dimensions: Object.entries(dimensions).map(([Name, Value]) => ({
            Name,
            Value,
          })),
        },
      ],
    };

    try {
      await cloudwatch.putMetricData(params).promise();
    } catch (error) {
      console.error('Failed to publish custom metric:', error);
    }
  }

  static async publishBusinessMetrics(data: {
    activeBoards: number;
    activeUsers: number;
    squaresClaimed: number;
    paymentsProcessed: number;
  }): Promise<void> {
    await Promise.all([
      this.publishMetric('ActiveBoards', data.activeBoards),
      this.publishMetric('ActiveUsers', data.activeUsers),
      this.publishMetric('SquaresClaimed', data.squaresClaimed),
      this.publishMetric('PaymentsProcessed', data.paymentsProcessed),
    ]);
  }
}