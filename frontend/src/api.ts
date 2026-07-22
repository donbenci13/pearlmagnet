const API_BASE = 'https://vfn9xio7p4.execute-api.us-east-1.amazonaws.com';

export interface LguProfile {
  slug: string;
  name: string;
  region: string;
  province: string;
  type: string;
  description: string;
  population: number;
  website: string;
  rss_url: string;
  has_airport: boolean;
  airport_name: string;
  has_international_airport: boolean;
  nearest_international_airport: string;
  nearest_international_airport_distance_km: number;
  hospitals: string[];
  internet_fiber: boolean;
  internet_providers: string[];
  cost_of_living_rent_1br: string;
  cost_of_living_food: string;
  safety_rating: string;
  expat_community: string;
  expat_fb_groups: string[];
  retirement_suitability: string;
  climate: string;
  english_proficiency: string;
  key_industries: string[];
  status: string;
}

export interface Article {
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

export async function fetchLgus(): Promise<LguProfile[]> {
  const res = await fetch(`${API_BASE}/lgus`);
  const data = await res.json();
  return data.lgus || [];
}

export async function fetchLguDetail(slug: string): Promise<{ profile: LguProfile; articles: Article[] }> {
  const res = await fetch(`${API_BASE}/lgus/${slug}`);
  return res.json();
}

export async function fetchArticles(params?: { lgu?: string; sentiment?: string }): Promise<Article[]> {
  const query = new URLSearchParams();
  if (params?.lgu) query.set('lgu', params.lgu);
  if (params?.sentiment) query.set('sentiment', params.sentiment);
  const res = await fetch(`${API_BASE}/articles?${query}`);
  const data = await res.json();
  return data.articles || [];
}

export async function subscribe(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function unsubscribe(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export function getSentimentColor(sentiment: string): string {
  switch (sentiment) {
    case 'positive': return '#059669';
    case 'negative': return '#ef4444';
    default: return '#f59e0b';
  }
}

export function getSafetyLabel(rating: string): { label: string; color: string } {
  switch (rating) {
    case 'very high': return { label: 'Very Safe', color: '#059669' };
    case 'high': return { label: 'Safe', color: '#16a34a' };
    case 'moderate': return { label: 'Moderate', color: '#f59e0b' };
    default: return { label: rating, color: '#6b7280' };
  }
}

export function getSuitabilityLabel(rating: string): { label: string; color: string } {
  switch (rating) {
    case 'excellent': return { label: '★ Excellent', color: '#059669' };
    case 'very good': return { label: '★ Very Good', color: '#16a34a' };
    case 'good': return { label: '★ Good', color: '#f59e0b' };
    default: return { label: rating, color: '#6b7280' };
  }
}

export function formatPopulation(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}