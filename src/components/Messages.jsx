import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';

function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    if (now - d < 7 * 86400000) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function Avatar({ name, size = 40 }) {
    const letter = (name || '?')[0].toUpperCase();
    const colors = ['#CC97FF', '#53DDFC', '#FF95A0', '#4ade80', '#f59e0b', '#60a5fa'];
    const color = colors[letter.charCodeAt(0) % colors.length];
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: `${color}22`, border: `1.5px solid ${color}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: size * 0.42,
            color, flexShrink: 0,
        }}>
            {letter}
        </div>
    );
}

export default function Messages() {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const urlWithId = searchParams.get('with');
    const urlWithName = searchParams.get('name');

    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'
    const [showNewChat, setShowNewChat] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');
    const [members, setMembers] = useState([]);
    const [membersLoading, setMembersLoading] = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const selectedConvRef = useRef(selectedConversation);
    selectedConvRef.current = selectedConversation;

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages]);

    // ── Realtime: conversation list updates ──
    useEffect(() => {
        if (!user) return;
        loadConversations();

        const channel = supabase
            .channel(`conv_list_${user.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'conversations',
                filter: `user_a_id=eq.${user.id}`,
            }, () => loadConversations())
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'conversations',
                filter: `user_b_id=eq.${user.id}`,
            }, () => loadConversations())
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user]);

    // ── Realtime: messages in selected conversation ──
    useEffect(() => {
        if (!selectedConversation?.id || !user) return;
        loadMessages();

        const channel = supabase
            .channel(`msgs_${selectedConversation.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${selectedConversation.id}`,
            }, payload => {
                setMessages(prev => {
                    if (prev.find(m => m.id === payload.new.id)) return prev;
                    return [...prev, payload.new];
                });
                // Mark as read immediately if we're the receiver
                if (payload.new.receiver_id === user.id) {
                    supabase.from('messages')
                        .update({ read: true })
                        .eq('id', payload.new.id)
                        .then(() => { });
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [selectedConversation?.id, user]);

    const loadConversations = async () => {
        if (!user) return;
        setLoading(true);
        const { data } = await supabase
            .from('conversations')
            .select('*')
            .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
            .order('last_message_at', { ascending: false, nullsFirst: false });

        if (data) {
            const formatted = data.map(conv => {
                const isUserA = conv.user_a_id === user.id;
                return {
                    id: conv.id,
                    other_user_id: isUserA ? conv.user_b_id : conv.user_a_id,
                    other_user_name: isUserA ? conv.user_b_name : conv.user_a_name,
                    last_message: conv.last_message,
                    last_message_at: conv.last_message_at,
                };
            });
            setConversations(formatted);

            if (urlWithId) {
                const existing = formatted.find(c => c.other_user_id === urlWithId);
                if (existing && !selectedConvRef.current) {
                    setSelectedConversation(existing);
                    setMobileView('chat');
                } else if (!existing && urlWithName && !selectedConvRef.current) {
                    setSelectedConversation({
                        id: null,
                        other_user_id: urlWithId,
                        other_user_name: decodeURIComponent(urlWithName),
                        last_message: null,
                        last_message_at: null,
                    });
                    setMobileView('chat');
                }
            }
        }
        setLoading(false);
    };

    const loadMessages = async () => {
        if (!selectedConversation?.id) return;
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', selectedConversation.id)
            .order('created_at', { ascending: true });

        if (data) {
            setMessages(data);
            supabase.from('messages')
                .update({ read: true })
                .eq('conversation_id', selectedConversation.id)
                .eq('receiver_id', user.id)
                .then(() => { });
        }
    };

    const sendMessage = async () => {
        const text = newMessage.trim();
        if (!text || !selectedConversation?.other_user_id) return;
        setSendingMessage(true);

        let conversationId = selectedConversation.id;

        if (!conversationId) {
            const userA = user.id < selectedConversation.other_user_id ? user.id : selectedConversation.other_user_id;
            const userB = user.id < selectedConversation.other_user_id ? selectedConversation.other_user_id : user.id;
            const userAName = userA === user.id ? user.name : selectedConversation.other_user_name;
            const userBName = userB === user.id ? user.name : selectedConversation.other_user_name;

            const { data: conv, error: convErr } = await supabase
                .from('conversations')
                .insert({ user_a_id: userA, user_b_id: userB, user_a_name: userAName, user_b_name: userBName })
                .select()
                .single();

            if (!convErr && conv) {
                conversationId = conv.id;
                setSelectedConversation(prev => ({ ...prev, id: conversationId }));
            } else {
                setSendingMessage(false);
                return;
            }
        }

        // Optimistic append
        const optimistic = {
            id: `opt_${Date.now()}`,
            conversation_id: conversationId,
            sender_id: user.id,
            receiver_id: selectedConversation.other_user_id,
            content: text,
            read: false,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimistic]);
        setNewMessage('');

        const { data: sent, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: user.id,
                receiver_id: selectedConversation.other_user_id,
                content: text,
            })
            .select()
            .single();

        if (!error && sent) {
            // Replace optimistic with real row
            setMessages(prev => prev.map(m => m.id === optimistic.id ? sent : m));
        } else {
            // Remove optimistic on failure
            setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        }

        setSendingMessage(false);
        inputRef.current?.focus();
    };

    const openConversation = (conv) => {
        setSelectedConversation(conv);
        setMessages([]);
        setMobileView('chat');
    };

    const searchMembers = async (q) => {
        setMembersLoading(true);
        const { data } = await supabase
            .from('members')
            .select('id, name, auth_id')
            .ilike('name', `%${q}%`)
            .neq('auth_id', user.id)
            .limit(20);
        setMembers(data || []);
        setMembersLoading(false);
    };

    const startNewConversation = (member) => {
        const existing = conversations.find(c => c.other_user_id === member.auth_id);
        if (existing) {
            openConversation(existing);
        } else {
            openConversation({
                id: null,
                other_user_id: member.auth_id,
                other_user_name: member.name,
                last_message: null,
                last_message_at: null,
            });
        }
        setShowNewChat(false);
        setMemberSearch('');
        setMembers([]);
    };

    const isMine = (msg) => msg.sender_id === user?.id;

    // Group messages by date
    const groupedMessages = messages.reduce((groups, msg) => {
        const date = new Date(msg.created_at).toDateString();
        if (!groups[date]) groups[date] = [];
        groups[date].push(msg);
        return groups;
    }, {});

    const sidebarVisible = mobileView === 'list';
    const chatVisible = mobileView === 'chat';

    return (
        <>
            <style>{`
                .msg-container {
                    display: flex;
                    height: calc(100vh - 100px);
                    max-height: 900px;
                    overflow: hidden;
                    border-radius: 16px;
                    border: 1px solid var(--outline);
                    background: var(--bg);
                }
                .msg-sidebar {
                    width: 320px;
                    min-width: 320px;
                    display: flex;
                    flex-direction: column;
                    border-right: 1px solid var(--outline);
                    background: var(--surface);
                }
                .msg-chat {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    background: var(--bg);
                    min-width: 0;
                }
                .conv-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    cursor: pointer;
                    border-bottom: 1px solid var(--outline);
                    transition: background 0.1s;
                    background: transparent;
                    border: none;
                    width: 100%;
                    text-align: left;
                    position: relative;
                }
                .conv-item:hover { background: rgba(204,151,255,0.06); }
                .conv-item.active { background: rgba(204,151,255,0.1); }
                .conv-item::after {
                    content: ''; position: absolute; left: 0; top: 0; bottom: 0;
                    width: 3px; background: var(--primary);
                    opacity: 0; transition: opacity 0.1s;
                }
                .conv-item.active::after { opacity: 1; }
                .msg-bubble-wrap {
                    display: flex;
                    margin-bottom: 2px;
                }
                .msg-bubble-wrap.mine { justify-content: flex-end; }
                .msg-bubble-wrap.theirs { justify-content: flex-start; }
                .msg-bubble {
                    max-width: 72%;
                    padding: 8px 12px 6px;
                    border-radius: 12px;
                    font-size: 13.5px;
                    line-height: 1.45;
                    word-break: break-word;
                    position: relative;
                }
                .msg-bubble.mine {
                    background: var(--primary);
                    color: #fff;
                    border-bottom-right-radius: 3px;
                }
                .msg-bubble.theirs {
                    background: var(--surface-highest, #2a2a3a);
                    color: var(--on-surface);
                    border-bottom-left-radius: 3px;
                }
                .msg-time {
                    font-size: 10px;
                    opacity: 0.6;
                    float: right;
                    margin-left: 8px;
                    margin-top: 2px;
                }
                .date-divider {
                    text-align: center;
                    margin: 16px 0 8px;
                    font-size: 11px;
                    color: var(--on-surface-var);
                    position: relative;
                }
                .date-divider::before, .date-divider::after {
                    content: ''; position: absolute; top: 50%;
                    width: calc(50% - 50px); height: 1px;
                    background: var(--outline);
                }
                .date-divider::before { left: 0; }
                .date-divider::after { right: 0; }
                .msg-search-input {
                    width: 100%; box-sizing: border-box;
                    background: var(--surface-highest, #1e1e2e);
                    border: 1px solid var(--outline);
                    border-radius: 20px;
                    padding: 8px 14px;
                    font-size: 13px;
                    color: var(--on-surface);
                    outline: none;
                }
                .msg-search-input:focus { border-color: var(--primary); }
                @media (max-width: 640px) {
                    .msg-container { border-radius: 0; border-left: none; border-right: none; height: calc(100vh - 80px); max-height: none; }
                    .msg-sidebar { width: 100%; min-width: 100%; }
                    .msg-chat { width: 100%; }
                    .msg-sidebar.hidden, .msg-chat.hidden { display: none; }
                }
            `}</style>

            <div style={{ padding: '0 0 0 0', maxWidth: 960, margin: '0 auto' }}>
                <div className="msg-container">
                    {/* ── Sidebar ── */}
                    <div className={`msg-sidebar${!sidebarVisible ? ' hidden' : ''}`}>
                        {/* Sidebar header */}
                        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--outline)', background: 'var(--surface)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>
                                    Chats
                                </span>
                                <button
                                    onClick={() => { setShowNewChat(s => !s); if (!showNewChat) { setMemberSearch(''); setMembers([]); } }}
                                    title="New Chat"
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', padding: 4 }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                                        {showNewChat ? 'close' : 'edit_square'}
                                    </span>
                                </button>
                            </div>
                            {showNewChat ? (
                                <div>
                                    <input
                                        className="msg-search-input"
                                        placeholder="Search members…"
                                        value={memberSearch}
                                        autoFocus
                                        onChange={e => { setMemberSearch(e.target.value); if (e.target.value.length > 0) searchMembers(e.target.value); else setMembers([]); }}
                                    />
                                </div>
                            ) : (
                                <input
                                    className="msg-search-input"
                                    placeholder="Search conversations…"
                                    style={{ pointerEvents: 'none' }}
                                    readOnly
                                />
                            )}
                        </div>

                        {/* New chat member list */}
                        {showNewChat && (
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                {membersLoading ? (
                                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--on-surface-var)', fontSize: 13 }}>Searching…</div>
                                ) : members.length === 0 && memberSearch.length > 0 ? (
                                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--on-surface-var)', fontSize: 13 }}>No members found</div>
                                ) : members.length === 0 ? (
                                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--on-surface-var)', fontSize: 13 }}>
                                        Type a name to search members
                                    </div>
                                ) : (
                                    members.map(m => (
                                        <button key={m.id} className="conv-item" onClick={() => startNewConversation(m)}>
                                            <Avatar name={m.name} size={42} />
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Conversation list */}
                        {!showNewChat && (
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                {loading ? (
                                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--on-surface-var)', fontSize: 13 }}>Loading…</div>
                                ) : conversations.length === 0 ? (
                                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--on-surface-var)', fontSize: 13 }}>
                                        No conversations yet.<br />
                                        <span style={{ opacity: 0.6 }}>Tap the pencil icon to start one!</span>
                                    </div>
                                ) : (
                                    conversations.map(conv => (
                                        <button
                                            key={conv.id}
                                            className={`conv-item${selectedConversation?.id === conv.id ? ' active' : ''}`}
                                            onClick={() => openConversation(conv)}
                                        >
                                            <Avatar name={conv.other_user_name} size={46} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                                                    <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }}>
                                                        {conv.other_user_name}
                                                    </span>
                                                    <span style={{ fontSize: 11, color: 'var(--on-surface-var)', flexShrink: 0, marginLeft: 8 }}>
                                                        {formatTime(conv.last_message_at)}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--on-surface-var)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {conv.last_message || 'Start a conversation'}
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Chat panel ── */}
                    <div className={`msg-chat${!chatVisible ? ' hidden' : ''}`} style={{ display: chatVisible || window.innerWidth > 640 ? 'flex' : undefined, flexDirection: 'column' }}>
                        {selectedConversation ? (
                            <>
                                {/* Chat header */}
                                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--outline)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                                    <button
                                        className="back-btn"
                                        onClick={() => setMobileView('list')}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--on-surface-var)', padding: 4, display: 'flex', alignItems: 'center' }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
                                    </button>
                                    <Avatar name={selectedConversation.other_user_name} size={38} />
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{selectedConversation.other_user_name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--primary)', opacity: 0.7 }}>TEC Member</div>
                                    </div>
                                </div>

                                {/* Messages area */}
                                <div
                                    style={{
                                        flex: 1, overflowY: 'auto', padding: '12px 16px',
                                        display: 'flex', flexDirection: 'column',
                                        backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(204,151,255,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(83,221,252,0.04) 0%, transparent 50%)',
                                    }}
                                >
                                    {Object.entries(groupedMessages).map(([date, msgs]) => (
                                        <div key={date}>
                                            <div className="date-divider">
                                                <span style={{ background: 'var(--bg)', padding: '0 12px' }}>
                                                    {new Date(date).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}
                                                </span>
                                            </div>
                                            {msgs.map((msg, i) => {
                                                const mine = isMine(msg);
                                                const prevMine = i > 0 ? isMine(msgs[i - 1]) : !mine;
                                                const showGap = prevMine !== mine;
                                                return (
                                                    <div key={msg.id} className={`msg-bubble-wrap ${mine ? 'mine' : 'theirs'}`} style={{ marginTop: showGap ? 12 : 2 }}>
                                                        <div className={`msg-bubble ${mine ? 'mine' : 'theirs'}`}>
                                                            {msg.content}
                                                            <span className="msg-time">
                                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                {mine && (
                                                                    <span style={{ marginLeft: 4 }}>
                                                                        {msg.read
                                                                            ? <span style={{ color: '#53DDFC' }}>✓✓</span>
                                                                            : '✓'}
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                    {messages.length === 0 && (
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-var)', gap: 10 }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: 44, opacity: 0.2 }}>waving_hand</span>
                                            <span style={{ fontSize: 13 }}>Say hello to {selectedConversation.other_user_name}!</span>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input bar */}
                                <div style={{ padding: '10px 12px', borderTop: '1px solid var(--outline)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        placeholder="Message…"
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                                        style={{
                                            flex: 1, background: 'var(--surface-highest, #1e1e2e)',
                                            border: '1px solid var(--outline)', borderRadius: 22,
                                            padding: '10px 16px', fontSize: 14, color: 'var(--on-surface)',
                                            outline: 'none', transition: 'border-color 0.15s',
                                        }}
                                        onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                                        onBlur={e => e.target.style.borderColor = 'var(--outline)'}
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={sendingMessage || !newMessage.trim()}
                                        style={{
                                            width: 42, height: 42, borderRadius: '50%',
                                            background: newMessage.trim() ? 'var(--primary)' : 'var(--outline)',
                                            border: 'none', cursor: newMessage.trim() ? 'pointer' : 'default',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'background 0.15s, transform 0.1s', flexShrink: 0,
                                        }}
                                        onMouseDown={e => { if (newMessage.trim()) e.currentTarget.style.transform = 'scale(0.92)'; }}
                                        onMouseUp={e => e.currentTarget.style.transform = ''}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: newMessage.trim() ? 'white' : 'var(--on-surface-var)' }}>send</span>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-var)', gap: 16 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 56, opacity: 0.15 }}>forum</span>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Your Messages</div>
                                    <div style={{ fontSize: 13, opacity: 0.7 }}>Select a conversation or start a new one</div>
                                </div>
                                <button
                                    className="btn-primary"
                                    onClick={() => setShowNewChat(true)}
                                    style={{ marginTop: 4 }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit_square</span>
                                    New Message
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
