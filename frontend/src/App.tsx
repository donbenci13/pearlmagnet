import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import HomePage from './HomePage';
import LguDetailPage from './LguDetailPage';
import SignalsPage from './SignalsPage';
import ComparePage from './ComparePage';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Nav */}
      <nav style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
        }}>
          <a href="/" style={{
            fontSize: 18,
            fontWeight: 800,
            color: '#059669',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 14,
            }}>
              PH
            </span>
            Investment Signals
          </a>
          <div style={{ display: 'flex', gap: 16 }}>
            <Link to="/" style={{ fontSize: 14, color: '#6b7280', textDecoration: 'none' }}>Home</Link>
            <Link to="/signals" style={{ fontSize: 14, color: '#6b7280', textDecoration: 'none' }}>Signals</Link>
            <Link to="/compare" style={{ fontSize: 14, color: '#6b7280', textDecoration: 'none' }}>Compare</Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '24px',
        color: '#9ca3af',
        fontSize: 13,
        borderTop: '1px solid #e5e7eb',
        background: 'white',
      }}>
        <p style={{ margin: 0 }}>PH Investment Signals · Pearlmagnet</p>
        <p style={{ margin: '4px 0 0', fontSize: 12 }}>Independent LGU intelligence for retirees and investors.</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/signals" element={<SignalsPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/lgus/:slug" element={<LguDetailPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}