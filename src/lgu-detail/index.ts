import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function handler(event: any) {
  const lguProfilesTable = process.env.LGU_PROFILES_TABLE!;
  const articlesTable = process.env.ARTICLES_TABLE!;

  const slug = event.pathParameters?.slug;
  if (!slug) {
    return { statusCode: 400, body: JSON.stringify({ error: 'LGU slug required' }) };
  }

  // Get profile
  const profileResult = await ddb.send(new GetCommand({
    TableName: lguProfilesTable,
    Key: { slug },
  }));

  if (!profileResult.Item) {
    return { statusCode: 404, body: JSON.stringify({ error: 'LGU not found' }) };
  }

  // Get recent articles
  const articlesResult = await ddb.send(new QueryCommand({
    TableName: articlesTable,
    IndexName: 'ByLgu',
    KeyConditionExpression: 'lgu = :lgu',
    ExpressionAttributeValues: { ':lgu': slug },
    ScanIndexForward: false,
    Limit: 20,
  }));

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      profile: profileResult.Item,
      articles: articlesResult.Items || [],
    }),
  };
}