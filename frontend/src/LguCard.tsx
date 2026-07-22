import { Link } from 'react-router-dom';
import { formatPopulation, getSuitabilityLabel } from './api';
import type { LguProfile } from './api';

interface Props {
  lgu: LguProfile;
}

export default function LguCard({ lgu }: Props) {
  const suitability = getSuitabilityLabel(lgu.retirement_suitability);
  const colors = ['#059669', '#0891b2', '#7c3aed', '#dc2626', '#ca8a04', '#2563eb'];

  return (
    <Link to={`/lgus/${lgu.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 24,
        border: '1px solid #e5e7eb',
        transition: 'box-shadow 0.2s, transform 0.2s',
        cursor: 'pointer',
        height: '100%',
      }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'none';
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>{lgu.name}</h3>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: suitability.color,
            background: `${suitability.color}15`,
            padding: '2px 8px',
            borderRadius: 4,
          }}>
            {suitability.label}
          </span>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
          {lgu.description.substring(0, 120)}...
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: 4 }}>
            {lgu.region}
          </span>
          <span style={{ fontSize: 12, color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: 4 }}>
            Pop. {formatPopulation(lgu.population)}
          </span>
          {lgu.has_international_airport && (
            <span style={{ fontSize: 12, color: '#059669', background: '#f0fdf4', padding: '2px 8px', borderRadius: 4 }}>
              ✈️ Intl Airport
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {lgu.key_industries.slice(0, 3).map((industry, i) => (
            <span key={i} style={{
              fontSize: 11,
              color: colors[i % colors.length],
              background: `${colors[i % colors.length]}10`,
              padding: '2px 8px',
              borderRadius: 4,
              fontWeight: 500,
            }}>
              {industry}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}