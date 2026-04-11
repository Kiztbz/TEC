import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import HostelManagementSystem from '../HostelManagementSystem';

const PLAN_META = {
    free: { label: 'Free', color: 'var(--on-surface-var)', maxBeds: 50 },
    pro: { label: 'Pro', color: 'var(--primary)', maxBeds: null },
    enterprise: { label: 'Enterprise', color: '#e3b341', maxBeds: null },
};

const NAV = [
    { id: 'overview', icon: 'dashboard', label: 'Overview' },
    { id: 'rooms', icon: 'bed', label: 'Rooms' },
    { id: 'students', icon: 'groups', label: 'Students' },
    { id: 'fees', icon: 'receipt_long', label: 'Fees' },
    { id: 'listing', icon: 'location_city', label: 'TEC Listing' },
    { id: 'settings', icon: 'settings', label: 'Settings' },
];

/* ── Onboarding wizard for first-time tenants ── */
function OnboardingWizard({ session, onComplete }) {
    const [step, setStep] = useState(0);
    const [form, setForm] = useState({ owner_name: '', hostel_name: '', phone: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function submit(e) {
        e.preventDefault();
        setError(''); setLoading(true);
        const { data, error: err } = await supabase.from('hms_tenants').insert({
            auth_id: session.user.id,
            owner_name: form.owner_name.trim(),
            email: session.user.email,
            phone: form.phone.trim() || null,
            hostel_name: form.hostel_name.trim(),
            plan: 'free',
        }).select().single();
        setLoading(false);
        if (err) { setError(err.message); return; }
        onComplete(data);
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: 440 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Welcome to TEC HMS</div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 6 }}>
                    Set up your <span style={{ color: 'var(--primary)' }}>hostel</span>
                </h1>
                <p style={{ color: 'var(--on-surface-var)', fontSize: 13, marginBottom: 28 }}>
                    Tell us about yourself to get started. You can update this anytime.
                </p>
                <div className="neon-card" style={{ padding: 24 }}>
                    {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,110,132,0.10)', border: '1px solid rgba(255,110,132,0.3)', color: 'var(--error)', fontSize: 12, marginBottom: 16 }}>{error}</div>}
                    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                            <label style={{ fontSize: 11, color: 'var(--on-surface-var)', fontWeight: 600, display: 'block', marginBottom: 6 }}>YOUR NAME</label>
                            <input className="neon-input" value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} placeholder="Owner / Manager name" required style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, color: 'var(--on-surface-var)', fontWeight: 600, display: 'block', marginBottom: 6 }}>HOSTEL / PG NAME</label>
                            <input className="neon-input" value={form.hostel_name} onChange={e => setForm(f => ({ ...f, hostel_name: e.target.value }))} placeholder="e.g. Sunrise Boys PG" required style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, color: 'var(--on-surface-var)', fontWeight: 600, display: 'block', marginBottom: 6 }}>PHONE (optional)</label>
                            <input className="neon-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" style={{ width: '100%' }} />
                        </div>
                        <button type="submit" disabled={loading} style={{ marginTop: 4, padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'var(--primary)', color: '#000', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14, opacity: loading ? 0.6 : 1 }}>
                            {loading ? 'Saving…' : 'Get Started →'}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}

/* ── Overview / stats panel ── */
function Overview({ tenant, properties }) {
    const plan = PLAN_META[tenant.plan] || PLAN_META.free;
    const listed = properties.filter(p => p.listed_on_tec && p.tec_approved).length;
    const pending = properties.filter(p => p.listed_on_tec && !p.tec_approved).length;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <div>
                    <div className="eyebrow" style={{ marginBottom: 4 }}>Dashboard</div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, letterSpacing: '-0.03em' }}>
                        {tenant.hostel_name}
                    </h2>
                </div>
                <span style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${plan.color}`, color: plan.color, fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.08em' }}>
                    {plan.label.toUpperCase()} PLAN
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 24 }}>
                {[
                    { label: 'Properties', value: properties.length, sub: 'registered', color: 'var(--secondary)' },
                    { label: 'TEC Listed', value: listed, sub: `${pending} pending approval`, color: 'var(--primary)' },
                    { label: 'Total Beds', value: properties.reduce((s, p) => s + (p.total_beds || 0), 0), sub: `${properties.reduce((s, p) => s + (p.available_beds || 0), 0)} available`, color: '#e3b341' },
                    { label: 'Plan Limit', value: plan.maxBeds ?? '∞', sub: 'beds', color: 'var(--tertiary)' },
                ].map((s, i) => (
                    <div key={i} className="neon-card" style={{ padding: '14px', borderTop: `2px solid ${s.color}` }}>
                        <div style={{ fontSize: 8, color: 'var(--on-surface-var)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: s.color, marginBottom: 2 }}>{s.value}</div>
                        <div style={{ fontSize: 8, color: 'var(--on-surface-var)' }}>{s.sub}</div>
                    </div>
                ))}
            </div>

            {tenant.plan === 'free' && (
                <div className="neon-card" style={{ padding: 18, borderTop: '2px solid var(--primary)', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--primary)' }}>workspace_premium</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14 }}>Upgrade to Pro</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--on-surface-var)', lineHeight: 1.5, marginBottom: 12 }}>
                        Get your hostel listed on TEC's local listings — seen by thousands of students near campus. Plus unlimited beds, a verified badge, and priority support.
                    </p>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--primary)' }}>₹999/mo</span>
                        <button className="btn-primary" style={{ padding: '8px 18px', fontSize: 12 }} onClick={() => alert('Contact team@tecapp.in to upgrade.')}>
                            Upgrade →
                        </button>
                    </div>
                </div>
            )}

            <div className="eyebrow" style={{ marginBottom: 10 }}>Your Properties</div>
            {properties.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--on-surface-var)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 36, opacity: 0.25, display: 'block', marginBottom: 8 }}>apartment</span>
                    No properties yet. Go to <strong>Rooms</strong> to set up your hostel.
                </div>
            ) : (
                properties.map(p => (
                    <div key={p.id} className="neon-card" style={{ padding: '14px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                        <div>
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--on-surface-var)' }}>{p.loc} • Rs.{p.price}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {p.tec_approved && p.listed_on_tec && (
                                <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 20, background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', fontWeight: 700, letterSpacing: '0.06em' }}>TEC LIVE</span>
                            )}
                            {p.listed_on_tec && !p.tec_approved && (
                                <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 20, background: 'rgba(227,179,65,0.12)', color: '#e3b341', border: '1px solid rgba(227,179,65,0.25)', fontWeight: 700, letterSpacing: '0.06em' }}>PENDING APPROVAL</span>
                            )}
                            <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 20, background: 'var(--surface-highest)', color: 'var(--on-surface-var)', fontWeight: 600 }}>
                                {p.available_beds}/{p.total_beds} beds free
                            </span>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

/* ── Property listing settings ── */
function ListingSettings({ tenant, properties, onRefresh }) {
    const [saving, setSaving] = useState(null);
    const [form, setForm] = useState({ name: '', loc: '', price: '', tags: '', desc: '', rating: 4.0, gender: 'any', total_beds: 0, listed_on_tec: false });
    const [showForm, setShowForm] = useState(false);
    const [toast, setToast] = useState('');
    const canList = tenant.plan !== 'free';

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    async function toggleListing(prop) {
        if (!canList && !prop.listed_on_tec) { showToast('Upgrade to Pro to list on TEC.'); return; }
        setSaving(prop.id);
        const { error } = await supabase.from('hms_properties')
            .update({ listed_on_tec: !prop.listed_on_tec })
            .eq('id', prop.id);
        setSaving(null);
        if (error) showToast('Error: ' + error.message);
        else { showToast(prop.listed_on_tec ? 'Removed from TEC listing.' : 'Listing request sent to admin.'); onRefresh(); }
    }

    async function addProperty(e) {
        e.preventDefault();
        const { error } = await supabase.from('hms_properties').insert({
            tenant_id: tenant.id,
            name: form.name.trim(),
            loc: form.loc.trim(),
            price: form.price.trim(),
            tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
            desc: form.desc.trim(),
            rating: parseFloat(form.rating) || 0,
            gender: form.gender,
            total_beds: parseInt(form.total_beds) || 0,
            available_beds: parseInt(form.total_beds) || 0,
            listed_on_tec: false,
            tec_approved: false,
        });
        if (error) showToast('Error: ' + error.message);
        else { setShowForm(false); setForm({ name: '', loc: '', price: '', tags: '', desc: '', rating: 4.0, gender: 'any', total_beds: 0, listed_on_tec: false }); onRefresh(); showToast('Property added!'); }
    }

    return (
        <div>
            {toast && (
                <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '12px 18px', fontSize: 13, zIndex: 999, color: 'var(--on-surface)' }}>
                    {toast}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <div className="eyebrow" style={{ marginBottom: 4 }}>TEC Listings</div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, letterSpacing: '-0.03em' }}>Marketplace Presence</h2>
                </div>
                <button className="btn-primary" onClick={() => setShowForm(s => !s)} style={{ padding: '8px 16px', fontSize: 12 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add</span> Add Property
                </button>
            </div>

            {!canList && (
                <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(227,179,65,0.08)', border: '1px solid rgba(227,179,65,0.25)', marginBottom: 18, fontSize: 12, color: '#e3b341' }}>
                    <strong>Pro plan required</strong> to list on TEC's local listings page. Free plan includes full hostel management.
                </div>
            )}

            {showForm && (
                <div className="neon-card" style={{ padding: 20, marginBottom: 18 }}>
                    <div className="eyebrow" style={{ marginBottom: 12 }}>New Property</div>
                    <form onSubmit={addProperty} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: 11, color: 'var(--on-surface-var)', fontWeight: 600, display: 'block', marginBottom: 5 }}>PROPERTY NAME</label>
                            <input className="neon-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Sunrise Boys PG" required style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, color: 'var(--on-surface-var)', fontWeight: 600, display: 'block', marginBottom: 5 }}>LOCATION</label>
                            <input className="neon-input" value={form.loc} onChange={e => setForm(f => ({ ...f, loc: e.target.value }))} placeholder="Bidholi" required style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, color: 'var(--on-surface-var)', fontWeight: 600, display: 'block', marginBottom: 5 }}>PRICE</label>
                            <input className="neon-input" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="6,500/mo" required style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, color: 'var(--on-surface-var)', fontWeight: 600, display: 'block', marginBottom: 5 }}>GENDER</label>
                            <select className="neon-input" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} style={{ width: '100%' }}>
                                <option value="any">Any</option>
                                <option value="boys">Boys only</option>
                                <option value="girls">Girls only</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 11, color: 'var(--on-surface-var)', fontWeight: 600, display: 'block', marginBottom: 5 }}>TOTAL BEDS</label>
                            <input className="neon-input" type="number" value={form.total_beds} onChange={e => setForm(f => ({ ...f, total_beds: e.target.value }))} min={1} style={{ width: '100%' }} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: 11, color: 'var(--on-surface-var)', fontWeight: 600, display: 'block', marginBottom: 5 }}>AMENITIES (comma-separated)</label>
                            <input className="neon-input" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="AC, WiFi, Meals, CCTV" style={{ width: '100%' }} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: 11, color: 'var(--on-surface-var)', fontWeight: 600, display: 'block', marginBottom: 5 }}>DESCRIPTION</label>
                            <textarea className="neon-input" value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} placeholder="Describe your hostel…" rows={3} style={{ width: '100%', resize: 'vertical' }} />
                        </div>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
                            <button type="submit" className="btn-primary" style={{ padding: '9px 20px', fontSize: 12 }}>Save Property</button>
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary" style={{ padding: '9px 20px', fontSize: 12 }}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {properties.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--on-surface-var)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 36, opacity: 0.25, display: 'block', marginBottom: 8 }}>apartment</span>
                    Add a property to manage TEC listing.
                </div>
            ) : (
                properties.map(prop => (
                    <div key={prop.id} className="neon-card" style={{ padding: '16px 18px', marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15 }}>{prop.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--on-surface-var)', marginBottom: 8 }}>{prop.loc} • Rs.{prop.price} • {prop.gender}</div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {(prop.tags || []).map(t => <span key={t} className="tag-ghost" style={{ fontSize: 9 }}>{t}</span>)}
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                                <button
                                    onClick={() => toggleListing(prop)}
                                    disabled={saving === prop.id}
                                    style={{
                                        padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11,
                                        fontFamily: 'var(--font-display)', fontWeight: 700,
                                        background: prop.listed_on_tec ? 'rgba(255,110,132,0.12)' : 'var(--primary)',
                                        color: prop.listed_on_tec ? 'var(--error)' : '#000',
                                        opacity: saving === prop.id ? 0.6 : 1,
                                    }}>
                                    {saving === prop.id ? '…' : prop.listed_on_tec ? 'Remove from TEC' : 'List on TEC →'}
                                </button>
                                {prop.listed_on_tec && prop.tec_approved && (
                                    <span style={{ fontSize: 9, color: '#4ade80', fontWeight: 700 }}>✓ Live on TEC</span>
                                )}
                                {prop.listed_on_tec && !prop.tec_approved && (
                                    <span style={{ fontSize: 9, color: '#e3b341', fontWeight: 700 }}>⏳ Awaiting approval</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

/* ── Settings ── */
function Settings({ tenant, onUpdate }) {
    const [form, setForm] = useState({ owner_name: tenant.owner_name, hostel_name: tenant.hostel_name, phone: tenant.phone || '' });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    async function save(e) {
        e.preventDefault();
        setSaving(true);
        const { error } = await supabase.from('hms_tenants')
            .update({ owner_name: form.owner_name.trim(), hostel_name: form.hostel_name.trim(), phone: form.phone.trim() || null })
            .eq('id', tenant.id);
        setSaving(false);
        if (error) setMsg('Error: ' + error.message);
        else { setMsg('Saved!'); onUpdate({ ...tenant, ...form }); }
        setTimeout(() => setMsg(''), 3000);
    }

    return (
        <div style={{ maxWidth: 520 }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Settings</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, letterSpacing: '-0.03em', marginBottom: 20 }}>Account Settings</h2>
            <div className="neon-card" style={{ padding: 22 }}>
                {msg && <div style={{ padding: '9px 13px', borderRadius: 8, background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', fontSize: 12, marginBottom: 14 }}>{msg}</div>}
                <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 11, color: 'var(--on-surface-var)', fontWeight: 600, display: 'block', marginBottom: 5 }}>OWNER NAME</label>
                        <input className="neon-input" value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} required style={{ width: '100%' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, color: 'var(--on-surface-var)', fontWeight: 600, display: 'block', marginBottom: 5 }}>HOSTEL NAME</label>
                        <input className="neon-input" value={form.hostel_name} onChange={e => setForm(f => ({ ...f, hostel_name: e.target.value }))} required style={{ width: '100%' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, color: 'var(--on-surface-var)', fontWeight: 600, display: 'block', marginBottom: 5 }}>PHONE</label>
                        <input className="neon-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={{ width: '100%' }} />
                    </div>
                    <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--surface-highest)', fontSize: 12, color: 'var(--on-surface-var)' }}>
                        <strong style={{ color: 'var(--on-surface)' }}>Plan:</strong> {PLAN_META[tenant.plan]?.label}{' '}
                        {tenant.plan === 'free' && <span style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => alert('Email team@tecapp.in to upgrade.')}>→ Upgrade to Pro</span>}
                    </div>
                    <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '10px', fontSize: 12, opacity: saving ? 0.6 : 1 }}>
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
}

/* ── Main Dashboard ── */
export default function HMSDashboard({ session, tenant: initialTenant, onTenantCreated, onLogout }) {
    const [tenant, setTenant] = useState(initialTenant);
    const [tab, setTab] = useState('overview');
    const [properties, setProperties] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        if (tenant) fetchProperties();
    }, [tenant]);

    async function fetchProperties() {
        const { data } = await supabase
            .from('hms_properties')
            .select('*')
            .eq('tenant_id', tenant.id)
            .order('created_at', { ascending: false });
        setProperties(data || []);
    }

    if (!tenant) {
        return <OnboardingWizard session={session} onComplete={t => { setTenant(t); onTenantCreated(t); }} />;
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
            {/* Sidebar */}
            <div style={{
                width: sidebarOpen ? 220 : 56, flexShrink: 0,
                background: 'var(--surface)', borderRight: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', flexDirection: 'column', transition: 'width 0.2s',
                overflow: 'hidden',
            }}>
                {/* Logo */}
                <div style={{ padding: '18px 16px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--primary)', flexShrink: 0 }}>apartment</span>
                    {sidebarOpen && (
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 13, color: 'var(--primary)', whiteSpace: 'nowrap' }}>TEC HMS</div>
                            <div style={{ fontSize: 9, color: 'var(--on-surface-var)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{tenant.hostel_name}</div>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {NAV.map(n => (
                        <button key={n.id} onClick={() => setTab(n.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: sidebarOpen ? '9px 10px' : '9px 0',
                                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                                borderRadius: 8, border: 'none', cursor: 'pointer',
                                background: tab === n.id ? 'rgba(204,151,255,0.14)' : 'transparent',
                                color: tab === n.id ? 'var(--primary)' : 'var(--on-surface-var)',
                                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
                                transition: 'all 0.12s', width: '100%', textAlign: 'left',
                            }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18, flexShrink: 0 }}>{n.icon}</span>
                            {sidebarOpen && <span style={{ whiteSpace: 'nowrap' }}>{n.label}</span>}
                        </button>
                    ))}
                </nav>

                {/* Logout */}
                <div style={{ padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button onClick={onLogout}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: sidebarOpen ? '9px 10px' : '9px 0',
                            justifyContent: sidebarOpen ? 'flex-start' : 'center',
                            borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent',
                            color: 'var(--on-surface-var)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
                            width: '100%',
                        }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
                        {sidebarOpen && 'Log Out'}
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                {/* Topbar */}
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)' }}>
                    <button onClick={() => setSidebarOpen(s => !s)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-var)', display: 'flex', padding: 4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{sidebarOpen ? 'menu_open' : 'menu'}</span>
                    </button>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>
                        {NAV.find(n => n.id === tab)?.label}
                    </span>
                    <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--on-surface-var)' }}>
                        {session.user.email}
                    </div>
                </div>

                {/* Tab content */}
                <div style={{ padding: '28px 24px', maxWidth: 1100 }}>
                    {tab === 'overview' && <Overview tenant={tenant} properties={properties} />}
                    {tab === 'rooms' && <HostelManagementSystem />}
                    {tab === 'listing' && <ListingSettings tenant={tenant} properties={properties} onRefresh={fetchProperties} />}
                    {tab === 'settings' && <Settings tenant={tenant} onUpdate={setTenant} />}
                    {(tab === 'students' || tab === 'fees') && (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--on-surface-var)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.2, display: 'block', marginBottom: 10 }}>construction</span>
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{tab === 'students' ? 'Student Management' : 'Fee Tracker'} — Coming in v2</div>
                            <div style={{ fontSize: 12, marginTop: 6 }}>Use the Rooms tab (Hostel Management System) for now.</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
