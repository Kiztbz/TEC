import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';

const EMPTY_CONVERSATION = { id: null, other_user_id: null, other_user_name: null, last_message: null, last_message_at: null };

export default function Messages() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedUserId = searchParams.get('with');
    const selectedUserName = searchParams.get('name');

    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sendingMessage, setSendingMessage] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load conversations on mount
    useEffect(() => {
        if (!user) return;
        loadConversations();
    }, [user]);

    // Load messages when conversation is selected
    useEffect(() => {
        if (!selectedConversation?.id || !user) return;
        loadMessages();

        // Subscribe to new messages
        const subscription = supabase
            .channel(`messages_${selectedConversation.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${selectedConversation.id}`
            }, payload => {
                setMessages(prev => [...prev, payload.new]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [selectedConversation?.id, user]);

    const loadConversations = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
            .order('last_message_at', { ascending: false });

        if (!error && data) {
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

            // If selectedUserId from URL, find or create conversation
            if (selectedUserId && !selectedConversation) {
                const existing = formatted.find(c => c.other_user_id === selectedUserId);
                if (existing) {
                    setSelectedConversation(existing);
                } else if (selectedUserName) {
                    // No existing conversation, but we have the user's name from URL
                    setSelectedConversation({
                        id: null,
                        other_user_id: selectedUserId,
                        other_user_name: decodeURIComponent(selectedUserName),
                        last_message: null,
                        last_message_at: null,
                    });
                }
            }
        }
        setLoading(false);
    };

    const loadMessages = async () => {
        if (!selectedConversation?.id) return;
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', selectedConversation.id)
            .order('created_at', { ascending: true });

        if (!error && data) {
            setMessages(data);
            // Mark messages as read
            await supabase
                .from('messages')
                .update({ read: true })
                .eq('conversation_id', selectedConversation.id)
                .eq('receiver_id', user.id);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation?.other_user_id) return;

        setSendingMessage(true);

        // Ensure conversation exists
        let conversationId = selectedConversation.id;
        if (!conversationId) {
            // Order users by ID to match DB constraint
            const userA = user.id < selectedConversation.other_user_id ? user.id : selectedConversation.other_user_id;
            const userB = user.id < selectedConversation.other_user_id ? selectedConversation.other_user_id : user.id;
            const userAName = user.id === userA ? user.name : selectedConversation.other_user_name;
            const userBName = user.id === userB ? user.name : selectedConversation.other_user_name;

            const { data: conv, error: convErr } = await supabase
                .from('conversations')
                .insert({
                    user_a_id: userA,
                    user_b_id: userB,
                    user_a_name: userAName,
                    user_b_name: userBName,
                })
                .select()
                .single();

            if (!convErr && conv) {
                conversationId = conv.id;
                setSelectedConversation({ ...selectedConversation, id: conversationId });
            }
        }

        // Send message
        const { error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: user.id,
                receiver_id: selectedConversation.other_user_id,
                content: newMessage,
            });

        if (!error) {
            setNewMessage('');
            loadMessages();
        }

        setSendingMessage(false);
    };

    const startConversation = async (userId, userName) => {
        const existing = conversations.find(c => c.other_user_id === userId);
        if (existing) {
            setSelectedConversation(existing);
        } else {
            setSelectedConversation({
                id: null,
                other_user_id: userId,
                other_user_name: userName,
                last_message: null,
                last_message_at: null
            });
            setMessages([]);
        }
    };

    return (
        <div className="page-wrap" style={{ maxWidth: 1200 }}>
            <div style={{ marginBottom: 28 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Direct Messages</div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.95 }}>
                    MESSAGES_<span className="accent-primary">HUB</span>
                </h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, minHeight: 'calc(100vh - 300px)' }}>
                {/* Conversations list */}
                <div className="neon-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: 16, borderBottom: '1px solid var(--outline)' }}>
                        <div className="eyebrow" style={{ marginBottom: 0 }}>Conversations</div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loading ? (
                            <div style={{ padding: 16, textAlign: 'center', color: 'var(--on-surface-var)' }}>Loading...</div>
                        ) : conversations.length === 0 ? (
                            <div style={{ padding: 16, fontSize: 12, color: 'var(--on-surface-var)', textAlign: 'center' }}>
                                No conversations yet. Start messaging!
                            </div>
                        ) : (
                            conversations.map(conv => (
                                <button
                                    key={conv.id}
                                    onClick={() => setSelectedConversation(conv)}
                                    style={{
                                        width: '100%',
                                        padding: 12,
                                        borderBottom: '1px solid var(--outline)',
                                        background: selectedConversation?.id === conv.id ? 'var(--surface)' : 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.14s',
                                    }}
                                >
                                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{conv.other_user_name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--on-surface-var)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {conv.last_message || '—'}
                                    </div>
                                    {conv.last_message_at && (
                                        <div style={{ fontSize: 9, color: 'var(--on-surface-var)', marginTop: 4 }}>
                                            {new Date(conv.last_message_at).toLocaleDateString()}
                                        </div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat area */}
                <div className="neon-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {selectedConversation ? (
                        <>
                            {/* Header */}
                            <div style={{ padding: 16, borderBottom: '1px solid var(--outline)', background: 'var(--surface-highest)' }}>
                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
                                    {selectedConversation.other_user_name}
                                </div>
                            </div>

                            {/* Messages */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {messages.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--on-surface-var)', paddingTop: 40 }}>
                                        No messages yet. Say hello!
                                    </div>
                                ) : (
                                    messages.map((msg, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: 'flex',
                                                justifyContent: msg.sender_id === user.id ? 'flex-end' : 'flex-start',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    maxWidth: '70%',
                                                    padding: '10px 14px',
                                                    borderRadius: 10,
                                                    background: msg.sender_id === user.id ? 'var(--primary)' : 'var(--surface-highest)',
                                                    color: msg.sender_id === user.id ? 'white' : 'var(--on-surface)',
                                                    fontSize: 13,
                                                    wordWrap: 'break-word',
                                                }}
                                            >
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div style={{ padding: 16, borderTop: '1px solid var(--outline)', background: 'var(--surface-highest)', display: 'flex', gap: 10 }}>
                                <input
                                    type="text"
                                    className="neon-input"
                                    placeholder="Type a message…"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    onKeyPress={e => e.key === 'Enter' && sendMessage()}
                                    style={{ flex: 1 }}
                                />
                                <button
                                    className="btn-primary"
                                    onClick={sendMessage}
                                    disabled={sendingMessage || !newMessage.trim()}
                                    style={{ padding: '10px 16px', opacity: sendingMessage ? 0.6 : 1 }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--on-surface-var)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', marginBottom: 12, opacity: 0.3 }}>
                                chat_bubble_outline
                            </span>
                            Select a conversation to start messaging
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
