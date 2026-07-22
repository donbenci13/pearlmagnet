import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface Classification {
  sentiment: 'positive' | 'negative' | 'neutral';
  sectors: string[];
  summary: string;
  isInvestmentSignal: boolean;
}

async function classifyArticle(title: string, content: string): Promise<Classification> {
  const text = `${title}. ${content.substring(0, 3000)}`;
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'poolside/laguna-m.1:free',
      messages: [
        {
          role: 'system',
          content: `You classify Philippine LGU news articles for foreign retirees/investors.
Classify the article and return ONLY valid JSON with these fields:
- "sentiment": "positive", "negative", or "neutral"
- "sectors": array of relevant sectors from: Infrastructure, Healthcare, Tourism, Energy, RealEstate, Agriculture, Education, Transportation, PublicSafety, Environment, Business, Technology
- "summary": one-sentence summary of the article (max 200 chars)
- "isInvestmentSignal": true if this article contains info useful for someone deciding to live/invest in that LGU, false if it's routine admin`,
        },
        {
          role: 'user',
          content: `Classify this LGU news article:\n\nTitle: ${title}\n\nContent: ${text.substring(0, 2500)}`,
        },
      ],
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`OpenRouter API error: ${response.status} ${err}`);
    return {
      sentiment: 'neutral',
      sectors: [],
      summary: title,
      isInvestmentSignal: false,
    };
  }

  const data: any = await response.json();
  const raw = data.choices?.[0]?.message?.content || '{}';
  
  // Extract JSON from response (might be wrapped in markdown)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { sentiment: 'neutral', sectors: [], summary: title, isInvestmentSignal: false };
  }
  
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { sentiment: 'neutral', sectors: [], summary: title, isInvestmentSignal: false };
  }
}

export async function handler() {
  const articlesTable = process.env.ARTICLES_TABLE!;
  let classified = 0;
  let lastKey: any = undefined;

  do {
    const result = await ddb.send(new ScanCommand({
      TableName: articlesTable,
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': 'unclassified' },
      ExclusiveStartKey: lastKey,
      Limit: 10,
    }));

    for (const item of result.Items || []) {
      try {
        const classification = await classifyArticle(item.title, item.content || '');
        
        await ddb.send(new UpdateCommand({
          TableName: articlesTable,
          Key: {
            pk: item.pk,
            published_at: item.published_at,
          },
          UpdateExpression: 'SET #status = :status, sentiment = :sentiment, sectors = :sectors, summary = :summary, isInvestmentSignal = :isSignal',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':status': 'classified',
            ':sentiment': classification.sentiment,
            ':sectors': classification.sectors,
            ':summary': classification.summary,
            ':isSignal': classification.isInvestmentSignal,
          },
        }));
        
        classified++;
      } catch (err: any) {
        console.error(`Error classifying ${item.pk}: ${err.message}`);
      }
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey && classified < 50); // Process up to 50 per invocation

  return {
    statusCode: 200,
    body: JSON.stringify({ classified }),
  };
}