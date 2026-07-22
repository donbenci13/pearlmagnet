import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';

export class PearlmagnetStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ─── DynamoDB Tables ───

    // LGU Profiles — comprehensive data per LGU
    const lguProfilesTable = new dynamodb.Table(this, 'LguProfiles', {
      partitionKey: { name: 'slug', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Articles — scraped + classified signals
    const articlesTable = new dynamodb.Table(this, 'Articles', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'published_at', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    // GSI for querying by LGU
    articlesTable.addGlobalSecondaryIndex({
      indexName: 'ByLgu',
      partitionKey: { name: 'lgu', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'published_at', type: dynamodb.AttributeType.STRING },
    });
    // GSI for querying by sentiment
    articlesTable.addGlobalSecondaryIndex({
      indexName: 'BySentiment',
      partitionKey: { name: 'sentiment', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'published_at', type: dynamodb.AttributeType.STRING },
    });

    // Subscribers — newsletter subscribers
    const subscribersTable = new dynamodb.Table(this, 'Subscribers', {
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ─── Lambda Functions ───

    // RSS Fetcher — polls configured LGU RSS feeds
    const rssFetcherFn = new lambdaNodejs.NodejsFunction(this, 'RssFetcher', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../src/rss-fetcher/index.ts'),
      handler: 'handler',
      environment: {
        ARTICLES_TABLE: articlesTable.tableName,
        LGU_PROFILES_TABLE: lguProfilesTable.tableName,
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
    });
    articlesTable.grantWriteData(rssFetcherFn);
    lguProfilesTable.grantReadData(rssFetcherFn);

    // Article Classifier — tags articles with LGU, sector, sentiment
    const classifierFn = new lambdaNodejs.NodejsFunction(this, 'ArticleClassifier', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../src/classifier/index.ts'),
      handler: 'handler',
      environment: {
        ARTICLES_TABLE: articlesTable.tableName,
      },
      timeout: cdk.Duration.minutes(1),
      memorySize: 256,
    });
    articlesTable.grantReadWriteData(classifierFn);

    // Newsletter Builder — compiles and sends weekly digest
    const newsletterFn = new lambdaNodejs.NodejsFunction(this, 'NewsletterBuilder', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../src/newsletter-builder/index.ts'),
      handler: 'handler',
      environment: {
        ARTICLES_TABLE: articlesTable.tableName,
        LGU_PROFILES_TABLE: lguProfilesTable.tableName,
        SUBSCRIBERS_TABLE: subscribersTable.tableName,
        FROM_EMAIL: 'don@peachteq.com',
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
    });
    articlesTable.grantReadData(newsletterFn);
    lguProfilesTable.grantReadData(newsletterFn);
    subscribersTable.grantReadData(newsletterFn);

    // Subscribe handler
    const subscribeFn = new lambdaNodejs.NodejsFunction(this, 'SubscribeHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../src/subscribe/index.ts'),
      handler: 'handler',
      environment: {
        SUBSCRIBERS_TABLE: subscribersTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
    });
    subscribersTable.grantWriteData(subscribeFn);

    // Unsubscribe handler
    const unsubscribeFn = new lambdaNodejs.NodejsFunction(this, 'UnsubscribeHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../src/unsubscribe/index.ts'),
      handler: 'handler',
      environment: {
        SUBSCRIBERS_TABLE: subscribersTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
    });
    subscribersTable.grantWriteData(unsubscribeFn);

    // LGU list handler
    const lguListFn = new lambdaNodejs.NodejsFunction(this, 'LguListHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../src/lgu-list/index.ts'),
      handler: 'handler',
      environment: {
        LGU_PROFILES_TABLE: lguProfilesTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
    });
    lguProfilesTable.grantReadData(lguListFn);

    // LGU detail handler
    const lguDetailFn = new lambdaNodejs.NodejsFunction(this, 'LguDetailHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../src/lgu-detail/index.ts'),
      handler: 'handler',
      environment: {
        LGU_PROFILES_TABLE: lguProfilesTable.tableName,
        ARTICLES_TABLE: articlesTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
    });
    lguProfilesTable.grantReadData(lguDetailFn);
    articlesTable.grantReadData(lguDetailFn);

    // Articles list handler
    const articlesListFn = new lambdaNodejs.NodejsFunction(this, 'ArticlesListHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../src/articles-list/index.ts'),
      handler: 'handler',
      environment: {
        ARTICLES_TABLE: articlesTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
    });
    articlesTable.grantReadData(articlesListFn);

    // ─── EventBridge Schedules ───

    // Daily RSS fetch — runs at 6am, 12pm, 6pm PH time
    const dailyRssRule = new events.Rule(this, 'DailyRssFetch', {
      schedule: events.Schedule.cron({ minute: '0', hour: '6,12,18' }),
    });
    dailyRssRule.addTarget(new targets.LambdaFunction(rssFetcherFn));

    // Weekly newsletter — every Sunday at 8am PH time
    const weeklyNewsletterRule = new events.Rule(this, 'WeeklyNewsletter', {
      schedule: events.Schedule.cron({ minute: '0', hour: '0', weekDay: 'SUN' }),
    });
    weeklyNewsletterRule.addTarget(new targets.LambdaFunction(newsletterFn));

    // ─── SES ───
    // Email identity already verified in this account
    // Grant SES send permissions to the newsletter builder
    newsletterFn.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }));

    // ─── API Gateway ───

    const api = new apigw.HttpApi(this, 'PearlmagnetApi', {
      apiName: 'Pearlmagnet API',
      corsPreflight: {
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: [apigw.CorsHttpMethod.GET, apigw.CorsHttpMethod.POST],
        allowOrigins: ['*'],
      },
    });

    // Routes
    api.addRoutes({
      path: '/subscribe',
      methods: [apigw.HttpMethod.POST],
      integration: new HttpLambdaIntegration('SubscribeIntegration', subscribeFn),
    });

    api.addRoutes({
      path: '/unsubscribe',
      methods: [apigw.HttpMethod.POST],
      integration: new HttpLambdaIntegration('UnsubscribeIntegration', unsubscribeFn),
    });

    api.addRoutes({
      path: '/lgus',
      methods: [apigw.HttpMethod.GET],
      integration: new HttpLambdaIntegration('LguListIntegration', lguListFn),
    });

    api.addRoutes({
      path: '/lgus/{slug}',
      methods: [apigw.HttpMethod.GET],
      integration: new HttpLambdaIntegration('LguDetailIntegration', lguDetailFn),
    });

    api.addRoutes({
      path: '/articles',
      methods: [apigw.HttpMethod.GET],
      integration: new HttpLambdaIntegration('ArticlesListIntegration', articlesListFn),
    });

    // ─── Outputs ───
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url! });
    new cdk.CfnOutput(this, 'LguProfilesTable', { value: lguProfilesTable.tableName });
    new cdk.CfnOutput(this, 'ArticlesTable', { value: articlesTable.tableName });
    new cdk.CfnOutput(this, 'SubscribersTable', { value: subscribersTable.tableName });

    // ─── Frontend Hosting (S3 + CloudFront) ───

    const hostingBucket = new s3.Bucket(this, 'FrontendBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    });

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI');
    hostingBucket.grantRead(originAccessIdentity);

    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html', // SPA fallback
        },
      ],
      defaultBehavior: {
        origin: new origins.S3Origin(hostingBucket, { originAccessIdentity }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // US + Europe only (cheapest)
    });

    // Deploy frontend build output to S3
    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../frontend/dist'))],
      destinationBucket: hostingBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    new cdk.CfnOutput(this, 'FrontendUrl', { value: distribution.distributionDomainName });
  }
}