import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchLguDetail, getSentimentColor, getSafetyLabel, formatPopulation } from './api';
import type { LguProfile, Article } from './api';
import SubscribeForm from './SubscribeForm';

export default function LguDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<LguProfile | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetchLguDetail(slug).then((data) => {
      setProfile(data.profile);
      setArticles(data.articles || []);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>Loading...</div>;
  }

  if (!profile) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>LGU not found</div>;
  }

  const safety = getSafetyLabel(profile.safety_rating);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
      <Link to="/" style={{ color: '#059669', textDecoration: 'none', fontSize: 14, marginBottom: 16, display: 'inline-block' }}>
        ← Back to all LGUs
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>{profile.name}</h1>
        <p style={{ fontSize: 16, color: '#6b7280', margin: 0 }}>{profile.province} · {profile.region}</p>
        <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.6, marginTop: 12 }}>{profile.description}</p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 12,
        marginBottom: 32,
      }}>
        <StatCard label="Population" value={formatPopulation(profile.population)} />
        <StatCard label="Safety" value={safety.label} color={safety.color} />
        <StatCard label="English" value={profile.english_proficiency.replace('very ', '')} />
        <StatCard label="Retirement" value={profile.retirement_suitability.replace('very ', '')} color="#059669" />
        <StatCard label="1BR Rent" value={profile.cost_of_living_rent_1br} />
        <StatCard label="Monthly Food" value={profile.cost_of_living_food} />
      </div>

      {/* Two-column detail */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>Healthcare</h3>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {profile.hospitals.map((h, i) => (
              <li key={i} style={{ padding: '6px 0', fontSize: 14, color: '#4b5563', borderBottom: i < profile.hospitals.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                🏥 {h}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>Internet & Connectivity</h3>
          <p style={{ fontSize: 14, color: '#4b5563', margin: '0 0 8px' }}>
            {profile.internet_fiber ? '✅ Fiber internet available' : '❌ No fiber confirmed'}
          </p>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 4px' }}>Providers:</p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {profile.internet_providers.map((p, i) => (
              <li key={i} style={{ padding: '3px 0', fontSize: 13, color: '#6b7280' }}>· {p}</li>
            ))}
          </ul>
        </div>

        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>Airport</h3>
          {profile.has_airport ? (
            <>
              <p style={{ fontSize: 14, color: '#4b5563', margin: '0 0 4px' }}>✈️ {profile.airport_name}</p>
              {profile.has_international_airport ? (
                <p style={{ fontSize: 13, color: '#059669', margin: 0 }}>International airport</p>
              ) : (
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                  Nearest international: {profile.nearest_international_airport} ({profile.nearest_international_airport_distance_km}km)
                </p>
              )}
            </>
          ) : (
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              Nearest international: {profile.nearest_international_airport} ({profile.nearest_international_airport_distance_km}km)
            </p>
          )}
        </div>

        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>Expat Community</h3>
          <p style={{ fontSize: 14, color: '#4b5563', margin: '0 0 12px' }}>{profile.expat_community}</p>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 4px' }}>Facebook Groups:</p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {profile.expat_fb_groups.map((g, i) => (
              <li key={i} style={{ padding: '2px 0', fontSize: 13, color: '#059669' }}>📘 {g}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Climate & Industries */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>Climate & Economy</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 4px' }}>Climate</p>
              <p style={{ fontSize: 15, color: '#111827', margin: 0, fontWeight: 500 }}>{profile.climate}</p>
            </div>
            <div>
              <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 4px' }}>Key Industries</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {profile.key_industries.map((ind) => (
                  <span key={ind} style={{
                    fontSize: 12,
                    background: '#f3f4f6',
                    padding: '2px 8px',
                    borderRadius: 4,
                    color: '#6b7280',
                  }}>
                    {ind}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Signals */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>
          Recent Signals
        </h2>
        {articles.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>
              No recent signals yet. New articles will appear here as they're collected.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {articles.filter(a => a.isInvestmentSignal).map((article) => (
              <a key={article.pk} href={article.url} target="_blank" rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  background: 'white',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  padding: 16,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: getSentimentColor(article.sentiment),
                    marginTop: 6,
                    flexShrink: 0,
                  }} />
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#111827' }}>{article.title}</p>
                    <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6b7280' }}>{article.summary}</p>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {(article.sectors || []).map((s) => (
                        <span key={s} style={{
                          fontSize: 11,
                          padding: '1px 6px',
                          borderRadius: 3,
                          background: '#f3f4f6',
                          color: '#6b7280',
                        }}>{s}</span>
                      ))}
                      <span style={{
                        fontSize: 11,
                        padding: '1px 6px',
                        borderRadius: 3,
                        background: getSentimentColor(article.sentiment) + '15',
                        color: getSentimentColor(article.sentiment),
                      }}>{article.sentiment}</span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Subscribe */}
      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <SubscribeForm />
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16, textAlign: 'center' }}>
      <p style={{ margin: '0 0 4px', fontSize: 12, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: color || '#111827' }}>{value}</p>
    </div>
  );
}