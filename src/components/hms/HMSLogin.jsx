import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../supabaseClient';

export default function HMSLogin() {
    const [mode, setMode] = useState('login'); // 'login' | 'signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [hostelName, setHostelName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    async function handleLogin(e) {
        e.preventDefault();
        setError(''); setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
        setLoading(false);
    }

    async function handleSignup(e) {
        e.preventDefault();
        setError(''); setLoading(true);

        if (!ownerName.trim() || !hostelName.trim()) {
            setError('Owner name and hostel name are required.');
            setLoading(false);
            return;
        }

        const { data, error: authErr } = await supabase.auth.signUp({ email, password });
        if (authErr) { setError(authErr.message); setLoading(false); return; }

        if (data.user) {
            const { error: dbErr } = await supabase.from('hms_tenants').insert({
                auth_id: data.user.id,
                owner_name: ownerName.trim(),
                email,
                phone: phone.trim() || null,
                hostel_name: hostelName.trim(),
                plan: 'free',
            });
            if (dbErr) { setError(dbErr.message); setLoading(false); return; }
        }

        setSuccess('Account created! Check your email to confirm, then log in.');
        setLoading(false);
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--background)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
        }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{ width: '100%', maxWidth: 420 }}
            >
                {/* Branding */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 10,
                        padding: '8px 18px', borderRadius: 12,
                        background: 'rgba(204,151,255,0.10)', border: '1px solid rgba(204,151,255,0.25)',
                        marginBottom: 16,
                    }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--primary)' }}>apartment</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, letterSpacing: '-0.02em', color: 'var(--primary)' }}>TEC HMS</span>
                    </div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 8 }}>
                        Hostel Management<br />
                        <span style={{ color: 'var(--primary)' }}>for Owners</span>
                    </h1>
                    <p style={{ color: 'var(--on-surface-var)', fontSize: 13, lineHeight: 1.5 }}>
                        Manage rooms, students & fees — all in one dashboard.
                    </p>
                </div>

                {/* Tab */}
                <div style={{ display: 'flex', gap: 4, background: 'var(--surface-highest)', borderRadius: 10, padding: 4, marginBottom: 24 }}>
                    {['login', 'signup'].map(m => (
                        <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                            style={{
                                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, letterSpacing: '0.04em',
                                background: mode === m ? 'var(--primary)' : 'transparent',
                                color: mode === m ? '#000' : 'var(--on-surface-var)',
                                transition: 'all 0.14s',
                            }}>
                            {m === 'login' ? 'Log In' : 'Register'}
                        </button>
                    ))}
                </div>

                {/* Form */}
                <div className="neon-card" style={{ padding: 24 }}>
                    {error && (
                        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,110,132,0.10)', border: '1px solid rgba(255,110,132,0.3)', color: 'var(--error)', fontSize: 12, marginBottom: 16 }}>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', fontSize: 12, marginBottom: 16 }}>
                            {success}
                        </div>
                    )}

                    <form onSubmit={mode === 'login' ? handleLogin : handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {mode === 'signup' && (
                            <>
                                <div>
                                    <label style={{ fontSize: 11, color: 'var(--on-surface-var)', fontWeight: 600, display: 'block', marginBottom: 6 }}>OWNER / MANAGER NAME</label>
                                    <input className="neon-input" value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Your full name" required style={{ width: '100%' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, color: 'var(--on-surface-var)', fontWeight: 600, display: 'block', marginBottom: 6 }}>HOSTEL / PG NAME</label>
                                    <input className="neon-input" value={hostelName} onChange={e => setHostelName(e.target.value)} placeholder="e.g. Sunrise Boys PG" required style={{ width: '100%' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, color: 'var(--on-surface-var)', fontWeight: 600, display: 'block', marginBottom: 6 }}>PHONE (optional)</label>
                                    <input className="neon-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" style={{ width: '100%' }} />
                                </div>
                            </>
                        )}

                        <div>
                            <label style={{ fontSize: 11, color: 'var(--on-surface-var)', fontWeight: 600, display: 'block', marginBottom: 6 }}>EMAIL</label>
                            <input className="neon-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="owner@example.com" required style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, color: 'var(--on-surface-var)', fontWeight: 600, display: 'block', marginBottom: 6 }}>PASSWORD</label>
                            <input className="neon-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} style={{ width: '100%' }} />
                        </div>

                        <button type="submit" disabled={loading}
                            style={{
                                marginTop: 4, padding: '12px', borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                                background: 'var(--primary)', color: '#000', fontFamily: 'var(--font-display)', fontWeight: 900,
                                fontSize: 14, letterSpacing: '0.04em', opacity: loading ? 0.6 : 1, transition: 'all 0.14s',
                            }}>
                            {loading ? 'Please wait…' : mode === 'login' ? 'Log In to HMS' : 'Create Account'}
                        </button>
                    </form>
                </div>

                {/* Plan teaser */}
                {mode === 'signup' && (
                    <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        {[
                            { label: 'Free', price: '₹0/mo', features: ['50 beds', 'Basic dashboard', 'No TEC listing'] },
                            { label: 'Pro', price: '₹999/mo', features: ['Unlimited beds', 'TEC Marketplace listing', 'Verified badge'], highlight: true },
                            { label: 'Enterprise', price: 'Custom', features: ['Multi-property', 'White-label', 'API access'] },
                        ].map(plan => (
                            <div key={plan.label} style={{
                                padding: '12px 10px', borderRadius: 10, textAlign: 'center',
                                background: plan.highlight ? 'rgba(204,151,255,0.10)' : 'var(--surface)',
                                border: `1px solid ${plan.highlight ? 'rgba(204,151,255,0.35)' : 'rgba(255,255,255,0.06)'}`,
                            }}>
                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 12, color: plan.highlight ? 'var(--primary)' : 'var(--on-surface)', marginBottom: 2 }}>{plan.label}</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--on-surface-var)', marginBottom: 8 }}>{plan.price}</div>
                                {plan.features.map(f => (
                                    <div key={f} style={{ fontSize: 9, color: 'var(--on-surface-var)', marginBottom: 2 }}>{f}</div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
