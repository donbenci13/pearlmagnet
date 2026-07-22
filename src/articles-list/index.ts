import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function handler(event: any) {
  const articlesTable = process.env.ARTICLES_TABLE!;

  const queryParams = event.queryStringParameters || {};
  const lgu = queryParams.lgu;
  const sentiment = queryParams.sentiment;
  const limit = Math.min(parseInt(queryParams.limit || '20'), 50);

  let filterExpression: string[] = [];
  let expressionValues: Record<string, any> = {};
  let expressionNames: Record<string, string> = {};

  if (lgu) {
    filterExpression.push('#lgu = :lgu');
    expressionValues[':lgu'] = lgu;
    expressionNames['#lgu'] = 'lgu';
  }
  if (sentiment) {
    filterExpression.push('sentiment = :sentiment');
    expressionValues[':sentiment'] = sentiment;
  }

  const params: any = {
    TableName: articlesTable,
    Limit: limit,
    ScanIndexForward: false,
  };

  if (filterExpression.length > 0) {
    params.FilterExpression = filterExpression.join(' AND ');
    params.ExpressionAttributeValues = expressionValues;
    if (Object.keys(expressionNames).length > 0) {
      params.ExpressionAttributeNames = expressionNames;
    }
  }

  const result = await ddb.send(new ScanCommand(params));

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      articles: result.Items || [],
      total: result.Items?.length || 0,
    }),
  };
}