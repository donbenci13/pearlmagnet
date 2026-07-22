import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface SubscribeRequest {
  email: string;
}

export async function handler(event: any) {
  const subscribersTable = process.env.SUBSCRIBERS_TABLE!;
  
  let body: SubscribeRequest;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }
  
  const { email } = body;
  
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Valid email required' }) };
  }

  try {
    await ddb.send(new PutCommand({
      TableName: subscribersTable,
      Item: {
        email: email.toLowerCase().trim(),
        subscribed_at: new Date().toISOString(),
        active: true,
      },
      ConditionExpression: 'attribute_not_exists(email)',
    }));
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Subscribed successfully' }),
    };
  } catch (err: any) {
    if (err.name === 'ConditionalCheckFailedException') {
      return { statusCode: 200, body: JSON.stringify({ message: 'Already subscribed' }) };
    }
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error' }) };
  }
}