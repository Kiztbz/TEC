import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import AdBanner from './AdBanner';

const CATEGORIES = ['All', 'Hardware', 'Study Sessions', 'Software', 'Books', 'Services'];
const CONDITIONS = ['Any', 'New', 'Like New', 'Good', 'Functional'];

const ITEMS = [];
const _ITEMS_UNUSED = [
    {
        id: 1, cat: 'Hardware', title: 'NVIDIA RTX 4070 Ti', price: '₹42,000', condition: 'Like New', live: true,
        desc: 'Used 3 months for ML research. Full box, warranty valid. No thermal issues.',
        seller: 'neural_arc', batch: 'B.Tech CSE 2024', posted: '1h ago',
        stats: { views: 214, enquiries: 12 },
    },
    {
        id: 2, cat: 'Study Sessions', title: 'DSA Prep — LeetCode Grind', price: 'Free', condition: null, live: true,
        desc: 'Daily 8pm session on Zoom. 10–20 medium problems per session. All branches welcome.',
        seller: 'byte_knight', batch: 'B.Tech IT 2025', posted: '3h ago',
        stats: { views: 98, enquiries: 31 },
    },
    {
        id: 3, cat: 'Software', title: 'Figma Pro 3-Month Sub', price: '₹899', condition: 'New', live: false,
        desc: 'Transferable Figma Professional plan. 3 months remaining. Email transfer.',
        seller: 'pixelfreak', batch: 'B.Des 2026', posted: '6h ago',
        stats: { views: 60, enquiries: 4 },
    },
    {
        id: 4, cat: 'Books', title: 'GATE CSE 2024 Full Set', price: '₹1,200', condition: 'Good', live: false,
        desc: '8-book set from Made Easy + handwritten notes. 80% syllabus covered. Minimal highlighting.',
        seller: 'gate_lord', batch: 'MSc CS 2024', posted: '1d ago',
        stats: { views: 144, enquiries: 17 },
    },
    {
        id: 5, cat: 'Services', title: 'UI/UX Design for Startups', price: '₹500/hr', condition: null, live: false,
        desc: 'Full product design: wireframes, high-fi mockups, design systems. 4+ years Figma experience.',
        seller: 'sigma_design', batch: 'B.Des 2025', posted: '2d ago',
        stats: { views: 82, enquiries: 6 },
    },
];

const INSIGHTS = [
    { label: 'Items Listed', value: '1,284', delta: '+12 today' },
    { label: 'Active Deals', value: '412', delta: '+3.2%' },
    { label: 'Avg Enquiry Rate', value: '8.4%', delta: 'vs 6.1% last wk' },
];

export default function Assignments() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [listings, setListings] = useState([]);
    const [loadingListings, setLoadingListings] = useState(true);
    const [submittingListing, setSubmittingListing] = useState(false);
    const [activecat, setActiveCat] = useState('All');
    const [condition, setCondition] = useState('Any');
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: '', price: '', cat: 'Hardware', condition: 'New', desc: '', contact: '' });

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        let q = supabase.from('marketplace_listings').select('*').order('created_at', { ascending: false });
        if (!isAdmin) q = q.eq('approved', true);
        q.then(({ data }) => { setListings(data || []); setLoadingListings(false); });
    }, [isAdmin]);

    const handlePostListing = async () => {
        if (!form.title.trim() || !user) return;
        setSubmittingListing(true);
        const { data, error } = await supabase.from('marketplace_listings').insert({
            user_id: user.id,
            title: form.title,
            price: form.price,
            cat: form.cat,
            condition: form.condition,
            description: form.desc,
            contact: form.contact,
            seller_name: user.name,
            approved: null,
        }).select().single();
        if (!error && data) {
            if (isAdmin) setListings(prev => [data, ...prev]);
            setShowForm(false);
            setForm({ title: '', price: '', cat: 'Hardware', condition: 'New', desc: '', contact: '' });
        }
        setSubmittingListing(false);
    };

    const filtered = listings.filter(i => {
        const matchCat = activecat === 'All' || i.cat === activecat;
        const matchCond = condition === 'Any' || !i.condition || i.condition === condition;
        const matchQ = !search || i.title.toLowerCase().includes(search.toLowerCase()) || (i.description || '').toLowerCase().includes(search.toLowerCase());
        return matchCat && matchCond && matchQ;
    });

    return (
        <div className="page-wrap" style={{ maxWidth: 1280 }}>
            <div className="two-col">

                {/* ── LEFT ── */}
                <div>
                    {/* Header block */}
                    <div style={{ marginBottom: 28 }}>
                        <div className="eyebrow" style={{ marginBottom: 8 }}>The Bazaar</div>
                        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.95, marginBottom: 12 }}>
                            CAMPUS_<span className="accent-tertiary">MARKETPLACE</span>
                        </h1>
                        <p style={{ color: 'var(--on-surface-var)', fontSize: 14, maxWidth: 480, lineHeight: 1.6 }}>Buy, sell, trade — hardware, sessions, software, and skills within the campus grid.</p>
                    </div>

                    {/* Search + filter bar */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                            <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--on-surface-var)' }}>search</span>
                            <input className="neon-input" placeholder="Search listings…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40, width: '100%' }} />
                        </div>
                        <select className="neon-select" value={condition} onChange={e => setCondition(e.target.value)} style={{ minWidth: 100, flex: '0 0 auto' }}>
                            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    {/* Category pills */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                        {CATEGORIES.map(c => (
                            <button key={c} onClick={() => setActiveCat(c)} style={{
                                padding: '6px 16px', borderRadius: 9999, fontFamily: 'var(--font-display)',
                                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', border: 'none',
                                background: activecat === c ? 'rgba(255,149,160,0.15)' : 'var(--surface-highest)',
                                color: activecat === c ? 'var(--tertiary)' : 'var(--on-surface-var)',
                                outline: activecat === c ? '1px solid rgba(255,149,160,0.25)' : 'none',
                                transition: 'all 0.14s',
                            }}>{c}</button>
                        ))}
                        <button onClick={() => setShowForm(true)} className="btn-primary" style={{ marginLeft: 'auto', padding: '7px 18px', fontSize: 11, letterSpacing: '0.08em' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                            List Item
                        </button>
                    </div>

                    {/* Items */}
                    {loadingListings && (
                        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--on-surface-var)' }}>Loading listings...</div>
                    )}
                    {!loadingListings && filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--on-surface-var)' }}>No listings match your filters.</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {filtered.map(item => (
                            <div key={item.id} className="neon-card" style={{ padding: 22 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                                            {item.live && <span className="live-dot" />}
                                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>{item.title}</h3>
                                            <span className="tag-ghost" style={{ fontSize: 10 }}>{item.cat}</span>
                                            {item.condition && <span className="tag-secondary" style={{ fontSize: 9 }}>{item.condition}</span>}
                                            {isAdmin && (() => {
                                                const sc = item.approved === true ? '#4ade80' : item.approved === false ? '#FF6E84' : '#e3b341';
                                                const sl = item.approved === true ? 'APPROVED' : item.approved === false ? 'REJECTED' : 'PENDING';
                                                return <span style={{ fontSize: 8, padding: '2px 8px', borderRadius: 9999, background: `${sc}18`, color: sc, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{sl}</span>;
                                            })()}
                                        </div>
                                        <p style={{ color: 'var(--on-surface-var)', fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>{item.description}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--on-surface-var)' }}>
                                                <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,149,160,0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: 'var(--tertiary)' }}>{(item.seller_name || '?')[0].toUpperCase()}</span>
                                                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--on-surface)' }}>{item.seller_name || 'Unknown'}</span>
                                            </span>
                                            <span style={{ fontSize: 11, color: 'var(--on-surface-var)', fontFamily: 'var(--font-mono)' }}>
                                                {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, letterSpacing: '-0.03em', color: 'var(--tertiary)', marginBottom: 10 }}>{item.price}</div>
                                        <button
                                            className="btn-ghost-cyan"
                                            style={{ padding: '7px 16px', fontSize: 11, whiteSpace: 'nowrap' }}
                                            onClick={() => {
                                                if (item.user_id === user?.id) {
                                                    alert('You cannot contact yourself');
                                                } else {
                                                    navigate(`/messages?with=${item.user_id}&name=${encodeURIComponent(item.seller_name)}`);
                                                }
                                            }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>send</span>
                                            {item.cat === 'Study Sessions' ? 'Join Session' : 'Contact Seller'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── RIGHT: Market Insight ── */}
                <div style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="neon-card" style={{ padding: 20 }}>
                        <span className="eyebrow" style={{ display: 'block', marginBottom: 16 }}>Market Insight</span>
                        {INSIGHTS.map((s, i) => (
                            <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < INSIGHTS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                <div style={{ fontSize: 12, color: 'var(--on-surface-var)', marginBottom: 4 }}>{s.label}</div>
                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, letterSpacing: '-0.04em' }}>{s.value}</div>
                                <div style={{ fontSize: 11, color: 'var(--tertiary)', fontFamily: 'var(--font-mono)' }}>{s.delta}</div>
                            </div>
                        ))}
                    </div>

                    <div className="neon-card" style={{ padding: 20 }}>
                        <span className="eyebrow" style={{ display: 'block', marginBottom: 12 }}>Quick Links</span>
                        {[['sell', 'List an Item', '/assignments'], ['inventory_2', 'My Listings', '/assignments'], ['receipt_long', 'My Enquiries', '/assignments']].map(([icon, label]) => (
                            <button key={label} className="btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 8, fontSize: 12 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
                                {label}
                            </button>
                        ))}
                    </div>

                    <AdBanner variant="sidebar" offset={0} />
                </div>
            </div>

            {/* Submit modal */}
            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 6 }}>List on <span className="accent-tertiary">Bazaar</span></h2>
                        <p style={{ color: 'var(--on-surface-var)', fontSize: 13, marginBottom: 24 }}>Your listing will be reviewed by an admin before going live.</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                            <input className="neon-input" placeholder="Item title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                            <input className="neon-input" placeholder="Price (e.g. ₹1,500 or Free)" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                            <div style={{ display: 'flex', gap: 10 }}>
                                <select className="neon-select" style={{ flex: 1 }} value={form.cat} onChange={e => setForm({ ...form, cat: e.target.value })}>
                                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                                </select>
                                <select className="neon-select" style={{ flex: 1 }} value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}>
                                    {CONDITIONS.filter(c => c !== 'Any').map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <textarea className="neon-input" rows={4} placeholder="Description…" value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} style={{ resize: 'vertical' }} />
                            <input className="neon-input" placeholder="Contact (Insta / WhatsApp / Email)" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn-primary" onClick={handlePostListing} disabled={submittingListing} style={{ flex: 1, justifyContent: 'center', padding: 12, fontSize: 11, opacity: submittingListing ? 0.6 : 1 }}>{submittingListing ? 'Posting...' : 'Post Listing'}</button>
                            <button className="btn-secondary" onClick={() => setShowForm(false)} style={{ padding: '12px 20px' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
