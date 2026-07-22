import { useState } from 'react';
import { subscribe } from './api';

export default function SubscribeForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await subscribe(email);
      setStatus('success');
      setMessage(res.message);
      setEmail('');
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Try again.');
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      borderRadius: 16,
      padding: '40px 32px',
      color: 'white',
      textAlign: 'center',
    }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700 }}>Stay Informed</h2>
      <p style={{ margin: '0 0 24px', opacity: 0.9, fontSize: 15, lineHeight: 1.5 }}>
        Get weekly LGU intelligence — investment signals, safety updates, and retiree insights delivered to your inbox.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, maxWidth: 440, margin: '0 auto' }}>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 8,
            border: 'none',
            fontSize: 15,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          style={{
            padding: '12px 24px',
            borderRadius: 8,
            border: 'none',
            background: '#1f2937',
            color: 'white',
            fontSize: 15,
            fontWeight: 600,
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            opacity: status === 'loading' ? 0.7 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {status === 'loading' ? 'Subscribing...' : 'Subscribe Free'}
        </button>
      </form>
      {status === 'success' && (
        <p style={{ margin: '12px 0 0', fontSize: 14, opacity: 0.9 }}>✅ {message}</p>
      )}
      {status === 'error' && (
        <p style={{ margin: '12px 0 0', fontSize: 14, color: '#fca5a5' }}>{message}</p>
      )}
      <p style={{ margin: '12px 0 0', fontSize: 12, opacity: 0.7 }}>Free forever. No spam. Unsubscribe anytime.</p>
    </div>
  );
}