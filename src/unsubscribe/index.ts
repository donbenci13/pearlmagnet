import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface UnsubscribeRequest {
  email: string;
}

export async function handler(event: any) {
  const subscribersTable = process.env.SUBSCRIBERS_TABLE!;
  
  let body: UnsubscribeRequest;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }
  
  const { email } = body;
  
  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email required' }) };
  }

  try {
    await ddb.send(new UpdateCommand({
      TableName: subscribersTable,
      Key: { email: email.toLowerCase().trim() },
      UpdateExpression: 'SET active = :active, unsubscribed_at = :now',
      ExpressionAttributeValues: {
        ':active': false,
        ':now': new Date().toISOString(),
      },
    }));
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Unsubscribed successfully' }),
    };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error' }) };
  }
}