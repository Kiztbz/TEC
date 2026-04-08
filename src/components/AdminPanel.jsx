import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import HostelManagementSystem from './HostelManagementSystem';

const ROLE_META = {
  admin: { color: '#FF6E84', bg: 'rgba(255,110,132,0.10)', border: 'rgba(255,110,132,0.25)' },
  moderator: { color: '#FF95A0', bg: 'rgba(255,149,160,0.10)', border: 'rgba(255,149,160,0.22)' },
  builder: { color: '#CC97FF', bg: 'rgba(204,151,255,0.10)', border: 'rgba(204,151,255,0.22)' },
  student: { color: '#53DDFC', bg: 'rgba(83,221,252,0.10)', border: 'rgba(83,221,252,0.22)' },
};

const TABS = [
  { id: 'overview', icon: 'dashboard', label: 'Overview' },
  { id: 'marketplace', icon: 'pending_actions', label: 'Marketplace' },
  { id: 'deals', icon: 'sell', label: 'Deals' },
  { id: 'listings', icon: 'location_city', label: 'Listings' },
  { id: 'members', icon: 'people', label: 'Members' },
  { id: 'referrals', icon: 'card_giftcard', label: 'Referrals' },
  { id: 'analytics', icon: 'analytics', label: 'Analytics' },
  { id: 'hms', icon: 'apartment', label: 'Hostel Mgmt' },
];

const CAT_COLOR = {
  Food: 'var(--secondary)', Transport: 'var(--primary)', Shopping: '#e3b341',
  Health: 'var(--error)', Study: 'var(--tertiary)', Stay: '#a889ff',
};
const DEAL_CATS = ['Food', 'Transport', 'Shopping', 'Health', 'Study', 'Stay'];
const LISTING_TABS = ['PG / Hostels', 'Restaurants', 'Rentals', 'Hangout Spots', 'Activities'];

const DEAL_EMPTY = { name: '', cat: 'Food', discount: '', desc: '', validity: '', code: '', loc: '' };
const LISTING_EMPTY = { name: '', tab: 'PG / Hostels', loc: '', price: '', rating: 4.0, tags: '', desc: '' };

function RoleBadge({ role }) {
  const m = ROLE_META[role] || ROLE_META.student;
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
      padding: '2px 8px', borderRadius: 5, border: `1px solid ${m.border}`,
      background: m.bg, color: m.color, fontFamily: 'var(--font-display)',
    }}>{role}</span>
  );
}

export default function AdminPanel() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState({ members: 0, posts: 0, listings: 0, issues: 0, deals: 0 });
  const [members, setMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [mktListings, setMktListings] = useState([]);
  const [editMktItem, setEditMktItem] = useState(null);
  const [mktFilter, setMktFilter] = useState('all');
  const [deals, setDeals] = useState([]);
  const [dealForm, setDealForm] = useState(DEAL_EMPTY);
  const [editDealId, setEditDealId] = useState(null);
  const [showDealForm, setShowDealForm] = useState(false);
  const [adminListings, setAdminListings] = useState([]);
  const [listingForm, setListingForm] = useState(LISTING_EMPTY);
  const [editListingId, setEditListingId] = useState(null);
  const [showListingForm, setShowListingForm] = useState(false);
  const [activeListingTab, setActiveListingTab] = useState('PG / Hostels');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [editMember, setEditMember] = useState(null);
  const [memberRoleFilter, setMemberRoleFilter] = useState('all');
  const [certInput, setCertInput] = useState('');
  const [referrals, setReferrals] = useState([]);
  const [refForm, setRefForm] = useState({ assigned_to_name: '', assigned_to_email: '' });
  const [showRefForm, setShowRefForm] = useState(false);
  const [refLoading, setRefLoading] = useState(false);
  const [refMembersList, setRefMembersList] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsWindow, setAnalyticsWindow] = useState('24h');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    if (tab === 'overview') fetchOverview();
    if (tab === 'marketplace') fetchMktListings();
    if (tab === 'deals') fetchDeals();
    if (tab === 'listings') fetchAdminListings();
    if (tab === 'members') fetchMembers();
    if (tab === 'referrals') fetchReferrals();
    if (tab === 'analytics') fetchAnalytics();
  }, [tab]);

  useEffect(() => { if (tab === 'analytics') fetchAnalytics(); }, [analyticsWindow]);

  // Observe who is online via Realtime Presence
  useEffect(() => {
    if (tab !== 'analytics') return;
    const observer = supabase.channel('tec-presence');
    observer
      .on('presence', { event: 'sync' }, () => {
        const users = Object.values(observer.presenceState()).flat();
        setOnlineUsers(users);
      })
      .subscribe();
    return () => { supabase.removeChannel(observer); };
  }, [tab]);

  const fetchReferrals = async () => {
    setRefLoading(true);
    const [{ data: refs }, { data: mems }] = await Promise.all([
      supabase.from('referral_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('members').select('id, name, email').order('name', { ascending: true }),
    ]);
    setReferrals(refs || []);
    setRefMembersList(mems || []);
    setRefLoading(false);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars → 256 % 32 === 0, no modulo bias
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => chars[b % chars.length]).join('');
  };

  const createReferral = async () => {
    const code = generateCode();
    const { error } = await supabase.from('referral_codes').insert({
      code,
      created_by: user.id,
      assigned_to_name: refForm.assigned_to_name.trim() || null,
      assigned_to_email: refForm.assigned_to_email.trim() || null,
    });
    if (error) { showToast('Error creating code: ' + error.message); return; }
    setShowRefForm(false);
    setRefForm({ assigned_to_name: '', assigned_to_email: '' });
    showToast(`Code created: ${code} — share it with the invitee.`);
    fetchReferrals();
  };

  const deleteReferral = async (id, used) => {
    if (used) { showToast('Cannot delete a used referral code.'); return; }
    if (!window.confirm('Delete this referral code?')) return;
    await supabase.from('referral_codes').delete().eq('id', id);
    setReferrals(p => p.filter(r => r.id !== id));
    showToast('Referral code deleted.');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => showToast('Code copied!'));
  };

  const fetchOverview = async () => {
    const [m, p, l, i, d] = await Promise.all([
      supabase.from('members').select('*', { count: 'exact', head: true }),
      supabase.from('feed_posts').select('*', { count: 'exact', head: true }),
      supabase.from('marketplace_listings').select('*', { count: 'exact', head: true }),
      supabase.from('pulse_issues').select('*', { count: 'exact', head: true }),
      supabase.from('deals').select('*', { count: 'exact', head: true }),
    ]);
    setStats({ members: m.count || 0, posts: p.count || 0, listings: l.count || 0, issues: i.count || 0, deals: d.count || 0 });
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    const now = new Date();
    const windowMs = { '1h': 3600000, '24h': 86400000, '7d': 604800000, '30d': 2592000000 }[analyticsWindow];
    const windowStart = new Date(now - windowMs).toISOString();
    const [
      { count: newPosts }, { count: newVotes }, { count: newIssues },
      { count: newListings }, { count: newMembers },
      { data: recentMembers }, { data: allMembers },
      { count: referralTotal }, { count: referralUsed },
    ] = await Promise.all([
      supabase.from('feed_posts').select('*', { count: 'exact', head: true }).gte('created_at', windowStart),
      supabase.from('post_votes').select('*', { count: 'exact', head: true }).gte('created_at', windowStart),
      supabase.from('pulse_issues').select('*', { count: 'exact', head: true }).gte('created_at', windowStart),
      supabase.from('marketplace_listings').select('*', { count: 'exact', head: true }).gte('created_at', windowStart),
      supabase.from('members').select('*', { count: 'exact', head: true }).gte('joined_at', windowStart),
      supabase.from('members').select('id, name, role, joined_at').order('joined_at', { ascending: false }).limit(5),
      supabase.from('members').select('role'),
      supabase.from('referral_codes').select('*', { count: 'exact', head: true }),
      supabase.from('referral_codes').select('*', { count: 'exact', head: true }).not('used_by_auth_id', 'is', null),
    ]);
    const roleDist = { admin: 0, moderator: 0, builder: 0, student: 0 };
    (allMembers || []).forEach(m => { const r = m.role || 'student'; roleDist[r] = (roleDist[r] || 0) + 1; });
    setAnalyticsData({
      newPosts: newPosts || 0, newVotes: newVotes || 0, newIssues: newIssues || 0,
      newListings: newListings || 0, newMembers: newMembers || 0,
      recentMembers: recentMembers || [], roleDist,
      referralTotal: referralTotal || 0, referralUsed: referralUsed || 0,
    });
    setAnalyticsLoading(false);
  };

  const fetchMembers = async () => {
    setLoading(true);
    const { data } = await supabase.from('members').select('*').order('joined_at', { ascending: false }).limit(500);
    setMembers(data || []); setLoading(false);
  };

  const saveMember = async () => {
    if (!editMember) return;
    // Explicit payload — avoids sending joined_at or unknown columns
    const payload = {
      name: editMember.name || null,
      email: editMember.email || null,
      college_email: editMember.college_email || null,
      phone: editMember.phone || null,
      role: editMember.role || 'student',
      status: editMember.status || 'Active Member',
      sap_id: editMember.sap_id || null,
      batch: editMember.batch || null,
      course: editMember.course || null,
      certificates: editMember.certificates || [],
    };
    const { error } = await supabase.rpc('admin_update_member', {
      p_member_id: editMember.id,
      p_name: payload.name,
      p_email: payload.email,
      p_college_email: payload.college_email,
      p_phone: payload.phone,
      p_role: payload.role,
      p_status: payload.status,
      p_sap_id: payload.sap_id,
      p_batch: payload.batch,
      p_course: payload.course,
      p_certificates: payload.certificates,
    });
    if (error) { showToast('Error: ' + error.message); return; }
    setMembers(p => p.map(m => m.id === editMember.id ? { ...m, ...payload } : m));
    setEditMember(null);
    showToast('Member updated.');
  };

  const deleteMember = async (id) => {
    if (!window.confirm('Delete this member permanently? This removes their profile record. Their login credentials must be removed from Supabase Auth separately.')) return;
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) { showToast('Error deleting member: ' + error.message); return; }
    setMembers(p => p.filter(m => m.id !== id));
    showToast('Member profile deleted. Remember to revoke their auth account in Supabase dashboard.');
  };

  const addCertToMember = () => {
    if (!certInput.trim() || !editMember) return;
    const certs = [...(editMember.certificates || []), certInput.trim()];
    setEditMember({ ...editMember, certificates: certs });
    setCertInput('');
  };

  const removeCert = (idx) => {
    const certs = (editMember.certificates || []).filter((_, i) => i !== idx);
    setEditMember({ ...editMember, certificates: certs });
  };

  const fetchMktListings = async () => {
    setLoading(true);
    const { data } = await supabase.from('marketplace_listings').select('*').order('created_at', { ascending: false }).limit(200);
    setMktListings(data || []); setLoading(false);
  };

  const fetchDeals = async () => {
    setLoading(true);
    const { data } = await supabase.from('deals').select('*').order('created_at', { ascending: false }).limit(200);
    setDeals(data || []); setLoading(false);
  };

  const fetchAdminListings = async () => {
    setLoading(true);
    const { data } = await supabase.from('admin_listings').select('*').order('created_at', { ascending: false }).limit(200);
    setAdminListings(data || []); setLoading(false);
  };

  const approveMkt = async (id, val) => {
    await supabase.from('marketplace_listings').update({ approved: val }).eq('id', id);
    setMktListings(p => p.map(l => l.id === id ? { ...l, approved: val } : l));
    showToast(val === true ? 'Approved.' : val === false ? 'Rejected.' : 'Status cleared.');
  };

  const deleteMkt = async (id) => {
    await supabase.from('marketplace_listings').delete().eq('id', id);
    setMktListings(p => p.filter(l => l.id !== id));
    showToast('Listing deleted.');
  };

  const saveMktEdit = async () => {
    if (!editMktItem) return;
    const { id, created_at, user_id, ...fields } = editMktItem;
    await supabase.from('marketplace_listings').update(fields).eq('id', id);
    setMktListings(p => p.map(l => l.id === id ? editMktItem : l));
    setEditMktItem(null); showToast('Listing updated.');
  };

  const saveDeal = async () => {
    if (!dealForm.name.trim()) return;
    if (editDealId) {
      await supabase.from('deals').update(dealForm).eq('id', editDealId);
      setDeals(d => d.map(x => x.id === editDealId ? { ...x, ...dealForm } : x));
      showToast('Deal updated.');
    } else {
      const { data } = await supabase.from('deals').insert({ ...dealForm }).select().single();
      if (data) { setDeals(d => [data, ...d]); showToast('Deal added.'); }
    }
    setDealForm(DEAL_EMPTY); setEditDealId(null); setShowDealForm(false);
  };

  const deleteDeal = async (id) => {
    await supabase.from('deals').delete().eq('id', id);
    setDeals(d => d.filter(x => x.id !== id)); showToast('Deal deleted.');
  };

  const startEditDeal = (deal) => {
    setDealForm({ name: deal.name, cat: deal.cat, discount: deal.discount, desc: deal.desc || '', validity: deal.validity || '', code: deal.code || '', loc: deal.loc || '' });
    setEditDealId(deal.id); setShowDealForm(true);
  };

  const saveAdminListing = async () => {
    if (!listingForm.name.trim()) return;
    if (editListingId) {
      await supabase.from('admin_listings').update(listingForm).eq('id', editListingId);
      setAdminListings(d => d.map(x => x.id === editListingId ? { ...x, ...listingForm } : x));
      showToast('Listing updated.');
    } else {
      const { data } = await supabase.from('admin_listings').insert(listingForm).select().single();
      if (data) { setAdminListings(d => [data, ...d]); showToast('Listing added.'); }
    }
    setListingForm(LISTING_EMPTY); setEditListingId(null); setShowListingForm(false);
  };

  const deleteAdminListing = async (id) => {
    await supabase.from('admin_listings').delete().eq('id', id);
    setAdminListings(d => d.filter(x => x.id !== id)); showToast('Listing deleted.');
  };

  const startEditAdminListing = (item) => {
    setListingForm({ name: item.name, tab: item.tab, loc: item.loc || '', price: item.price || '', rating: item.rating || 4.0, tags: item.tags || '', desc: item.desc || '' });
    setEditListingId(item.id); setShowListingForm(true);
  };

  const filteredMkt = mktListings.filter(l => {
    if (mktFilter === 'pending') return l.approved === null || l.approved === undefined;
    if (mktFilter === 'approved') return l.approved === true;
    if (mktFilter === 'rejected') return l.approved === false;
    return true;
  });

  return (
    <div className="page-wrap" style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 28 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Control Room</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.95 }}>
          ADMIN_<span className="accent-error">PANEL</span>
        </h1>
        <p style={{ color: 'var(--on-surface-var)', fontSize: 13, marginTop: 10 }}>Manage content, deals, listings, and members.</p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'var(--surface-highest)', borderRadius: 14, padding: 4, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
            borderRadius: 10, border: 'none', cursor: 'pointer',
            background: tab === t.id ? 'var(--surface)' : 'transparent',
            color: tab === t.id ? 'var(--on-surface)' : 'var(--on-surface-var)',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11,
            letterSpacing: '0.06em', transition: 'all 0.14s',
            boxShadow: tab === t.id ? '0 1px 6px rgba(0,0,0,0.3)' : 'none',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Members', value: stats.members, icon: 'people', color: 'var(--secondary)' },
                { label: 'Feed Posts', value: stats.posts, icon: 'forum', color: 'var(--primary)' },
                { label: 'Marketplace', value: stats.listings, icon: 'storefront', color: 'var(--tertiary)' },
                { label: 'Pulse Issues', value: stats.issues, icon: 'how_to_vote', color: '#e3b341' },
                { label: 'Deals', value: stats.deals, icon: 'sell', color: 'var(--secondary)' },
              ].map(s => (
                <div key={s.label} className="neon-card" style={{ padding: '18px 20px', borderTop: `2px solid ${s.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
                    <div className="eyebrow">{s.label}</div>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: s.color, opacity: 0.6 }}>{s.icon}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, letterSpacing: '-0.04em', color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div className="neon-card" style={{ padding: 20 }}>
              <div className="eyebrow" style={{ marginBottom: 14 }}>Quick Actions</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { label: 'Review Listings', tab: 'marketplace', icon: 'pending_actions' },
                  { label: 'Add Deal', tab: 'deals', icon: 'sell' },
                  { label: 'Add Listing', tab: 'listings', icon: 'add_location' },
                  { label: 'Members', tab: 'members', icon: 'manage_accounts' },
                ].map(a => (
                  <button key={a.tab} onClick={() => setTab(a.tab)} className="btn-secondary" style={{ fontSize: 11 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{a.icon}</span>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'marketplace' && (
          <motion.div key="marketplace" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div className="eyebrow">Marketplace ({mktListings.length})</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[['all', 'All', mktListings.length], ['pending', 'Pending', mktListings.filter(l => l.approved === null || l.approved === undefined).length], ['approved', 'Approved', mktListings.filter(l => l.approved === true).length], ['rejected', 'Rejected', mktListings.filter(l => l.approved === false).length]].map(([id, label, count]) => (
                  <button key={id} onClick={() => setMktFilter(id)} style={{ padding: '4px 12px', borderRadius: 9999, fontSize: 10, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', background: mktFilter === id ? 'var(--surface)' : 'var(--surface-highest)', color: mktFilter === id ? 'var(--on-surface)' : 'var(--on-surface-var)' }}>{label} ({count})</button>
                ))}
              </div>
            </div>
            {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--on-surface-var)' }}>Loading…</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredMkt.map(item => {
                const sc = item.approved === true ? '#4ade80' : item.approved === false ? 'var(--error)' : '#e3b341';
                const sl = item.approved === true ? 'APPROVED' : item.approved === false ? 'REJECTED' : 'PENDING';
                return (
                  <div key={item.id} className="neon-card" style={{ padding: 18, borderLeft: `3px solid ${sc}` }}>
                    {editMktItem?.id === item.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <input className="neon-input" value={editMktItem.title || ''} onChange={e => setEditMktItem({ ...editMktItem, title: e.target.value })} placeholder="Title" style={{ width: '100%', boxSizing: 'border-box' }} />
                        <input className="neon-input" value={editMktItem.price || ''} onChange={e => setEditMktItem({ ...editMktItem, price: e.target.value })} placeholder="Price" style={{ width: '100%', boxSizing: 'border-box' }} />
                        <textarea className="neon-input" rows={2} value={editMktItem.description || ''} onChange={e => setEditMktItem({ ...editMktItem, description: e.target.value })} placeholder="Description" style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn-primary" onClick={saveMktEdit} style={{ fontSize: 11, padding: '6px 16px' }}>Save</button>
                          <button className="btn-secondary" onClick={() => setEditMktItem(null)} style={{ fontSize: 11, padding: '6px 16px' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14 }}>{item.title}</span>
                            <span className="tag-ghost" style={{ fontSize: 9 }}>{item.cat}</span>
                            <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 9999, fontFamily: 'var(--font-mono)', background: `${sc}18`, color: sc }}>{sl}</span>
                          </div>
                          <p style={{ fontSize: 12, color: 'var(--on-surface-var)', marginBottom: 4 }}>{item.description}</p>
                          <span style={{ fontSize: 11, color: 'var(--on-surface-var)', fontFamily: 'var(--font-mono)' }}>by {item.seller_name} · {item.price} · {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexShrink: 0, flexWrap: 'wrap' }}>
                          {item.approved !== true && <button onClick={() => approveMkt(item.id, true)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.08)', color: '#4ade80', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Approve</button>}
                          {item.approved !== false && <button onClick={() => approveMkt(item.id, false)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(255,110,132,0.3)', background: 'rgba(255,110,132,0.08)', color: 'var(--error)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Reject</button>}
                          <button onClick={() => setEditMktItem({ ...item })} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(204,151,255,0.3)', background: 'rgba(204,151,255,0.08)', color: 'var(--primary)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Edit</button>
                          <button onClick={() => deleteMkt(item.id)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'var(--on-surface-var)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {!loading && filteredMkt.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--on-surface-var)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.2, display: 'block', marginBottom: 12 }}>storefront</span>
                  No listings in this view.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {tab === 'deals' && (
          <motion.div key="deals" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div className="eyebrow">Deals ({deals.length})</div>
              <button className="btn-primary" onClick={() => { setDealForm(DEAL_EMPTY); setEditDealId(null); setShowDealForm(true); }} style={{ fontSize: 11, padding: '7px 16px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add</span>Add Deal
              </button>
            </div>
            {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--on-surface-var)' }}>Loading…</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 10 }}>
              {deals.map(d => (
                <div key={d.id} className="neon-card" style={{ padding: 18, borderTop: `2px solid ${CAT_COLOR[d.cat] || 'var(--primary)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-display)', fontWeight: 700, color: CAT_COLOR[d.cat] || 'var(--primary)', letterSpacing: '0.07em' }}>{(d.cat || '').toUpperCase()}</span>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, marginTop: 2 }}>{d.name}</div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--secondary)', whiteSpace: 'nowrap' }}>{d.discount}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--on-surface-var)', marginBottom: 6, lineHeight: 1.4 }}>{d.desc}</p>
                  <div style={{ fontSize: 10, color: 'var(--on-surface-var)', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>{d.loc} · {d.validity}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => startEditDeal(d)} style={{ flex: 1, padding: '5px 0', borderRadius: 8, border: '1px solid rgba(204,151,255,0.3)', background: 'rgba(204,151,255,0.08)', color: 'var(--primary)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Edit</button>
                    <button onClick={() => deleteDeal(d.id)} style={{ flex: 1, padding: '5px 0', borderRadius: 8, border: '1px solid rgba(255,110,132,0.25)', background: 'rgba(255,110,132,0.06)', color: 'var(--error)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Delete</button>
                  </div>
                </div>
              ))}
              {!loading && deals.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--on-surface-var)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.2, display: 'block', marginBottom: 12 }}>sell</span>
                  No deals yet.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {tab === 'listings' && (
          <motion.div key="listings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div className="eyebrow">Campus Listings ({adminListings.length})</div>
              <button className="btn-primary" onClick={() => { setListingForm(LISTING_EMPTY); setEditListingId(null); setShowListingForm(true); }} style={{ fontSize: 11, padding: '7px 16px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add</span>Add Listing
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {LISTING_TABS.map(t => (
                <button key={t} onClick={() => setActiveListingTab(t)} style={{ padding: '5px 14px', borderRadius: 9999, fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer', border: 'none', background: activeListingTab === t ? 'var(--primary)' : 'var(--surface-highest)', color: activeListingTab === t ? '#000' : 'var(--on-surface-var)', transition: 'all 0.14s' }}>{t}</button>
              ))}
            </div>
            {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--on-surface-var)' }}>Loading…</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 10 }}>
              {adminListings.filter(l => l.tab === activeListingTab).map(item => (
                <div key={item.id} className="neon-card" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14 }}>{item.name}</div>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 13, color: 'var(--tertiary)' }}>{item.price}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--on-surface-var)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>{item.loc}</div>
                  <p style={{ fontSize: 12, color: 'var(--on-surface-var)', lineHeight: 1.4, marginBottom: 10 }}>{item.desc}</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => startEditAdminListing(item)} style={{ flex: 1, padding: '5px 0', borderRadius: 8, border: '1px solid rgba(204,151,255,0.3)', background: 'rgba(204,151,255,0.08)', color: 'var(--primary)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Edit</button>
                    <button onClick={() => deleteAdminListing(item.id)} style={{ flex: 1, padding: '5px 0', borderRadius: 8, border: '1px solid rgba(255,110,132,0.25)', background: 'rgba(255,110,132,0.06)', color: 'var(--error)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Delete</button>
                  </div>
                </div>
              ))}
              {!loading && adminListings.filter(l => l.tab === activeListingTab).length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--on-surface-var)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.2, display: 'block', marginBottom: 12 }}>location_city</span>
                  No listings in this category yet.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {tab === 'members' && (
          <motion.div key="members" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--on-surface-var)' }}>search</span>
                <input className="neon-input" placeholder="Search by name, email, or code…" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} style={{ paddingLeft: 38, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['all', 'student', 'builder', 'moderator', 'admin'].map(r => (
                  <button key={r} onClick={() => setMemberRoleFilter(r)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.06em', background: memberRoleFilter === r ? 'var(--surface)' : 'transparent', color: memberRoleFilter === r ? 'var(--on-surface)' : 'var(--on-surface-var)', boxShadow: memberRoleFilter === r ? '0 1px 6px rgba(0,0,0,0.3)' : 'none', transition: 'all 0.14s' }}>
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--on-surface-var)' }}>Loading…</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members
                .filter(m => memberRoleFilter === 'all' || m.role === memberRoleFilter)
                .filter(m => !memberSearch || [m.name, m.email, m.id].some(v => (v || '').toLowerCase().includes(memberSearch.toLowerCase())))
                .map(m => (
                  <div key={m.id} className="neon-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: 'rgba(204,151,255,0.1)', border: '1.5px solid rgba(204,151,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--primary)' }}>{(m.name || 'U')[0].toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{m.name}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--secondary)', letterSpacing: '0.06em' }}>{m.id}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--on-surface-var)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{m.email}</div>
                      {(m.course || m.batch) && <div style={{ fontSize: 11, color: 'var(--on-surface-var)', marginTop: 2 }}>{[m.course, m.batch].filter(Boolean).join(' · ')}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <RoleBadge role={m.role || 'student'} />
                      <button onClick={() => { setEditMember({ ...m }); setCertInput(''); }} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', color: 'var(--on-surface-var)', fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700 }}>Edit</button>
                      <button onClick={() => deleteMember(m.id)} style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,110,132,0.08)', border: '1px solid rgba(255,110,132,0.2)', cursor: 'pointer', color: 'var(--error)', display: 'flex', alignItems: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              {!loading && members.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--on-surface-var)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.2, display: 'block', marginBottom: 12 }}>people</span>
                  No members found.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── REFERRALS TAB ── */}
      <AnimatePresence>
        {tab === 'referrals' && (
          <motion.div key="referrals" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 4 }}>
                  Referral <span style={{ color: 'var(--primary)' }}>Codes</span>
                </h2>
                <p style={{ fontSize: 12, color: 'var(--on-surface-var)' }}>Each code is single-use. Track who invited whom.</p>
              </div>
              <button onClick={() => setShowRefForm(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span> Create Code
              </button>
            </div>

            {/* Create form */}
            <AnimatePresence>
              {showRefForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{ background: 'var(--surface)', border: '1px solid rgba(204,151,255,0.2)', borderRadius: 12, padding: 20, marginBottom: 20, overflow: 'hidden' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, marginBottom: 14, color: 'var(--primary)' }}>New Referral Code</div>

                  {/* Member picker */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--on-surface-var)', letterSpacing: '0.06em', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Select Existing Member (optional)</label>
                    <select
                      className="neon-input"
                      style={{ width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}
                      value={refForm._memberId || ''}
                      onChange={e => {
                        const picked = refMembersList.find(m => m.id === e.target.value);
                        if (picked) {
                          setRefForm(p => ({ ...p, _memberId: picked.id, assigned_to_name: picked.name, assigned_to_email: picked.email }));
                        } else {
                          setRefForm(p => ({ ...p, _memberId: '', assigned_to_name: '', assigned_to_email: '' }));
                        }
                      }}
                    >
                      <option value=''>— Pick a member or fill manually below —</option>
                      {refMembersList.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.id}) · {m.email}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--on-surface-var)', letterSpacing: '0.06em', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Assigned To (Name)</label>
                      <input className="neon-input" value={refForm.assigned_to_name} onChange={e => setRefForm(p => ({ ...p, _memberId: '', assigned_to_name: e.target.value }))} placeholder="Student's name" style={{ width: '100%', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--on-surface-var)', letterSpacing: '0.06em', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Assigned To (Email)</label>
                      <input className="neon-input" type="email" value={refForm.assigned_to_email} onChange={e => setRefForm(p => ({ ...p, _memberId: '', assigned_to_email: e.target.value }))} placeholder="student@example.com" style={{ width: '100%', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--on-surface-var)', marginBottom: 14, lineHeight: 1.5 }}>A random code will be generated. Share it with the invitee — it expires on use.</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={createReferral} className="btn-primary" style={{ fontSize: 13 }}>Generate &amp; Save</button>
                    <button onClick={() => { setShowRefForm(false); setRefForm({ assigned_to_name: '', assigned_to_email: '' }); }} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'var(--on-surface-var)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-display)' }}>Cancel</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total Codes', val: referrals.length, color: 'var(--primary)' },
                { label: 'Used', val: referrals.filter(r => r.used_by_auth_id).length, color: 'var(--secondary)' },
                { label: 'Available', val: referrals.filter(r => !r.used_by_auth_id).length, color: 'var(--tertiary)' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '16px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 900, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--on-surface-var)', fontWeight: 600, letterSpacing: '0.06em' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Referral list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {refLoading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--on-surface-var)' }}>Loading…</div>}
              {!refLoading && referrals.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--on-surface-var)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.2, display: 'block', marginBottom: 12 }}>card_giftcard</span>
                  No referral codes yet. Create one to invite someone.
                </div>
              )}
              {referrals.map(r => {
                const used = !!r.used_by_auth_id;
                return (
                  <div key={r.id} style={{
                    background: 'var(--surface)', border: `1px solid ${used ? 'rgba(83,221,252,0.12)' : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: 12, padding: '14px 16px',
                    display: 'flex', gap: 14, alignItems: 'flex-start',
                  }}>
                    {/* Code block */}
                    <div style={{
                      flexShrink: 0,
                      background: used ? 'rgba(83,221,252,0.06)' : 'rgba(204,151,255,0.06)',
                      border: `1px solid ${used ? 'rgba(83,221,252,0.2)' : 'rgba(204,151,255,0.2)'}`,
                      borderRadius: 8, padding: '8px 14px', textAlign: 'center', minWidth: 110,
                    }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 800, letterSpacing: '0.12em', color: used ? 'var(--secondary)' : 'var(--primary)' }}>{r.code}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: used ? 'var(--secondary)' : 'var(--on-surface-var)', textTransform: 'uppercase', marginTop: 3 }}>
                        {used ? '● Used' : '○ Available'}
                      </div>
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Assigned to */}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--on-surface-var)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>For:</span>
                        <span style={{ fontSize: 12, color: 'var(--on-surface)', fontWeight: 600 }}>
                          {r.assigned_to_name || <em style={{ opacity: 0.5 }}>Unassigned</em>}
                        </span>
                        {r.assigned_to_email && <span style={{ fontSize: 11, color: 'var(--on-surface-var)', fontFamily: 'var(--font-mono)' }}>{r.assigned_to_email}</span>}
                      </div>

                      {/* Thread: used-by info */}
                      {used && (
                        <div style={{
                          marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.04)',
                          display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center',
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'var(--secondary)', flexShrink: 0 }}>check_circle</span>
                          <span style={{ fontSize: 11, color: 'var(--secondary)', fontWeight: 700 }}>Redeemed by:</span>
                          <span style={{ fontSize: 11, color: 'var(--on-surface)' }}>{r.used_by_name}</span>
                          {r.used_by_email && <span style={{ fontSize: 11, color: 'var(--on-surface-var)', fontFamily: 'var(--font-mono)' }}>{r.used_by_email}</span>}
                          {r.member_code && (
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 11,
                              background: 'rgba(83,221,252,0.08)', border: '1px solid rgba(83,221,252,0.2)',
                              borderRadius: 5, padding: '1px 7px', color: 'var(--secondary)',
                            }}>{r.member_code}</span>
                          )}
                          {r.used_at && <span style={{ fontSize: 10, color: 'var(--on-surface-var)' }}>· {new Date(r.used_at).toLocaleDateString()}</span>}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'flex-start' }}>
                      {!used && (
                        <button onClick={() => copyToClipboard(r.code)} title="Copy code"
                          style={{ padding: '6px 8px', background: 'rgba(204,151,255,0.06)', border: '1px solid rgba(204,151,255,0.15)', borderRadius: 7, cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>content_copy</span>
                        </button>
                      )}
                      <button onClick={() => deleteReferral(r.id, used)} title={used ? 'Cannot delete used code' : 'Delete'}
                        style={{ padding: '6px 8px', background: used ? 'transparent' : 'rgba(255,110,132,0.06)', border: `1px solid ${used ? 'rgba(255,255,255,0.04)' : 'rgba(255,110,132,0.18)'}`, borderRadius: 7, cursor: used ? 'not-allowed' : 'pointer', color: used ? 'rgba(255,110,132,0.25)' : 'var(--error)', display: 'flex', alignItems: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ANALYTICS TAB ── */}
      <AnimatePresence>
        {tab === 'analytics' && (
          <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Header + time window selector */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 4 }}>
                  Platform <span style={{ color: 'var(--primary)' }}>Analytics</span>
                </h2>
                <p style={{ fontSize: 12, color: 'var(--on-surface-var)' }}>Real-time activity and platform health.</p>
              </div>
              <div style={{ display: 'flex', gap: 4, background: 'var(--surface-highest)', borderRadius: 10, padding: 3, flexShrink: 0 }}>
                {[['1h', '1 HR'], ['24h', '24 HR'], ['7d', '7 DAYS'], ['30d', '30 DAYS']].map(([id, label]) => (
                  <button key={id} onClick={() => setAnalyticsWindow(id)} style={{
                    padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.06em',
                    background: analyticsWindow === id ? 'var(--primary)' : 'transparent',
                    color: analyticsWindow === id ? '#000' : 'var(--on-surface-var)',
                    transition: 'all 0.14s',
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {analyticsLoading && (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--on-surface-var)' }}>Loading analytics…</div>
            )}

            {!analyticsLoading && analyticsData && (
              <>
                {/* Online Users */}
                <div className="neon-card" style={{ padding: 20, marginBottom: 16, borderTop: '2px solid var(--secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div className="eyebrow">Currently Online</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--secondary)', display: 'inline-block', boxShadow: '0 0 8px var(--secondary)', animation: 'pulse 2s infinite' }} />
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: 'var(--secondary)' }}>{onlineUsers.length}</span>
                    </div>
                  </div>
                  {onlineUsers.length > 0 ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {onlineUsers.map((u, i) => {
                        const rm = ROLE_META[u.role] || ROLE_META.student;
                        return (
                          <div key={u.user_id || i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', background: 'var(--surface-highest)', borderRadius: 8, border: `1px solid ${rm.border}` }}>
                            <div style={{ width: 26, height: 26, borderRadius: 7, background: rm.bg, border: `1px solid ${rm.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11, color: rm.color, flexShrink: 0 }}>
                              {(u.name || '?')[0].toUpperCase()}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{u.name || 'Unknown'}</span>
                            <RoleBadge role={u.role || 'student'} />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--on-surface-var)', opacity: 0.6 }}>No users online right now — presence updates live.</div>
                  )}
                </div>

                {/* Activity stat cards */}
                <div className="eyebrow" style={{ marginBottom: 10 }}>
                  Activity — last {analyticsWindow === '1h' ? '1 hour' : analyticsWindow === '24h' ? '24 hours' : analyticsWindow === '7d' ? '7 days' : '30 days'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 155px), 1fr))', gap: 12, marginBottom: 24 }}>
                  {[
                    { label: 'New Posts', value: analyticsData.newPosts, icon: 'forum', color: 'var(--primary)' },
                    { label: 'New Votes', value: analyticsData.newVotes, icon: 'thumb_up', color: 'var(--secondary)' },
                    { label: 'New Issues', value: analyticsData.newIssues, icon: 'how_to_vote', color: '#e3b341' },
                    { label: 'New Listings', value: analyticsData.newListings, icon: 'storefront', color: 'var(--tertiary)' },
                    { label: 'New Members', value: analyticsData.newMembers, icon: 'person_add', color: '#a3e635' },
                  ].map(s => (
                    <div key={s.label} className="neon-card" style={{ padding: '16px 18px', borderTop: `2px solid ${s.color}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                        <div className="eyebrow" style={{ fontSize: 9 }}>{s.label}</div>
                        <span className="material-symbols-outlined" style={{ fontSize: 15, color: s.color, opacity: 0.55 }}>{s.icon}</span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, letterSpacing: '-0.04em', color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Bottom: Role Distribution + Recent Members + Referral Funnel */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 16 }}>

                  {/* Role distribution bar chart */}
                  <div className="neon-card" style={{ padding: 20 }}>
                    <div className="eyebrow" style={{ marginBottom: 14 }}>Member Roles</div>
                    {Object.entries(analyticsData.roleDist).sort((a, b) => b[1] - a[1]).map(([role, count]) => {
                      const rm = ROLE_META[role] || ROLE_META.student;
                      const total = Object.values(analyticsData.roleDist).reduce((a, b) => a + b, 0);
                      const pct = total > 0 ? (count / total) * 100 : 0;
                      return (
                        <div key={role} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, color: rm.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{role}</span>
                            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--on-surface-var)' }}>{count}</span>
                          </div>
                          <div style={{ height: 6, background: 'var(--surface-highest)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: rm.color, borderRadius: 3, transition: 'width 0.5s' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Recent members */}
                  <div className="neon-card" style={{ padding: 20 }}>
                    <div className="eyebrow" style={{ marginBottom: 14 }}>Recent Members</div>
                    {analyticsData.recentMembers.length === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--on-surface-var)' }}>No members yet.</div>
                    )}
                    {analyticsData.recentMembers.map(m => (
                      <div key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(204,151,255,0.1)', border: '1.5px solid rgba(204,151,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--primary)', flexShrink: 0 }}>
                          {(m.name || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name || 'Unknown'}</div>
                          <div style={{ fontSize: 10, color: 'var(--on-surface-var)', marginTop: 1 }}>{m.joined_at ? new Date(m.joined_at).toLocaleDateString() : '—'}</div>
                        </div>
                        <RoleBadge role={m.role || 'student'} />
                      </div>
                    ))}
                  </div>

                  {/* Referral funnel */}
                  <div className="neon-card" style={{ padding: 20 }}>
                    <div className="eyebrow" style={{ marginBottom: 14 }}>Referral Funnel</div>
                    {[
                      { label: 'Codes Issued', value: analyticsData.referralTotal, color: 'var(--primary)' },
                      { label: 'Redeemed', value: analyticsData.referralUsed, color: 'var(--secondary)' },
                      { label: 'Still Available', value: analyticsData.referralTotal - analyticsData.referralUsed, color: 'var(--on-surface-var)' },
                    ].map(s => (
                      <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <span style={{ fontSize: 12, color: 'var(--on-surface-var)' }}>{s.label}</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: s.color }}>{s.value}</span>
                      </div>
                    ))}
                    <div style={{ height: 8, background: 'var(--surface-highest)', borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
                      <div style={{
                        height: '100%',
                        width: `${analyticsData.referralTotal > 0 ? (analyticsData.referralUsed / analyticsData.referralTotal) * 100 : 0}%`,
                        background: 'linear-gradient(90deg, var(--secondary), var(--primary))',
                        borderRadius: 4, transition: 'width 0.5s',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 10, color: 'var(--on-surface-var)' }}>
                      <span>Conversion rate</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--secondary)' }}>
                        {analyticsData.referralTotal > 0 ? Math.round((analyticsData.referralUsed / analyticsData.referralTotal) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HOSTEL MANAGEMENT SYSTEM TAB ── */}
      <AnimatePresence>
        {tab === 'hms' && (
          <motion.div key="hms" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <HostelManagementSystem />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit Member Modal ── */}
      <AnimatePresence>
        {editMember && (
          <div className="modal-overlay" onClick={() => setEditMember(null)}>
            <motion.div className="modal-box" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} onClick={e => e.stopPropagation()} style={{ maxWidth: 500, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexShrink: 0 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em' }}>Edit <span style={{ color: 'var(--primary)' }}>Member</span></h2>
                <button onClick={() => setEditMember(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-var)' }}><span className="material-symbols-outlined">close</span></button>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>
                <div style={{ marginBottom: 10, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--secondary)' }}>{editMember.id}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>

                  {/* ── Identity ── */}
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--on-surface-var)', textTransform: 'uppercase', opacity: 0.55, paddingTop: 2 }}>Identity</div>
                  <input className="neon-input" placeholder="Full Name" value={editMember.name || ''} onChange={e => setEditMember({ ...editMember, name: e.target.value })} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <select className="neon-select" value={editMember.role || 'student'} onChange={e => setEditMember({ ...editMember, role: e.target.value })}>
                      {['student', 'builder', 'moderator', 'admin'].map(r => <option key={r}>{r}</option>)}
                    </select>
                    <select className="neon-select" value={editMember.status || 'Active Member'} onChange={e => setEditMember({ ...editMember, status: e.target.value })}>
                      {['Active Member', 'Inactive', 'Suspended', 'Alumni'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* ── Contact ── */}
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--on-surface-var)', textTransform: 'uppercase', opacity: 0.55, marginTop: 4 }}>Contact</div>
                  <input className="neon-input" type="email" placeholder="Personal Email" value={editMember.email || ''} onChange={e => setEditMember({ ...editMember, email: e.target.value })} />
                  <input className="neon-input" type="email" placeholder="College Email (e.g. name@college.edu)" value={editMember.college_email || ''} onChange={e => setEditMember({ ...editMember, college_email: e.target.value })} />
                  <input className="neon-input" type="tel" placeholder="Contact Number" value={editMember.phone || ''} onChange={e => setEditMember({ ...editMember, phone: e.target.value })} />

                  {/* ── Academic ── */}
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--on-surface-var)', textTransform: 'uppercase', opacity: 0.55, marginTop: 4 }}>Academic</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input className="neon-input" placeholder="SAP ID" value={editMember.sap_id || ''} onChange={e => setEditMember({ ...editMember, sap_id: e.target.value })} />
                    <input className="neon-input" placeholder="Batch (e.g. 2024)" value={editMember.batch || ''} onChange={e => setEditMember({ ...editMember, batch: e.target.value })} />
                  </div>
                  <input className="neon-input" placeholder="Course (e.g. B.Tech CSE)" value={editMember.course || ''} onChange={e => setEditMember({ ...editMember, course: e.target.value })} />
                </div>
                {/* Certificates */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--on-surface-var)', marginBottom: 8, textTransform: 'uppercase' }}>Certificates</div>
                  {(editMember.certificates || []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {(editMember.certificates || []).map((cert, i) => {
                        const name = typeof cert === 'string' ? cert : cert.name || 'Certificate';
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(204,151,255,0.1)', border: '1px solid rgba(204,151,255,0.25)', borderRadius: 6, fontSize: 12, color: 'var(--primary)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                            {name}
                            <button onClick={() => removeCert(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: 0, lineHeight: 1, marginLeft: 2 }}>×</button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="neon-input" placeholder="Award certificate name…" value={certInput} onChange={e => setCertInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCertToMember()} style={{ flex: 1 }} />
                    <button onClick={addCertToMember} className="btn-secondary" style={{ padding: '8px 14px', fontSize: 12 }}>Add</button>
                  </div>
                </div>
              </div>{/* end scrollable area */}
              <div style={{ display: 'flex', gap: 10, flexShrink: 0, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button className="btn-primary" onClick={saveMember} style={{ flex: 1, justifyContent: 'center' }}>Save Changes</button>
                <button className="btn-secondary" onClick={() => setEditMember(null)} style={{ padding: '12px 20px' }}>Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDealForm && (
          <div className="modal-overlay" onClick={() => setShowDealForm(false)}>
            <motion.div className="modal-box" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 6 }}>{editDealId ? 'Edit' : 'New'} <span className="accent-secondary">Deal</span></h2>
              <p style={{ color: 'var(--on-surface-var)', fontSize: 13, marginBottom: 20 }}>Appears on the Deals page for all students.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                <input className="neon-input" placeholder="Business / Offer Name *" value={dealForm.name} onChange={e => setDealForm({ ...dealForm, name: e.target.value })} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <select className="neon-select" value={dealForm.cat} onChange={e => setDealForm({ ...dealForm, cat: e.target.value })}>{DEAL_CATS.map(c => <option key={c}>{c}</option>)}</select>
                  <input className="neon-input" placeholder="Discount (e.g. 30% OFF)" value={dealForm.discount} onChange={e => setDealForm({ ...dealForm, discount: e.target.value })} />
                </div>
                <textarea className="neon-input" rows={3} placeholder="Description" value={dealForm.desc} onChange={e => setDealForm({ ...dealForm, desc: e.target.value })} style={{ resize: 'vertical' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input className="neon-input" placeholder="Validity (e.g. Ongoing)" value={dealForm.validity} onChange={e => setDealForm({ ...dealForm, validity: e.target.value })} />
                  <input className="neon-input" placeholder="Promo Code" value={dealForm.code} onChange={e => setDealForm({ ...dealForm, code: e.target.value })} />
                </div>
                <input className="neon-input" placeholder="Location" value={dealForm.loc} onChange={e => setDealForm({ ...dealForm, loc: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-primary" onClick={saveDeal} style={{ flex: 1, justifyContent: 'center' }}>{editDealId ? 'Save Changes' : 'Add Deal'}</button>
                <button className="btn-secondary" onClick={() => setShowDealForm(false)} style={{ padding: '12px 20px' }}>Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showListingForm && (
          <div className="modal-overlay" onClick={() => setShowListingForm(false)}>
            <motion.div className="modal-box" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 6 }}>{editListingId ? 'Edit' : 'New'} <span className="accent-primary">Listing</span></h2>
              <p style={{ color: 'var(--on-surface-var)', fontSize: 13, marginBottom: 20 }}>Appears on the Listings page.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                <input className="neon-input" placeholder="Name *" value={listingForm.name} onChange={e => setListingForm({ ...listingForm, name: e.target.value })} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <select className="neon-select" value={listingForm.tab} onChange={e => setListingForm({ ...listingForm, tab: e.target.value })}>{LISTING_TABS.map(t => <option key={t}>{t}</option>)}</select>
                  <input className="neon-input" placeholder="Location" value={listingForm.loc} onChange={e => setListingForm({ ...listingForm, loc: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input className="neon-input" placeholder="Price" value={listingForm.price} onChange={e => setListingForm({ ...listingForm, price: e.target.value })} />
                  <input className="neon-input" type="number" step="0.1" min="0" max="5" placeholder="Rating (0–5)" value={listingForm.rating} onChange={e => setListingForm({ ...listingForm, rating: parseFloat(e.target.value) || 4 })} />
                </div>
                <input className="neon-input" placeholder="Tags (comma-separated)" value={listingForm.tags} onChange={e => setListingForm({ ...listingForm, tags: e.target.value })} />
                <textarea className="neon-input" rows={3} placeholder="Description" value={listingForm.desc} onChange={e => setListingForm({ ...listingForm, desc: e.target.value })} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-primary" onClick={saveAdminListing} style={{ flex: 1, justifyContent: 'center' }}>{editListingId ? 'Save Changes' : 'Add Listing'}</button>
                <button className="btn-secondary" onClick={() => setShowListingForm(false)} style={{ padding: '12px 20px' }}>Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div key="toast" initial={{ opacity: 0, y: 20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 20, x: '-50%' }}
            style={{ position: 'fixed', bottom: 32, left: '50%', background: 'var(--surface)', border: '1px solid rgba(83,221,252,0.3)', borderRadius: 12, padding: '12px 22px', zIndex: 9999, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--secondary)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
