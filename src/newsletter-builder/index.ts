import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ses = new SESClient({});

interface Article {
  pk: string;
  published_at: string;
  lgu: string;
  title: string;
  url: string;
  summary: string;
  sentiment: string;
  sectors: string[];
  isInvestmentSignal: boolean;
}

interface LguProfile {
  slug: string;
  name: string;
  region: string;
}

interface Subscriber {
  email: string;
  subscribed_at: string;
  active: boolean;
}

export async function handler() {
  const articlesTable = process.env.ARTICLES_TABLE!;
  const lguProfilesTable = process.env.LGU_PROFILES_TABLE!;
  const subscribersTable = process.env.SUBSCRIBERS_TABLE!;
  const fromEmail = process.env.FROM_EMAIL!;

  // Get all active subscribers
  const subscribersResult = await ddb.send(new ScanCommand({
    TableName: subscribersTable,
    FilterExpression: 'active = :active',
    ExpressionAttributeValues: { ':active': true },
  }));
  const subscribers = (subscribersResult.Items || []) as Subscriber[];

  if (subscribers.length === 0) {
    console.log('No active subscribers, skipping newsletter');
    return { statusCode: 200, body: JSON.stringify({ sent: 0 }) };
  }

  // Get all LGU profiles
  const lguResult = await ddb.send(new ScanCommand({
    TableName: lguProfilesTable,
  }));
  const lguProfiles = (lguResult.Items || []) as LguProfile[];

  // Get recent articles (last 7 days)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekAgoStr = oneWeekAgo.toISOString();

  let allArticles: Article[] = [];
  let lastKey: any = undefined;

  do {
    const result = await ddb.send(new ScanCommand({
      TableName: articlesTable,
      FilterExpression: 'published_at >= :weekAgo AND isInvestmentSignal = :isSignal',
      ExpressionAttributeValues: {
        ':weekAgo': weekAgoStr,
        ':isSignal': true,
      },
      ExclusiveStartKey: lastKey,
    }));
    allArticles = [...allArticles, ...(result.Items || [])] as Article[];
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  // Group articles by LGU
  const articlesByLgu: Record<string, Article[]> = {};
  for (const article of allArticles) {
    if (!articlesByLgu[article.lgu]) articlesByLgu[article.lgu] = [];
    articlesByLgu[article.lgu].push(article);
  }

  // Build newsletter HTML
  const dateStr = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });
  
  let html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #059669; margin: 0;">PH Investment Signals</h1>
    <p style="color: #6b7280; font-size: 14px;">Weekly LGU Intelligence for Retirees & Investors</p>
    <p style="color: #9ca3af; font-size: 12px;">${dateStr}</p>
  </div>
  <hr style="border: none; border-top: 1px solid #e5e7eb;">`;

  // Summary section
  const totalSignals = allArticles.length;
  const positive = allArticles.filter(a => a.sentiment === 'positive').length;
  const neutral = allArticles.filter(a => a.sentiment === 'neutral').length;
  const negative = allArticles.filter(a => a.sentiment === 'negative').length;
  
  html += `
  <div style="margin: 20px 0; padding: 20px; background: #f9fafb; border-radius: 8px;">
    <h2 style="margin: 0 0 10px; font-size: 16px; color: #374151;">This Week's Summary</h2>
    <p style="margin: 0; color: #6b7280; font-size: 14px;">
      ${totalSignals} investment signals detected across ${Object.keys(articlesByLgu).length} LGUs.
      <span style="color: #059669;">${positive} positive</span>,
      <span style="color: #f59e0b;">${neutral} neutral</span>,
      <span style="color: #ef4444;">${negative} negative</span>.
    </p>
  </div>`;

  // Per-LGU sections
  for (const [lguSlug, articles] of Object.entries(articlesByLgu)) {
    const profile = lguProfiles.find(p => p.slug === lguSlug);
    const lguName = profile?.name || lguSlug;
    const lguPositive = articles.filter(a => a.sentiment === 'positive').length;
    const lguNegative = articles.filter(a => a.sentiment === 'negative').length;
    
    html += `
  <div style="margin: 20px 0; padding: 15px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
    <h3 style="margin: 0 0 5px; color: #059669;">${lguName}</h3>
    <p style="margin: 0 0 10px; color: #6b7280; font-size: 12px;">${articles.length} signals · ${lguPositive} positive · ${lguNegative} negative</p>`;

    for (const article of articles.slice(0, 5)) {
      const sentimentIcon = article.sentiment === 'positive' ? '🟢' : article.sentiment === 'negative' ? '🔴' : '🟡';
      const sectors = (article.sectors || []).join(', ');
      html += `
    <div style="margin: 8px 0; padding: 8px; background: #f9fafb; border-radius: 4px; font-size: 13px;">
      <p style="margin: 0 0 3px;"><a href="${article.url}" style="color: #059669; text-decoration: none; font-weight: 500;">${article.title}</a></p>
      <p style="margin: 0; color: #6b7280; font-size: 12px;">${sentimentIcon} ${article.summary}</p>
      <p style="margin: 3px 0 0; color: #9ca3af; font-size: 11px;">${sectors}</p>
    </div>`;
    }

    if (profile) {
      html += `
    <p style="margin: 10px 0 0; font-size: 12px;">
      <a href="https://pearlmagnet.dev/lgus/${lguSlug}" style="color: #059669;">View full profile →</a>
    </p>`;
    }

    html += `</div>`;
  }

  // Closing
  html += `
  <hr style="border: none; border-top: 1px solid #e5e7eb;">
  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p>You're receiving this because you subscribed to PH Investment Signals.</p>
    <p><a href="https://pearlmagnet.dev/unsubscribe?email={{email}}" style="color: #9ca3af;">Unsubscribe</a></p>
  </div>
</body>
</html>`;

  // Send to all subscribers
  let sent = 0;
  for (const subscriber of subscribers) {
    try {
      await ses.send(new SendEmailCommand({
        Source: `"PH Investment Signals" <${fromEmail}>`,
        Destination: { ToAddresses: [subscriber.email] },
        Message: {
          Subject: { Data: `PH Investment Signals — Weekly Digest (${dateStr})` },
          Body: {
            Html: { Data: html },
            Text: { Data: `Weekly digest with ${totalSignals} signals. View online at https://pearlmagnet.dev` },
          },
        },
      }));
      sent++;
    } catch (err: any) {
      console.error(`Failed to send to ${subscriber.email}: ${err.message}`);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ sent, total: subscribers.length }),
  };
}