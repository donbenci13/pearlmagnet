import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function handler() {
  const lguProfilesTable = process.env.LGU_PROFILES_TABLE!;

  const result = await ddb.send(new ScanCommand({
    TableName: lguProfilesTable,
  }));

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      lgus: result.Items || [],
      total: result.Items?.length || 0,
    }),
  };
}