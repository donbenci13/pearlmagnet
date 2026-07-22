import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchArticles, fetchLgus, getSentimentColor } from './api';
import type { Article, LguProfile } from './api';

export default function SignalsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [lgus, setLgus] = useState<LguProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLgu, setFilterLgu] = useState('');
  const [filterSentiment, setFilterSentiment] = useState('');

  useEffect(() => {
    Promise.all([
      fetchArticles(),
      fetchLgus(),
    ]).then(([articlesData, lgusData]) => {
      setArticles(articlesData);
      setLgus(lgusData);
      setLoading(false);
    });
  }, []);

  const filtered = articles.filter((a) => {
    if (filterLgu && a.lgu !== filterLgu) return false;
    if (filterSentiment && a.sentiment !== filterSentiment) return false;
    return true;
  });

  const lguMap = new Map(lgus.map((l) => [l.slug, l.name]));

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      <Link to="/" style={{ color: '#059669', textDecoration: 'none', fontSize: 14, marginBottom: 16, display: 'inline-block' }}>
        ← Back to home
      </Link>

      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: '0 0 24px' }}>
        Signals Feed
      </h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <select
          value={filterLgu}
          onChange={(e) => setFilterLgu(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            fontSize: 14,
            color: '#374151',
            background: 'white',
          }}
        >
          <option value="">All LGUs</option>
          {lgus.filter(l => l.status === 'active').map((l) => (
            <option key={l.slug} value={l.slug}>{l.name}</option>
          ))}
        </select>

        <select
          value={filterSentiment}
          onChange={(e) => setFilterSentiment(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            fontSize: 14,
            color: '#374151',
            background: 'white',
          }}
        >
          <option value="">All Sentiment</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>

        <span style={{ fontSize: 14, color: '#6b7280', alignSelf: 'center' }}>
          {filtered.length} of {articles.length} signals
        </span>
      </div>

      {/* Article List */}
      {loading ? (
        <p style={{ color: '#9ca3af' }}>Loading signals...</p>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 16, color: '#6b7280', margin: '0 0 8px' }}>No signals found</p>
          <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>
            New articles are collected daily from LGU websites. Check back soon.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((article) => {
            const lguName = lguMap.get(article.lgu) || article.lgu;
            return (
              <div key={article.pk} style={{
                background: 'white',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                padding: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: getSentimentColor(article.sentiment),
                  }} />
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: getSentimentColor(article.sentiment),
                    textTransform: 'uppercase',
                  }}>
                    {article.sentiment}
                  </span>
                  <Link to={`/lgus/${article.lgu}`} style={{
                    fontSize: 12,
                    color: '#059669',
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}>
                    {lguName}
                  </Link>
                  {article.isInvestmentSignal && (
                    <span style={{
                      fontSize: 10,
                      background: '#05966915',
                      color: '#059669',
                      padding: '1px 6px',
                      borderRadius: 3,
                      fontWeight: 600,
                    }}>
                      INVESTMENT SIGNAL
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>
                    {new Date(article.published_at).toLocaleDateString()}
                  </span>
                </div>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#111827', textDecoration: 'none', fontWeight: 600, fontSize: 15, lineHeight: 1.4 }}
                >
                  {article.title}
                </a>
                {article.summary && (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280', lineHeight: 1.4 }}>{article.summary}</p>
                )}
                {article.sectors && article.sectors.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {article.sectors.map((s) => (
                      <span key={s} style={{ fontSize: 11, background: '#f3f4f6', color: '#6b7280', padding: '1px 6px', borderRadius: 3 }}>
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}