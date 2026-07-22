import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface LguSite {
  slug: string;
  name: string;
  rssUrl: string;
  website: string;
  region: string;
}

interface Article {
  pk: string; // URL hash
  published_at: string;
  lgu: string;
  title: string;
  url: string;
  content: string;
  summary: string;
  source: string;
  status: string; // 'unclassified', 'classified'
}

// Target LGUs for Phase 1
const TARGET_LGUS: LguSite[] = [
  { slug: 'dumaguete', name: 'Dumaguete', rssUrl: 'https://dumaguete.gov.ph/feed/', website: 'https://dumaguete.gov.ph', region: 'Central Visayas' },
  { slug: 'cebu', name: 'Cebu Province', rssUrl: 'https://cebu.gov.ph/feed/', website: 'https://cebu.gov.ph', region: 'Central Visayas' },
  { slug: 'iloilo-city', name: 'Iloilo City', rssUrl: 'https://iloilocity.gov.ph/feed/', website: 'https://iloilocity.gov.ph', region: 'Western Visayas' },
  { slug: 'bacolod', name: 'Bacolod', rssUrl: 'https://bacolodcity.gov.ph/feed/', website: 'https://bacolodcity.gov.ph', region: 'Western Visayas' },
  { slug: 'davao-city', name: 'Davao City', rssUrl: 'https://davaocity.gov.ph/feed/', website: 'https://davaocity.gov.ph', region: 'Davao' },
  { slug: 'baguio', name: 'Baguio', rssUrl: 'https://baguio.gov.ph/feed/', website: 'https://baguio.gov.ph', region: 'CAR' },
  { slug: 'tagaytay', name: 'Tagaytay', rssUrl: '', website: 'https://tagaytay.gov.ph', region: 'CALABARZON' },
  { slug: 'clark-pampanga', name: 'Clark / Pampanga', rssUrl: 'https://pampanga.gov.ph/feed/', website: 'https://pampanga.gov.ph', region: 'Central Luzon' },
];

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function fetchFeed(url: string): Promise<{ title: string; url: string; content: string; pubDate: string }[]> {
  if (!url) return [];
  
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Pearlmagnet/1.0 (LGU News Monitor)' },
  });
  
  if (!response.ok) {
    console.warn(`Feed ${url} returned ${response.status}`);
    return [];
  }
  
  const text = await response.text();
  const items: { title: string; url: string; content: string; pubDate: string }[] = [];
  
  // Simple RSS/Atom parser
  const titleRegex = /<title[^>]*>([^<]+)<\/title>/gi;
  const linkRegex = /<link[^>]*>(?:<\!\[CDATA\[)?([^\]]+)(?:\]\]>)?<\/link>/gi;
  const descRegex = /<description[^>]*>(?:<\!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/gi;
  const pubDateRegex = /<pubDate[^>]*>([^<]+)<\/pubDate>/gi;
  const contentRegex = /<content:encoded[^>]*>(?:<\!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/gi;
  
  let match;
  const titles: string[] = [];
  const links: string[] = [];
  const contents: string[] = [];
  const dates: string[] = [];
  
  while ((match = titleRegex.exec(text)) !== null) titles.push(match[1].trim());
  while ((match = linkRegex.exec(text)) !== null) links.push(match[1].trim());
  while ((match = contentRegex.exec(text)) !== null) contents.push(match[1].trim());
  while ((match = pubDateRegex.exec(text)) !== null) dates.push(match[1].trim());
  
  // If no content:encoded, fall back to description
  if (contents.length === 0) {
    while ((match = descRegex.exec(text)) !== null) contents.push(match[1].trim());
  }
  
  const count = Math.min(titles.length, links.length);
  for (let i = 0; i < count; i++) {
    items.push({
      title: titles[i] || 'Untitled',
      url: links[i] || '',
      content: contents[i] || '',
      pubDate: dates[i] || new Date().toUTCString(),
    });
  }
  
  return items;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

export async function handler() {
  const articlesTable = process.env.ARTICLES_TABLE!;
  const results: { lgu: string; fetched: number; new: number }[] = [];
  
  for (const lgu of TARGET_LGUS) {
    console.log(`Fetching RSS for ${lgu.name}...`);
    
    try {
      const items = await fetchFeed(lgu.rssUrl);
      let newCount = 0;
      
      for (const item of items) {
        const pk = simpleHash(item.url || `${lgu.slug}-${item.title}`);
        
        // Check if already exists
        try {
          await ddb.send(new PutCommand({
            TableName: articlesTable,
            Item: {
              pk,
              published_at: new Date(item.pubDate).toISOString(),
              lgu: lgu.slug,
              title: item.title,
              url: item.url,
              content: item.content.substring(0, 10000), // Limit content size
              summary: '',
              source: 'rss',
              status: 'unclassified',
              created_at: new Date().toISOString(),
            },
            ConditionExpression: 'attribute_not_exists(pk)',
          }));
          newCount++;
        } catch (err: any) {
          if (err.name !== 'ConditionalCheckFailedException') {
            console.warn(`Error saving article: ${err.message}`);
          }
        }
      }
      
      results.push({ lgu: lgu.slug, fetched: items.length, new: newCount });
      console.log(`${lgu.name}: ${items.length} items, ${newCount} new`);
    } catch (err: any) {
      console.error(`Error fetching ${lgu.name}: ${err.message}`);
      results.push({ lgu: lgu.slug, fetched: 0, new: 0 });
    }
  }
  
  return {
    statusCode: 200,
    body: JSON.stringify({ results, totalNew: results.reduce((a, r) => a + r.new, 0) }),
  };
}