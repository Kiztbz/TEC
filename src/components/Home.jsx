import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import AdBanner from './AdBanner';

const FEED = [];

const BAZAAR_HOT = [
  { name: "GATE CSE 2024 Full Set", credits: "₹1,200" },
  { name: "Arduino Starter Kit", credits: "₹1,800" },
  { name: "Casio FX-991EX Calculator", credits: "₹800" },
];

const LIVE_LOGS = [
  { type: "CONN", msg: "3 new members joined TEC today" },
  { type: "TX", msg: "New listing posted on Bazaar" },
  { type: "INFO", msg: "Events board updated with 2 entries" },
  { type: "CONN", msg: "Campus map refreshed" },
];

const TRENDING_NODES = ["#placement", "#hackathon", "#hostels", "#assignments", "#cafeteria", "#Campus2025", "#internship", "#exam-prep"];

const LOG_COLORS = { CONN: '#53DDFC', TX: '#3fb950', ERR: '#FF6E84', INFO: '#CC97FF' };

const FALLBACK_PROMO = [
  { type: 'deal', data: { name: 'Campus Café', cat: 'Food', discount: '15% OFF', desc: 'Show your TEC student ID for a discount on all beverages and snacks at the Block-A canteen.' } },
  { type: 'listing', data: { name: 'TEC Housing Board', tab: 'Stay', price: 'From ₹4,500/mo', loc: 'On-campus accommodation options available' } },
  { type: 'deal', data: { name: 'PrintZone', cat: 'Study', discount: '₹2/page', desc: 'Discounted printing rates exclusively for TEC members at the library ground floor.' } },
];

export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [votes, setVotes] = useState({});
  const [voted, setVoted] = useState({});
  const [postText, setPostText] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);
  const [postError, setPostError] = useState('');
  const [xpPopups, setXpPopups] = useState({});
  const [totalXp, setTotalXp] = useState(0);
  const [promoCards, setPromoCards] = useState([]);
  const [realtimeStatus, setRealtimeStatus] = useState('connecting'); // connecting | live | error
  const [isAnon, setIsAnon] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState(new Set());
  const [repliesData, setRepliesData] = useState({});
  const [replyText, setReplyText] = useState({});
  const [replyAnon, setReplyAnon] = useState({});
  const [submittingReply, setSubmittingReply] = useState({});

  useEffect(() => {
    Promise.all([
      supabase.from('deals').select('name,cat,discount,desc,loc').limit(4),
      supabase.from('admin_listings').select('name,tab,price,loc').limit(3),
      supabase.from('pulse_issues').select('title,vote_count').order('vote_count', { ascending: false }).limit(1),
    ]).then(([deals, listings, issues]) => {
      const cards = [];
      (deals.data || []).forEach(d => cards.push({ type: 'deal', data: d }));
      (listings.data || []).forEach(l => cards.push({ type: 'listing', data: l }));
      if (issues.data?.[0]) cards.push({ type: 'issue', data: issues.data[0] });
      setPromoCards(cards.length > 0 ? cards : FALLBACK_PROMO);
    });
  }, []);

  useEffect(() => {
    // ── Initial load ──
    const normalizePost = p => ({
      ...p,
      user: p.is_anonymous ? 'Anonymous' : (p.user_name || 'Anonymous'),
      real_name: p.user_name,
      time: p.created_at ? new Date(p.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
      badge: p.is_anonymous ? null : ((p.user_role && p.user_role !== 'student') ? p.user_role : null),
      missionColor: p.is_anonymous ? '#53DDFC' : (p.user_role === 'builder' ? '#CC97FF' : p.user_role === 'admin' ? '#FF6E84' : '#53DDFC'),
      missionType: 'PULSE',
      xpReward: null, kernel: null, code: null, replyCount: p.reply_count ?? 0,
    });
    supabase.from('feed_posts').select('*').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => {
        const loaded = (data || []).map(normalizePost);
        setPosts(loaded);
        setVotes(loaded.reduce((acc, p) => ({ ...acc, [p.id]: p.vote_count ?? 0 }), {}));
        setLoadingPosts(false);
      });

    // ── Real-time WebSocket channel ──
    const channel = supabase
      .channel('feed_realtime')
      // New post inserted by anyone
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_posts' }, ({ new: row }) => {
        const normalized = normalizePost(row);
        setPosts(prev => {
          if (prev.some(p => p.id === row.id)) return prev;
          return [normalized, ...prev];
        });
        setVotes(v => ({ ...v, [row.id]: row.vote_count ?? 0 }));
      })
      // Vote / reply count updated by trigger
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'feed_posts' }, ({ new: row }) => {
        setVotes(v => ({ ...v, [row.id]: row.vote_count ?? 0 }));
        setPosts(prev => prev.map(p => p.id === row.id ? { ...p, replyCount: row.reply_count ?? p.replyCount } : p));
      })
      // Post deleted
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'feed_posts' }, ({ old: row }) => {
        setPosts(prev => prev.filter(p => p.id !== row.id));
        setVotes(v => { const next = { ...v }; delete next[row.id]; return next; });
      })
      // New reply — update count + append if thread is open
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_replies' }, ({ new: row }) => {
        setPosts(prev => prev.map(p => p.id === row.post_id ? { ...p, replyCount: (p.replyCount || 0) + 1 } : p));
        setRepliesData(prev => {
          if (prev[row.post_id] === undefined) return prev;
          if (prev[row.post_id].some(r => r.id === row.id)) return prev;
          const nr = {
            ...row,
            user: row.is_anonymous ? 'Anonymous' : (row.user_name || 'Anonymous'),
            real_name: row.user_name,
            time: new Date(row.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          };
          return { ...prev, [row.post_id]: [...prev[row.post_id], nr] };
        });
      })
      // Reply deleted
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'post_replies' }, ({ old: row }) => {
        setPosts(prev => prev.map(p => p.id === row.post_id ? { ...p, replyCount: Math.max((p.replyCount || 1) - 1, 0) } : p));
        setRepliesData(prev => {
          if (!prev[row.post_id]) return prev;
          return { ...prev, [row.post_id]: prev[row.post_id].filter(r => r.id !== row.id) };
        });
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('live');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRealtimeStatus('error');
        else setRealtimeStatus('connecting');
      });

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Load which posts the current user has already voted on
  useEffect(() => {
    if (!user?.id) return;
    supabase.from('post_votes').select('post_id').eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setVoted(data.reduce((acc, v) => ({ ...acc, [v.post_id]: true }), {}));
      });
  }, [user?.id]);

  const handleRelay = async () => {
    if (!postText.trim() || !user) return;
    setSubmittingPost(true);
    setPostError('');
    const { data, error } = await supabase.from('feed_posts').insert({
      user_id: user.id,
      member_id: user.memberCode || null,
      user_name: user.name,
      user_role: user.role || 'student',
      body: postText.trim(),
      is_anonymous: isAnon,
    }).select().single();
    if (!error && data) {
      const normalized = {
        ...data,
        user: isAnon ? 'Anonymous' : (data.user_name || user.name),
        real_name: data.user_name,
        time: 'Just now',
        badge: isAnon ? null : ((user.role && user.role !== 'student') ? user.role : null),
        missionColor: isAnon ? '#53DDFC' : (user.role === 'builder' ? '#CC97FF' : user.role === 'admin' ? '#FF6E84' : '#53DDFC'),
        missionType: 'PULSE',
        xpReward: null, kernel: null, code: null, replyCount: 0,
      };
      setPosts(p => [normalized, ...p]);
      setVotes(v => ({ ...v, [data.id]: 0 }));
      setPostText('');
      setIsAnon(false);
    } else {
      setPostError(error?.message || 'Failed to post. Please try again.');
    }
    setSubmittingPost(false);
  };

  const handleVote = async (id) => {
    if (!user) return;
    if (voted[id]) {
      // Toggle off — optimistic unvote
      setVoted(v => ({ ...v, [id]: false }));
      setVotes(v => ({ ...v, [id]: Math.max((v[id] || 1) - 1, 0) }));
      await supabase.from('post_votes').delete().match({ post_id: id, user_id: user.id });
    } else {
      // Toggle on — optimistic upvote
      setVoted(v => ({ ...v, [id]: true }));
      setVotes(v => ({ ...v, [id]: (v[id] || 0) + 1 }));
      const { error } = await supabase.from('post_votes').insert({ post_id: id, user_id: user.id });
      if (error) {
        // Revert if DB rejected (e.g. already voted from another session)
        setVoted(v => ({ ...v, [id]: false }));
        setVotes(v => ({ ...v, [id]: Math.max((v[id] || 1) - 1, 0) }));
      }
    }
  };

  const toggleReplies = async (postId) => {
    const isOpen = expandedReplies.has(postId);
    setExpandedReplies(prev => {
      const next = new Set(prev);
      isOpen ? next.delete(postId) : next.add(postId);
      return next;
    });
    if (!isOpen && repliesData[postId] === undefined) {
      const { data } = await supabase.from('post_replies')
        .select('*').eq('post_id', postId).order('created_at', { ascending: true });
      if (data) {
        setRepliesData(prev => ({
          ...prev,
          [postId]: data.map(r => ({
            ...r,
            user: r.is_anonymous ? 'Anonymous' : (r.user_name || 'Anonymous'),
            real_name: r.user_name,
            time: r.created_at ? new Date(r.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
          })),
        }));
      }
    }
  };

  const handleSubmitReply = async (postId) => {
    const text = (replyText[postId] || '').trim();
    if (!text || !user) return;
    const anon = replyAnon[postId] || false;
    setSubmittingReply(prev => ({ ...prev, [postId]: true }));
    const { data, error } = await supabase.from('post_replies').insert({
      post_id: postId,
      user_id: user.id,
      member_id: user.memberCode || null,
      user_name: user.name,
      user_role: user.role || 'student',
      is_anonymous: anon,
      body: text,
    }).select().single();
    if (!error && data) {
      const normalized = {
        ...data,
        user: anon ? 'Anonymous' : (data.user_name || user.name),
        real_name: data.user_name,
        time: 'Just now',
      };
      setRepliesData(prev => ({ ...prev, [postId]: [...(prev[postId] || []), normalized] }));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, replyCount: (p.replyCount || 0) + 1 } : p));
      setReplyText(prev => ({ ...prev, [postId]: '' }));
    }
    setSubmittingReply(prev => ({ ...prev, [postId]: false }));
  };

  return (
    <div className="page-wrap" style={{ maxWidth: 1280 }}>
      <div className="two-col">

        {/* ── LEFT: FEED ── */}
        <div>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--on-surface)', margin: 0 }}>
                Echo <span className="accent-primary">Feed</span>
              </h2>
              <span
                className={realtimeStatus === 'live' ? 'tag-error' : 'tag-secondary'}
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                title={realtimeStatus === 'live' ? 'Real-time connected' : realtimeStatus === 'error' ? 'Connection error' : 'Connecting...'}
              >
                <span className="live-dot" style={realtimeStatus === 'error' ? { background: '#e3b341' } : realtimeStatus === 'connecting' ? { background: 'var(--on-surface-var)' } : {}} />
                {realtimeStatus === 'live' ? 'LIVE' : realtimeStatus === 'error' ? 'OFFLINE' : 'SYNC'}
              </span>
            </div>
            {totalXp > 0 && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800, color: '#e3b341', letterSpacing: '0.06em', background: 'rgba(227,179,65,0.08)', border: '1px solid rgba(227,179,65,0.2)', borderRadius: 5, padding: '2px 8px' }}>
                +{totalXp} XP
              </div>
            )}
          </div>

          {/* Post composer */}
          <div className="neon-card" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(204,151,255,0.08)', border: '1px solid rgba(204,151,255,0.18)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--on-surface-var)', opacity: 0.5 }}>person</span>
              </div>
              <textarea value={postText} onChange={e => { setPostText(e.target.value); if (postError) setPostError(''); }}
                className="neon-input" rows={3} placeholder={user ? "What's on your mind?" : 'Sign in to post...'}
                style={{ resize: 'none', borderRadius: 8, fontSize: 13, flex: 1 }}
                maxLength={1000} disabled={!user} />
            </div>
            {postError && (
              <div style={{ color: '#FF6E84', fontSize: 12, marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>error</span>
                {postError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: postText.length > 900 ? '#e3b341' : 'var(--on-surface-var)', opacity: 0.6, transition: 'color 0.2s' }}>
                  {postText.length}/1000
                </span>
                {user && (
                  <button onClick={() => setIsAnon(a => !a)}
                    title={isAnon ? 'Posting anonymously — identity hidden from others, visible to admins' : 'Post as yourself'}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: isAnon ? 'rgba(204,151,255,0.1)' : 'transparent', border: isAnon ? '1px solid rgba(204,151,255,0.35)' : '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', color: isAnon ? 'var(--primary)' : 'var(--on-surface-var)', fontSize: 11, fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{isAnon ? 'visibility_off' : 'visibility'}</span>
                    {isAnon ? 'Anon' : 'Public'}
                  </button>
                )}
              </div>
              <button className="btn-ghost-cyan" onClick={handleRelay}
                disabled={submittingPost || !postText.trim() || !user}
                style={{ fontSize: 11, padding: '5px 16px', letterSpacing: '0.07em', opacity: (submittingPost || !postText.trim() || !user) ? 0.35 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>send</span>
                {submittingPost ? 'POSTING...' : 'POST'}
              </button>
            </div>
          </div>

          {/* Posts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {!loadingPosts && posts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--on-surface-var)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.25, display: 'block', marginBottom: 12 }}>chat_bubble</span>
                No posts yet. Be the first to relay a pulse.
              </div>
            )}
            {posts.map((post, idx) => (
              <React.Fragment key={post.id}>
                <motion.article className="neon-card" style={{
                  padding: '12px 16px 12px 12px',
                  borderLeft: `3px solid ${voted[post.id] ? post.missionColor : post.missionColor + '35'}`,
                  transition: 'border-color 0.25s',
                }}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {/* Vote column */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0, width: 32, position: 'relative' }}>
                      {xpPopups[post.id] && (
                        <div key={xpPopups[post.id]} className="xp-popup" style={{ top: -8, left: '50%', transform: 'translateX(-50%)' }}>
                          +{post.xpReward} XP
                        </div>
                      )}
                      <button onClick={() => handleVote(post.id)}
                        title={voted[post.id] ? 'Remove upvote' : 'Upvote'}
                        style={{ width: 32, height: 28, borderRadius: 6, background: voted[post.id] ? `${post.missionColor}18` : 'var(--surface-highest)', border: `1px solid ${voted[post.id] ? post.missionColor + '55' : 'rgba(255,255,255,0.07)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', padding: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: voted[post.id] ? post.missionColor : 'var(--on-surface-var)', transition: 'color 0.15s' }}>expand_less</span>
                      </button>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: voted[post.id] ? post.missionColor : 'var(--on-surface-var)', lineHeight: 1, textAlign: 'center' }}>{votes[post.id] ?? 0}</span>
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Meta */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--on-surface)', fontFamily: 'var(--font-display)' }}>{post.user}</span>
                        {post.is_anonymous && user?.role === 'admin' && (
                          <span style={{ fontSize: 11, color: 'rgba(204,151,255,0.6)', fontFamily: 'var(--font-mono)' }}>({post.real_name})</span>
                        )}
                        {post.is_anonymous && (
                          <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '1px 5px', color: 'var(--on-surface-var)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>ANON</span>
                        )}
                        {post.badge && (
                          <span className="tag-primary" style={{ fontSize: 9, padding: '1px 7px' }}>{post.badge.toUpperCase()}</span>
                        )}
                        <span style={{ fontSize: 11, color: 'var(--on-surface-var)', opacity: 0.6 }}>{post.time}</span>
                      </div>
                      {/* Body */}
                      <p style={{ fontSize: 14, color: 'var(--on-surface-var)', lineHeight: 1.55, marginBottom: 10 }}>{post.body}</p>
                      {post.code && (
                        <div style={{ background: 'var(--surface-highest)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid var(--primary)', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
                          <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--secondary)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{post.code}</pre>
                        </div>
                      )}
                      {/* Action bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button onClick={() => toggleReplies(post.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, color: expandedReplies.has(post.id) ? 'var(--secondary)' : 'var(--on-surface-var)', background: expandedReplies.has(post.id) ? 'rgba(83,221,252,0.07)' : 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, borderRadius: 6, padding: '4px 8px', fontFamily: 'var(--font-body)', transition: 'all 0.14s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--on-surface)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = expandedReplies.has(post.id) ? 'rgba(83,221,252,0.07)' : 'transparent'; e.currentTarget.style.color = expandedReplies.has(post.id) ? 'var(--secondary)' : 'var(--on-surface-var)'; }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{expandedReplies.has(post.id) ? 'chat_bubble' : 'chat_bubble_outline'}</span>
                          {post.replyCount > 0 ? `${post.replyCount} Comment${post.replyCount !== 1 ? 's' : ''}` : 'Comment'}
                        </button>
                      </div>

                      {/* ── Replies section ── */}
                      {expandedReplies.has(post.id) && (
                        <div style={{ marginTop: 12, paddingLeft: 12, borderLeft: '2px solid rgba(255,255,255,0.07)' }}>
                          {(repliesData[post.id] || []).length === 0 && (
                            <p style={{ fontSize: 12, color: 'var(--on-surface-var)', opacity: 0.45, margin: '0 0 10px' }}>No comments yet.</p>
                          )}
                          {(repliesData[post.id] || []).map((reply, ri) => (
                            <div key={reply.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: ri < (repliesData[post.id].length - 1) ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--on-surface)', fontFamily: 'var(--font-display)' }}>{reply.user}</span>
                                {reply.is_anonymous && user?.role === 'admin' && (
                                  <span style={{ fontSize: 10, color: 'rgba(204,151,255,0.55)', fontFamily: 'var(--font-mono)' }}>({reply.real_name})</span>
                                )}
                                {reply.is_anonymous && (
                                  <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '1px 5px', color: 'var(--on-surface-var)', fontFamily: 'var(--font-mono)' }}>ANON</span>
                                )}
                                <span style={{ fontSize: 11, color: 'var(--on-surface-var)', opacity: 0.55 }}>{reply.time}</span>
                              </div>
                              <p style={{ fontSize: 13, color: 'var(--on-surface-var)', lineHeight: 1.5, margin: 0 }}>{reply.body}</p>
                            </div>
                          ))}
                          {user && (
                            <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                              <input
                                value={replyText[post.id] || ''}
                                onChange={e => setReplyText(prev => ({ ...prev, [post.id]: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitReply(post.id); } }}
                                className="neon-input"
                                placeholder="Write a reply..."
                                maxLength={500}
                                style={{ flex: 1, height: 34, borderRadius: 7, fontSize: 13, boxSizing: 'border-box', padding: '5px 10px' }}
                              />
                              <button
                                onClick={() => setReplyAnon(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                                title={replyAnon[post.id] ? 'Replying anonymously' : 'Reply as yourself'}
                                style={{ height: 34, display: 'flex', alignItems: 'center', gap: 4, background: replyAnon[post.id] ? 'rgba(204,151,255,0.1)' : 'transparent', border: replyAnon[post.id] ? '1px solid rgba(204,151,255,0.35)' : '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '0 9px', cursor: 'pointer', color: replyAnon[post.id] ? 'var(--primary)' : 'var(--on-surface-var)', fontSize: 11, fontFamily: 'var(--font-body)', transition: 'all 0.15s', flexShrink: 0 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{replyAnon[post.id] ? 'visibility_off' : 'visibility'}</span>
                                {replyAnon[post.id] ? 'Anon' : 'Public'}
                              </button>
                              <button
                                onClick={() => handleSubmitReply(post.id)}
                                disabled={!replyText[post.id]?.trim() || submittingReply[post.id]}
                                style={{ height: 34, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(83,221,252,0.08)', border: '1px solid rgba(83,221,252,0.25)', borderRadius: 7, padding: '0 12px', cursor: 'pointer', color: 'var(--secondary)', fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.05em', opacity: (!replyText[post.id]?.trim() || submittingReply[post.id]) ? 0.4 : 1, transition: 'all 0.14s', flexShrink: 0 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>send</span>
                                {submittingReply[post.id] ? '...' : 'REPLY'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.article>

                {/* Inject promo card every 3 posts */}
                {(idx + 1) % 3 === 0 && promoCards.length > 0 && (() => {
                  const card = promoCards[Math.floor((idx + 1) / 3 - 1) % promoCards.length];
                  const DEAL_ACCENT = { Food: '#53DDFC', Study: '#FF95A0', Shopping: '#e3b341', Health: '#FF6E84', Transport: '#CC97FF', Stay: '#a889ff' };
                  if (card.type === 'deal') {
                    const accent = DEAL_ACCENT[card.data.cat] || '#53DDFC';
                    return (
                      <Link to="/discounts" key={`promo-${idx}`} style={{ textDecoration: 'none' }}>
                        <div className="neon-card" style={{ overflow: 'hidden', borderTop: `2px solid ${accent}`, background: `linear-gradient(135deg, ${accent}09 0%, transparent 65%)` }}>
                          <div style={{ padding: '9px 16px', borderBottom: `1px solid ${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 7, fontFamily: 'var(--font-display)', letterSpacing: '0.22em', fontWeight: 800, color: `${accent}80`, background: `${accent}12`, padding: '2px 7px', borderRadius: 4 }}>SPONSORED</span>
                              <span style={{ fontSize: 9, fontFamily: 'var(--font-display)', color: accent, fontWeight: 700, letterSpacing: '0.08em' }}>{(card.data.cat || 'DEAL').toUpperCase()}</span>
                            </div>
                            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: accent, letterSpacing: '-0.02em' }}>{card.data.discount}</span>
                          </div>
                          <div style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 13 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 9, background: `${accent}12`, border: `1px solid ${accent}28`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 16, color: accent }}>sell</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--on-surface)', marginBottom: 2 }}>{card.data.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--on-surface-var)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.data.desc}</div>
                            </div>
                            <span style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, color: accent, flexShrink: 0, letterSpacing: '0.03em' }}>View →</span>
                          </div>
                        </div>
                      </Link>
                    );
                  }
                  if (card.type === 'listing') return (
                    <Link to="/listings" key={`promo-${idx}`} style={{ textDecoration: 'none' }}>
                      <div className="neon-card" style={{ overflow: 'hidden', borderTop: '2px solid var(--primary)', background: 'linear-gradient(135deg, rgba(204,151,255,0.07) 0%, transparent 65%)' }}>
                        <div style={{ padding: '9px 16px', borderBottom: '1px solid rgba(204,151,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 7, fontFamily: 'var(--font-display)', letterSpacing: '0.22em', fontWeight: 800, color: 'rgba(204,151,255,0.55)', background: 'rgba(204,151,255,0.1)', padding: '2px 7px', borderRadius: 4 }}>FEATURED</span>
                            <span style={{ fontSize: 9, fontFamily: 'var(--font-display)', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.08em' }}>{(card.data.tab || 'LISTING').toUpperCase()}</span>
                          </div>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, color: 'var(--tertiary)', letterSpacing: '-0.01em' }}>{card.data.price}</span>
                        </div>
                        <div style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 13 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(204,151,255,0.1)', border: '1px solid rgba(204,151,255,0.22)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)' }}>location_city</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--on-surface)', marginBottom: 2 }}>{card.data.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--on-surface-var)' }}>{card.data.loc}</div>
                          </div>
                          <span style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>Explore →</span>
                        </div>
                      </div>
                    </Link>
                  );
                  if (card.type === 'issue') return (
                    <Link to="/poll" key={`promo-${idx}`} style={{ textDecoration: 'none' }}>
                      <div className="neon-card" style={{ overflow: 'hidden', borderTop: '2px solid #e3b341', background: 'linear-gradient(135deg, rgba(227,179,65,0.07) 0%, transparent 65%)' }}>
                        <div style={{ padding: '9px 16px', borderBottom: '1px solid rgba(227,179,65,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 7, fontFamily: 'var(--font-display)', letterSpacing: '0.22em', fontWeight: 800, color: 'rgba(227,179,65,0.55)', background: 'rgba(227,179,65,0.1)', padding: '2px 7px', borderRadius: 4 }}>TRENDING</span>
                            <span style={{ fontSize: 9, fontFamily: 'var(--font-display)', color: '#e3b341', fontWeight: 700, letterSpacing: '0.08em' }}>PULSE ISSUE</span>
                          </div>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: '#e3b341' }}>{card.data.vote_count ?? 0} votes</span>
                        </div>
                        <div style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 13 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(227,179,65,0.1)', border: '1px solid rgba(227,179,65,0.22)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#e3b341' }}>how_to_vote</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--on-surface)', marginBottom: 2 }}>{card.data.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--on-surface-var)' }}>Cast your vote · make your voice heard</div>
                          </div>
                          <span style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#e3b341', flexShrink: 0 }}>Vote →</span>
                        </div>
                      </div>
                    </Link>
                  );
                  return null;
                })()}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── RIGHT: SIDEBAR ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 80 }}>
          {/* Bazaar Hot */}
          <div className="neon-card hud-bracket" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 8, fontFamily: 'var(--font-display)', color: '#e3b341', letterSpacing: '0.18em', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>BAZAAR</div>
                <span className="eyebrow" style={{ color: 'var(--on-surface-var)' }}>Hot Items</span>
              </div>
              <Link to="/assignments" style={{ display: 'flex', alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--on-surface-var)', cursor: 'pointer' }}>open_in_new</span>
              </Link>
            </div>
            {BAZAAR_HOT.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < BAZAAR_HOT.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, rgba(227,179,65,0.15), rgba(204,151,255,0.1))', border: '1px solid rgba(227,179,65,0.2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#e3b341' }}>sell</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface)', fontFamily: 'var(--font-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: '#e3b341', fontFamily: 'var(--font-mono)', marginTop: 1 }}>{item.credits}</div>
                </div>
              </div>
            ))}
            <Link to="/assignments" className="btn-ghost-cyan" style={{ width: '100%', justifyContent: 'center', marginTop: 14, fontSize: 11, letterSpacing: '0.08em' }}>ENTER BAZAAR</Link>
          </div>

          {/* Live Logs */}
          <div className="neon-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span className="live-dot" />
              <span className="eyebrow">LIVE TERMINAL</span>
            </div>
            {LIVE_LOGS.map((log, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                <span style={{ color: LOG_COLORS[log.type], fontWeight: 700, minWidth: 38 }}>[{log.type}]</span>
                <span style={{ color: 'var(--on-surface-var)' }}>{log.msg}</span>
              </div>
            ))}
          </div>

          {/* Trending Nodes */}
          <div className="neon-card" style={{ padding: 20 }}>
            <span className="eyebrow" style={{ display: 'block', marginBottom: 12 }}>Trending #Nodes</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TRENDING_NODES.map(tag => (
                <span key={tag} className="tag-ghost" style={{ cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(204,151,255,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Quick nav */}
          <div className="neon-card" style={{ padding: 20 }}>
            <span className="eyebrow" style={{ display: 'block', marginBottom: 12 }}>Quick Access</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[['Explore', '/map'], ['Deals', '/discounts'], ['Listings', '/listings'], ['Events', '/events']].map(([label, to]) => (
                <Link key={to} to={to} style={{ padding: '8px 10px', borderRadius: 10, background: 'var(--surface-highest)', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--on-surface-var)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-display)', letterSpacing: '0.04em', textAlign: 'center', transition: 'all 0.14s', textDecoration: 'none' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(204,151,255,0.1)'; e.currentTarget.style.color = 'var(--primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-highest)'; e.currentTarget.style.color = 'var(--on-surface-var)'; }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <AdBanner variant="sidebar" offset={0} />
        </div>
      </div>
    </div>
  );
}
