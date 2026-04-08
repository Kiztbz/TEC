import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ROLE_COLORS = {
    admin: '#FF6E84', moderator: '#FF95A0', builder: '#CC97FF', student: '#53DDFC',
};

const NAV = [
    { icon: 'storefront', label: 'Marketplace', to: '/assignments' },
    { icon: 'explore', label: 'Explore', to: '/map' },
    { icon: 'campaign', label: 'Feed', to: '/feed' },
    { icon: 'mail', label: 'Messages', to: '/messages' },
    { icon: 'sell', label: 'Deals', to: '/discounts' },
    { icon: 'location_city', label: 'Listings', to: '/listings' },
    { icon: 'how_to_vote', label: 'Pulse', to: '/poll' },
    { icon: 'info', label: 'About', to: '/about' },
];

function generateMemberId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 6; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
    return id;
}

export default function Header() {
    const location = useLocation();
    const { user, logout } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('tec-theme') || 'dark');

    useEffect(() => {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        localStorage.setItem('tec-theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
    const [form, setForm] = useState({ name: '', sapId: '', personalEmail: '', collegeEmail: '', batch: '', year: '', course: '' });
    const [memberId, setMemberId] = useState('');
    const [success, setSuccess] = useState(false);

    const handleClose = () => {
        setShowModal(false);
        setForm({ name: '', sapId: '', personalEmail: '', collegeEmail: '', batch: '', year: '', course: '' });
        setMemberId(''); setSuccess(false);
    };

    const isActive = (to) => to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

    return (
        <>
            {/* ── Fonts ── */}
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&family=Bebas+Neue&family=Barlow+Condensed:wght@500;600;700;800;900&display=swap" rel="stylesheet" />
            <style>{`
                .material-symbols-outlined { font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; user-select:none; }

                /* ── Nav link ── */
                .tec-nav-link {
                    display: flex; align-items: center; gap: 7px;
                    padding: 0 15px; height: 100%;
                    position: relative; text-decoration: none;
                    font-family: 'Bebas Neue', 'Barlow Condensed', sans-serif;
                    font-size: 15px; letter-spacing: 0.09em;
                    color: rgba(255,255,255,0.38);
                    transition: color 0.14s;
                    white-space: nowrap;
                }
                .tec-nav-link::after {
                    content: ''; position: absolute; bottom: 0; left: 15px; right: 15px;
                    height: 2px; border-radius: 2px 2px 0 0;
                    background: #CC97FF;
                    transform: scaleX(0); transform-origin: center;
                    transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
                }
                .tec-nav-link:hover { color: rgba(255,255,255,0.8); }
                .tec-nav-link.tec-active {
                    color: #CC97FF;
                    text-shadow: 0 0 18px rgba(204,151,255,0.6);
                }
                .tec-nav-link.tec-active::after { transform: scaleX(1); box-shadow: 0 0 8px rgba(204,151,255,0.7); }
                .tec-nav-link .tec-nav-icon { font-size: 15px; }

                /* ── Mobile nav link — GTA style ── */
                .tec-mob-link {
                    display: flex; align-items: center; gap: 14px;
                    padding: 0 18px; height: 56px; border-radius: 0; margin-bottom: 0;
                    text-decoration: none; position: relative; overflow: hidden;
                    font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 0.14em;
                    color: rgba(255,255,255,0.32); transition: all 0.14s;
                    border-left: 3px solid transparent;
                }
                .tec-mob-link::before {
                    content: ''; position: absolute; left: 0; top: 0; bottom: 0;
                    width: 0; background: linear-gradient(90deg, rgba(204,151,255,0.11) 0%, rgba(204,151,255,0.04) 60%, transparent 100%);
                    transition: width 0.22s;
                }
                .tec-mob-link::after {
                    content: ''; position: absolute; left: 0; bottom: 0; right: 0; height: 1px;
                    background: rgba(255,255,255,0.04);
                }
                .tec-mob-link:hover { color: rgba(255,255,255,0.85); border-left-color: rgba(204,151,255,0.35); }
                .tec-mob-link:hover::before { width: 100%; }
                .tec-mob-link.tec-active {
                    color: #CC97FF; border-left-color: #CC97FF;
                    background: linear-gradient(90deg, rgba(204,151,255,0.13) 0%, rgba(204,151,255,0.03) 70%, transparent 100%);
                    text-shadow: 0 0 22px rgba(204,151,255,0.55);
                    font-size: 21px;
                }
                .tec-mob-row-num {
                    font-family: 'Barlow Condensed', monospace; font-size: 11px; font-weight: 900;
                    letter-spacing: 0.04em; color: rgba(255,255,255,0.18); min-width: 22px;
                    font-variant-numeric: tabular-nums;
                }
                .tec-mob-link.tec-active .tec-mob-row-num { color: rgba(204,151,255,0.5); }
                .tec-mob-active-dot {
                    width: 6px; height: 6px; border-radius: 50%; background: #CC97FF; flex-shrink: 0;
                    box-shadow: 0 0 8px rgba(204,151,255,0.9), 0 0 16px rgba(204,151,255,0.4);
                    animation: pulseDot 2s ease-in-out infinite;
                }
                @keyframes pulseDot {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.7); }
                }
                .tec-wanted-stars {
                    font-size: 11px; letter-spacing: 0.05em; margin-top: 3px;
                    color: #e3b341;
                    text-shadow: 0 0 8px rgba(227,179,65,0.6);
                }
                /* ── Mobile drawer scanlines (enhanced) ── */
                .tec-mob-drawer-scans {
                    position: absolute; inset: 0; pointer-events: none; z-index: 0;
                    background: repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px);
                    mix-blend-mode: overlay;
                }

                /* ── Right side user ── */
                .tec-user-name {
                    font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 700;
                    letter-spacing: 0.03em; color: rgba(255,255,255,0.82);
                    max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                }
                .tec-role-pill {
                    font-family: 'Barlow Condensed', sans-serif; font-size: 10px; font-weight: 800;
                    letter-spacing: 0.12em; text-transform: uppercase;
                    padding: 2px 8px; border-radius: 5px; border: 1px solid;
                }
                .tec-signout {
                    cursor: pointer; background: transparent;
                    border: 1px solid rgba(255,110,132,0.3); color: #FF6E84;
                    font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 800;
                    letter-spacing: 0.12em; text-transform: uppercase;
                    padding: 6px 14px; border-radius: 7px; transition: background 0.14s;
                }
                .tec-signout:hover { background: rgba(255,110,132,0.08); }
                .tec-join-btn {
                    cursor: pointer;
                    font-family: 'Bebas Neue', sans-serif !important;
                    font-size: 15px !important; letter-spacing: 0.1em !important;
                    padding: 7px 20px; border-radius: 8px; border: none;
                    background: linear-gradient(135deg, #9C48EA, #CC97FF);
                    color: #fff; transition: opacity 0.14s, transform 0.14s;
                }
                .tec-join-btn:hover { opacity: 0.85; transform: translateY(-1px); }
                .tec-signin-link {
                    font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 700;
                    letter-spacing: 0.1em; text-transform: uppercase;
                    color: rgba(255,255,255,0.4); text-decoration: none; transition: color 0.14s;
                    padding: 6px 10px;
                }
                .tec-signin-link:hover { color: #fff; }

                /* ── Responsive ── */
                .tec-desktop-nav { display: flex; }
                .tec-topbar-right { display: flex; }
                .tec-hamburger { display: none; }
                @media (max-width: 1023px) {
                    .tec-desktop-nav { display: none !important; }
                    .tec-topbar-right { display: none !important; }
                    .tec-hamburger { display: flex !important; }
                }

                /* ── Mobile drawer scanline ── */
                .tec-mob-drawer::after {
                    content: ''; pointer-events: none;
                    position: absolute; inset: 0;
                    background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.10) 3px, rgba(0,0,0,0.10) 4px);
                    z-index: 1; mix-blend-mode: overlay;
                }
                /* ── Animated hamburger ── */
                .tec-hamburger-bar { display: block; height: 2px; background: rgba(255,255,255,0.65); border-radius: 2px; transition: all 0.22s; }
                .tec-hamburger.open .tec-hamburger-bar:nth-child(1) { transform: translateY(7px) rotate(45deg); background: #CC97FF; }
                .tec-hamburger.open .tec-hamburger-bar:nth-child(2) { opacity: 0; transform: scaleX(0); }
                .tec-hamburger.open .tec-hamburger-bar:nth-child(3) { transform: translateY(-7px) rotate(-45deg); background: #CC97FF; }
            `}</style>

            {/* ══════════════ TOP NAV ══════════════ */}
            <nav style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: 68,
                display: 'flex', alignItems: 'stretch',
                background: 'rgba(8,8,9,0.95)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 2px 40px rgba(0,0,0,0.7), inset 0 -1px 0 rgba(204,151,255,0.04)',
                padding: '0 24px',
            }}>

                {/* Logo */}
                <Link to="/feed" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', marginRight: 28, flexShrink: 0, gap: 10 }}>
                    <img src="/logo.png" alt="TEC Logo" style={{ height: 44, width: 44, objectFit: 'contain' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        <span style={{
                            fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, fontStyle: 'italic',
                            color: '#CC97FF', letterSpacing: '0.03em', lineHeight: 1,
                            textShadow: '0 0 28px rgba(204,151,255,0.55), 0 0 64px rgba(204,151,255,0.18)',
                        }}>TEC</span>
                        <span style={{
                            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 6.5, fontWeight: 700,
                            letterSpacing: '0.28em', color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase',
                            marginTop: -2,
                        }}>Echo</span>
                    </div>
                </Link>

                {/* Divider */}
                <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', margin: '16px 4px', flexShrink: 0 }} />

                {/* Desktop nav */}
                <div className="tec-desktop-nav" style={{ flex: 1, alignItems: 'stretch', gap: 0, overflow: 'hidden' }}>
                    {NAV.map(({ icon, label, to }) => (
                        <Link key={to} to={to} className={`tec-nav-link${isActive(to) ? ' tec-active' : ''}`}>
                            <span className="material-symbols-outlined tec-nav-icon">{icon}</span>
                            {label}
                        </Link>
                    ))}
                    {user?.role === 'admin' && (
                        <Link to="/admin" className={`tec-nav-link${isActive('/admin') ? ' tec-active' : ''}`}
                            style={{ color: isActive('/admin') ? '#FF6E84' : undefined }}>
                            <span className="material-symbols-outlined tec-nav-icon">admin_panel_settings</span>
                            Admin
                        </Link>
                    )}
                </div>

                {/* Right: user / auth */}
                <div className="tec-topbar-right" style={{ alignItems: 'center', gap: 10, marginLeft: 'auto', flexShrink: 0 }}>
                    {user ? (
                        <>
                            <button onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} style={{
                                width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.7)',
                                transition: 'all 0.15s', flexShrink: 0,
                            }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
                                    {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                                </span>
                            </button>
                            <span className="tec-role-pill" style={{
                                color: ROLE_COLORS[user.role] || '#CC97FF',
                                borderColor: `${ROLE_COLORS[user.role] || '#CC97FF'}45`,
                                background: `${ROLE_COLORS[user.role] || '#CC97FF'}12`,
                            }}>{user.role}</span>
                            <div style={{
                                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                                background: 'rgba(204,151,255,0.1)', border: '1.5px solid rgba(204,151,255,0.28)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: '#CC97FF',
                            }}>{(user.avatarLetter || user.name?.[0] || 'U').toUpperCase()}</div>
                            <span className="tec-user-name">{user.name}</span>
                            <Link to="/profile" style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--on-surface-var)', textDecoration: 'none', letterSpacing: '0.06em', padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', transition: 'all 0.14s' }}
                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = 'rgba(204,151,255,0.3)'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--on-surface-var)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
                                PROFILE
                            </Link>
                            <button className="tec-signout" onClick={logout}>Sign out</button>
                        </>
                    ) : (
                        <>
                            <button onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} style={{
                                width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.7)',
                                transition: 'all 0.15s', flexShrink: 0,
                            }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
                                    {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                                </span>
                            </button>
                            <Link to="/login" className="tec-signin-link">Sign in</Link>
                            <button onClick={() => setShowModal(true)} className="tec-join-btn">Join TEC</button>
                        </>
                    )}
                </div>

                {/* Hamburger */}
                <button onClick={() => setMobileOpen(o => !o)} className={`tec-hamburger${mobileOpen ? ' open' : ''}`} style={{
                    flexDirection: 'column', gap: 5, background: 'transparent', border: 'none',
                    cursor: 'pointer', padding: 8, marginLeft: 'auto', alignSelf: 'center',
                }}>
                    <span className="tec-hamburger-bar" style={{ width: 22 }} />
                    <span className="tec-hamburger-bar" style={{ width: 16 }} />
                    <span className="tec-hamburger-bar" style={{ width: 22 }} />
                </button>
            </nav>

            {/* ══════════════ MOBILE DRAWER ══════════════ */}
            {mobileOpen && (
                <div onClick={() => setMobileOpen(false)} style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
                    zIndex: 300, backdropFilter: 'blur(6px)',
                }}>
                    <div onClick={e => e.stopPropagation()} className="tec-mob-drawer" style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0, width: 300,
                        background: 'linear-gradient(160deg, #0a0a0c 0%, #0d0b14 60%, #0a0a0c 100%)',
                        borderRight: '1px solid rgba(204,151,255,0.12)',
                        overflowY: 'auto', overflowX: 'hidden',
                        display: 'flex', flexDirection: 'column',
                        boxShadow: '8px 0 60px rgba(0,0,0,0.8)',
                    }}>
                        {/* GTA-style header strip */}
                        <div style={{
                            position: 'relative', padding: '28px 20px 20px',
                            borderBottom: '1px solid rgba(204,151,255,0.1)',
                            background: 'linear-gradient(135deg, rgba(204,151,255,0.06), transparent)',
                        }}>
                            {/* Corner accent */}
                            <div style={{
                                position: 'absolute', top: 0, right: 0,
                                width: 80, height: 80,
                                background: 'radial-gradient(circle at top right, rgba(204,151,255,0.12), transparent 70%)',
                            }} />
                            <div style={{
                                fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, fontStyle: 'italic',
                                color: '#CC97FF', letterSpacing: '0.04em', lineHeight: 1,
                                textShadow: '0 0 30px rgba(204,151,255,0.6), 2px 2px 0 rgba(0,0,0,0.8)',
                            }}>TEC</div>
                            <div style={{
                                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 800,
                                letterSpacing: '0.3em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase',
                                marginTop: -2,
                            }}>The Echo Community</div>
                            {user && (() => {
                                const WANTED = { student: 1, builder: 2, moderator: 3, admin: 5 };
                                const stars = WANTED[user.role] || 1;
                                return (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                                            background: 'rgba(204,151,255,0.1)',
                                            border: '1.5px solid rgba(204,151,255,0.3)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: '#CC97FF',
                                            boxShadow: '0 0 14px rgba(204,151,255,0.25)',
                                        }}>{(user.avatarLetter || user.name?.[0] || 'U').toUpperCase()}</div>
                                        <div>
                                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color: '#fff', letterSpacing: '0.03em', lineHeight: 1.1 }}>{user.name}</div>
                                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: ROLE_COLORS[user.role] || '#CC97FF', marginBottom: 2 }}>{user.role}</div>
                                            <div className="tec-wanted-stars">
                                                {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Nav section label */}
                        <div style={{ padding: '16px 20px 8px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 900, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>Navigation</div>

                        {/* Nav links */}
                        <div style={{ flex: 1, position: 'relative', zIndex: 2 }}>
                            {NAV.map(({ icon, label, to }, idx) => (
                                <Link key={to} to={to} onClick={() => setMobileOpen(false)}
                                    className={`tec-mob-link${isActive(to) ? ' tec-active' : ''}`}>
                                    <span className="tec-mob-row-num">{String(idx + 1).padStart(2, '0')}</span>
                                    <span className="material-symbols-outlined" style={{ fontSize: 19, opacity: isActive(to) ? 0.9 : 0.5 }}>{icon}</span>
                                    <span style={{ flex: 1 }}>{label}</span>
                                    {isActive(to) && <span className="tec-mob-active-dot" />}
                                </Link>
                            ))}
                            {user && (
                                <Link to="/profile" onClick={() => setMobileOpen(false)}
                                    className={`tec-mob-link${isActive('/profile') ? ' tec-active' : ''}`}
                                    style={{ color: isActive('/profile') ? 'var(--primary)' : undefined, borderLeftColor: isActive('/profile') ? 'var(--primary)' : undefined }}>
                                    <span className="tec-mob-row-num">{String(NAV.length + 1).padStart(2, '0')}</span>
                                    <span className="material-symbols-outlined" style={{ fontSize: 19, opacity: isActive('/profile') ? 0.9 : 0.5 }}>account_circle</span>
                                    <span style={{ flex: 1 }}>My Profile</span>
                                    {isActive('/profile') && <span className="tec-mob-active-dot" />}
                                </Link>
                            )}
                            {user?.role === 'admin' && (
                                <Link to="/admin" onClick={() => setMobileOpen(false)}
                                    className={`tec-mob-link${isActive('/admin') ? ' tec-active' : ''}`}
                                    style={{
                                        color: isActive('/admin') ? '#FF6E84' : undefined,
                                        borderLeftColor: isActive('/admin') ? '#FF6E84' : undefined,
                                    }}>
                                    <span className="tec-mob-row-num" style={{ color: isActive('/admin') ? 'rgba(255,110,132,0.5)' : undefined }}>{String(NAV.length + 2).padStart(2, '0')}</span>
                                    <span className="material-symbols-outlined" style={{ fontSize: 19, opacity: isActive('/admin') ? 0.9 : 0.5, color: '#FF6E84' }}>admin_panel_settings</span>
                                    <span style={{ flex: 1 }}>Admin</span>
                                    {isActive('/admin') && <span className="tec-mob-active-dot" style={{ background: '#FF6E84', boxShadow: '0 0 8px rgba(255,110,132,0.9)' }} />}
                                </Link>
                            )}
                        </div>

                        {/* Bottom actions */}
                        <div style={{ padding: '16px 20px 28px', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', zIndex: 2 }}>
                            <button onClick={toggleTheme} style={{
                                width: '100%', padding: '10px 14px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8,
                                color: 'rgba(255,255,255,0.5)', fontFamily: "'Bebas Neue', sans-serif",
                                fontSize: 14, letterSpacing: '0.1em', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                                transition: 'all 0.14s',
                            }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                                    {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                                </span>
                                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                            </button>
                            {user ? (
                                <button onClick={() => { logout(); setMobileOpen(false); }} style={{
                                    width: '100%', padding: '11px 14px',
                                    background: 'rgba(255,110,132,0.06)',
                                    border: '1px solid rgba(255,110,132,0.2)', borderRadius: 8,
                                    color: '#FF6E84', fontFamily: "'Bebas Neue', sans-serif",
                                    fontSize: 14, letterSpacing: '0.1em', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 8,
                                }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
                                    Disconnect
                                </button>
                            ) : (
                                <button onClick={() => { setShowModal(true); setMobileOpen(false); }} style={{
                                    width: '100%', padding: '13px 14px',
                                    background: 'linear-gradient(135deg, #9C48EA, #CC97FF)',
                                    border: 'none', borderRadius: 8,
                                    color: '#fff', fontFamily: "'Bebas Neue', sans-serif",
                                    fontSize: 18, letterSpacing: '0.12em', cursor: 'pointer',
                                    boxShadow: '0 0 24px rgba(204,151,255,0.25)',
                                }}>Join TEC</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ JOIN MODAL ══════════════ */}
            {showModal && (
                <div className="modal-overlay" onClick={handleClose}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        {!success ? (
                            <form onSubmit={e => { e.preventDefault(); setMemberId(generateMemberId()); setSuccess(true); }}>
                                <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: '0.06em', marginBottom: 6 }}>
                                    Join <span className="accent-primary">TEC</span>
                                </h2>
                                <p style={{ color: 'var(--on-surface-var)', fontSize: 13, marginBottom: 24 }}>Create your campus profile.</p>
                                <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                    {[
                                        { name: 'name', placeholder: 'Full Name' },
                                        { name: 'sapId', placeholder: 'SAP ID' },
                                        { name: 'course', placeholder: 'Course (e.g. B.Tech CSE)' },
                                        { name: 'batch', placeholder: 'Batch (e.g. 2022–2026)' },
                                        { name: 'year', placeholder: 'Current Year' },
                                    ].map(f => (
                                        <input key={f.name} className="neon-input" name={f.name} placeholder={f.placeholder} value={form[f.name] || ''} onChange={e => setForm({ ...form, [e.target.name]: e.target.value })} required />
                                    ))}
                                    <input className="neon-input" type="email" name="personalEmail" placeholder="Personal Email" value={form.personalEmail} onChange={e => setForm({ ...form, personalEmail: e.target.value })} required />
                                    <input className="neon-input" type="email" name="collegeEmail" placeholder="College Email" value={form.collegeEmail} onChange={e => setForm({ ...form, collegeEmail: e.target.value })} />
                                </div>
                                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                                    <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: 12, fontSize: 12, letterSpacing: '0.08em' }}>Join TEC</button>
                                    <button type="button" className="btn-secondary" onClick={handleClose} style={{ padding: '12px 20px' }}>Cancel</button>
                                </div>
                            </form>
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: '0.06em', marginBottom: 8 }}>Welcome, <span className="accent-primary">{form.name}</span></h2>
                                <p style={{ color: 'var(--on-surface-var)', fontSize: 13, marginBottom: 20 }}>Your member ID</p>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 800, color: 'var(--primary)', background: 'rgba(204,151,255,0.08)', border: '1px solid rgba(204,151,255,0.2)', borderRadius: 12, padding: '16px 28px', letterSpacing: 6, display: 'inline-block', marginBottom: 24, boxShadow: '0 0 24px rgba(204,151,255,0.15)' }}>{memberId}</div>
                                <p style={{ fontSize: 12, color: 'var(--on-surface-var)', marginBottom: 20 }}>Save this to access your profile.</p>
                                <button onClick={handleClose} className="btn-primary" style={{ padding: '10px 36px', justifyContent: 'center' }}>Done</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
