import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchLgus } from './api';
import type { LguProfile } from './api';
import LguCard from './LguCard';
import SubscribeForm from './SubscribeForm';

export default function HomePage() {
  const [lgus, setLgus] = useState<LguProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLgus().then((data) => {
      setLgus(data);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      {/* Hero */}
      <div style={{
        textAlign: 'center',
        padding: '60px 24px 40px',
        background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)',
      }}>
        <h1 style={{
          margin: '0 0 12px',
          fontSize: 36,
          fontWeight: 800,
          color: '#111827',
          lineHeight: 1.2,
        }}>
          Find Your Place in the Philippines
        </h1>
        <p style={{
          margin: '0 auto 8px',
          fontSize: 18,
          color: '#6b7280',
          maxWidth: 600,
          lineHeight: 1.5,
        }}>
          Comprehensive retirement guides for 19 Philippine LGUs.
        </p>
        <p style={{
          margin: '0 auto 32px',
          fontSize: 15,
          color: '#9ca3af',
          maxWidth: 520,
          lineHeight: 1.5,
        }}>
          Cost of living, healthcare, safety, internet, schools, things to do — everything you need to choose where to retire. Plus a weekly newsletter with the latest LGU developments.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', padding: '16px 24px', background: 'white', borderRadius: 8, border: '1px solid #e5e7eb', minWidth: 120 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#059669' }}>{lgus.length}</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>LGUs Profiled</div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px 24px', background: 'white', borderRadius: 8, border: '1px solid #e5e7eb', minWidth: 120 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#059669' }}>Free</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Weekly Newsletter</div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px 24px', background: 'white', borderRadius: 8, border: '1px solid #e5e7eb', minWidth: 120 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#059669' }}>100%</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Independent Data</div>
          </div>
        </div>
      </div>

      {/* LGU Grid */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
            Profiled LGUs
          </h2>
          <Link to="/signals" style={{ fontSize: 14, color: '#059669', textDecoration: 'none', fontWeight: 500 }}>
            View all signals →
          </Link>
        </div>
        {loading ? (
          <p style={{ color: '#9ca3af' }}>Loading LGUs...</p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 20,
          }}>
            {lgus.filter(l => l.status === 'active').map((lgu) => (
              <LguCard key={lgu.slug} lgu={lgu} />
            ))}
          </div>
        )}
      </div>

      {/* Subscribe */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 24px 60px' }}>
        <SubscribeForm />
      </div>
    </div>
  );
}