import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchLgus, getSafetyLabel, getSuitabilityLabel, formatPopulation } from './api';
import type { LguProfile } from './api';

const COMPARE_FIELDS = [
  { key: 'region', label: 'Region', icon: '📍' },
  { key: 'population', label: 'Population', icon: '👥', format: (v: number) => formatPopulation(v) },
  { key: 'safety', label: 'Safety', icon: '🛡️', format: (v: string) => getSafetyLabel(v).label },
  { key: 'retirement', label: 'Retirement', icon: '⭐', format: (v: string) => getSuitabilityLabel(v).label },
  { key: 'rent', label: 'Rent (1BR)', icon: '🏠', extract: (p: LguProfile) => p.cost_of_living_rent_1br },
  { key: 'food', label: 'Monthly Food', icon: '🍽️', extract: (p: LguProfile) => p.cost_of_living_food },
  { key: 'airport', label: 'Airport', icon: '✈️', extract: (p: LguProfile) => p.has_international_airport ? 'International' : p.has_airport ? 'Domestic' : 'Nearest city' },
  { key: 'hospitals', label: 'Hospitals', icon: '🏥', extract: (p: LguProfile) => `${p.hospitals.length}` },
  { key: 'fiber', label: 'Fiber Internet', icon: '🌐', extract: (p: LguProfile) => p.internet_fiber ? '✅ Yes' : '❌ No' },
  { key: 'english', label: 'English', icon: '🗣️', extract: (p: LguProfile) => p.english_proficiency.replace('very ', '') },
  { key: 'industries', label: 'Key Industries', icon: '🏭', extract: (p: LguProfile) => p.key_industries.slice(0, 3).join(', ') },
];

export default function ComparePage() {
  const [lgus, setLgus] = useState<LguProfile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLgus().then((data) => {
      const active = data.filter(l => l.status === 'active');
      setLgus(active);
      // Default: select first 3
      setSelected(active.slice(0, 3).map(l => l.slug));
      setLoading(false);
    });
  }, []);

  const toggle = (slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  };

  const selectedLgus = lgus.filter(l => selected.includes(l.slug));

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      <Link to="/" style={{ color: '#059669', textDecoration: 'none', fontSize: 14, marginBottom: 16, display: 'inline-block' }}>
        ← Back to home
      </Link>

      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>
        Compare LGUs
      </h1>
      <p style={{ fontSize: 15, color: '#6b7280', margin: '0 0 24px' }}>
        Select up to 6 LGUs to compare side by side.
      </p>

      {/* LGU selector chips */}
      {loading ? (
        <p style={{ color: '#9ca3af' }}>Loading...</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
          {lgus.map((lgu) => {
            const isSel = selected.includes(lgu.slug);
            return (
              <button
                key={lgu.slug}
                onClick={() => toggle(lgu.slug)}
                disabled={!isSel && selected.length >= 6}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: isSel ? '2px solid #059669' : '1px solid #e5e7eb',
                  background: isSel ? '#f0fdf4' : 'white',
                  color: isSel ? '#059669' : '#6b7280',
                  fontSize: 13,
                  fontWeight: isSel ? 600 : 400,
                  cursor: selected.length >= 6 && !isSel ? 'not-allowed' : 'pointer',
                  opacity: selected.length >= 6 && !isSel ? 0.5 : 1,
                }}
              >
                {lgu.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Comparison table */}
      {selectedLgus.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 12px', background: '#f9fafb', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, position: 'sticky', left: 0, zIndex: 1, minWidth: 140 }}>
                  Metric
                </th>
                {selectedLgus.map((lgu) => (
                  <th key={lgu.slug} style={{ textAlign: 'center', padding: '10px 12px', background: '#f9fafb', borderBottom: '2px solid #e5e7eb', minWidth: 140 }}>
                    <Link to={`/lgus/${lgu.slug}`} style={{ color: '#059669', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
                      {lgu.name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_FIELDS.map((field) => (
                <tr key={field.key}>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', color: '#374151', fontWeight: 500, position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>
                    {field.icon} {field.label}
                  </td>
                  {selectedLgus.map((lgu) => {
                    let value: string;
                    if (field.format && field.key === 'safety') {
                      value = getSafetyLabel((lgu as any)[field.key]).label;
                    } else if (field.format && field.key === 'retirement') {
                      value = getSuitabilityLabel((lgu as any)[field.key]).label;
                    } else if (field.format && field.key === 'population') {
                      value = formatPopulation(lgu.population);
                    } else if (field.extract) {
                      value = field.extract(lgu);
                    } else {
                      value = String((lgu as any)[field.key] || '');
                    }

                    const isGreen = value.includes('Yes') || value === 'International' || value === 'Excellent' || value === 'Very Safe' || value === 'Safe' || value === 'Very High';
                    const isYellow = value === 'Good' || value === 'Moderate' || value === 'Domestic';
                    const isRed = value === 'No' || value === '❌ No';

                    return (
                      <td key={lgu.slug} style={{
                        textAlign: 'center',
                        padding: '10px 12px',
                        borderBottom: '1px solid #f3f4f6',
                        color: isGreen ? '#059669' : isYellow ? '#ca8a04' : isRed ? '#ef4444' : '#374151',
                        fontWeight: isGreen || isRed ? 600 : 400,
                        fontSize: 13,
                      }}>
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}