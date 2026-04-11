import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import HMSLogin from './HMSLogin';
import HMSDashboard from './HMSDashboard';

/**
 * HMS Portal root — rendered when hostname starts with "hms."
 * Uses the same Supabase project but a separate hms_tenants table.
 * Students never land here; hostel owners do.
 */
export default function HMSApp() {
    const [session, setSession] = useState(null);
    const [tenant, setTenant] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchTenant(session.user.id);
            else setLoading(false);
        });

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) fetchTenant(session.user.id);
            else { setTenant(null); setLoading(false); }
        });

        return () => listener.subscription.unsubscribe();
    }, []);

    async function fetchTenant(authId) {
        setLoading(true);
        const { data } = await supabase
            .from('hms_tenants')
            .select('*')
            .eq('auth_id', authId)
            .maybeSingle();
        setTenant(data);
        setLoading(false);
    }

    async function handleLogout() {
        await supabase.auth.signOut();
    }

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--primary)', animation: 'spin 1s linear infinite' }}>apartment</span>
                    <span style={{ color: 'var(--on-surface-var)', fontSize: 13 }}>Loading HMS…</span>
                </div>
            </div>
        );
    }

    if (!session) return <HMSLogin onLogin={() => { }} />;

    return (
        <HMSDashboard
            session={session}
            tenant={tenant}
            onTenantCreated={setTenant}
            onLogout={handleLogout}
        />
    );
}
