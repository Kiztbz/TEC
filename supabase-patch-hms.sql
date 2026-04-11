-- ============================================================
-- TEC × HMS — Hostel Management System Patch
-- Run this AFTER supabase-schema.sql
--
-- Adds:
--   hms_tenants       — hostel-owner accounts (SaaS subscribers)
--   hms_properties    — properties managed by tenants; can be listed on TEC
-- ============================================================


-- ============================================================
-- SECTION HMS-1 — TENANT ACCOUNTS
--   One row per hostel owner.
--   auth_id links to Supabase Auth (same project, separate from members).
--   plan controls feature access (free → basic, pro → TEC listing, enterprise → multi-property).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hms_tenants (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id             UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_name          TEXT        NOT NULL,
  email               TEXT        NOT NULL,
  phone               TEXT,
  hostel_name         TEXT        NOT NULL,
  plan                TEXT        NOT NULL DEFAULT 'free'
                                  CHECK (plan IN ('free', 'pro', 'enterprise')),
  subscription_active BOOLEAN     NOT NULL DEFAULT TRUE,
  max_beds            INT         NOT NULL DEFAULT 50,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hms_tenants ENABLE ROW LEVEL SECURITY;

-- Tenant can read/update their own row
CREATE POLICY "hms_tenant_read_own" ON public.hms_tenants
  FOR SELECT TO authenticated
  USING (auth_id = auth.uid() OR public.get_my_role() = 'admin');

CREATE POLICY "hms_tenant_update_own" ON public.hms_tenants
  FOR UPDATE TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

CREATE POLICY "hms_tenant_insert_own" ON public.hms_tenants
  FOR INSERT TO authenticated
  WITH CHECK (auth_id = auth.uid());

-- Admin: full access
CREATE POLICY "hms_tenant_admin_all" ON public.hms_tenants
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');


-- ============================================================
-- SECTION HMS-2 — HOSTEL PROPERTIES
--   Each tenant can register one or more hostel properties.
--   listed_on_tec: tenant signals they want to appear on TEC listings.
--   tec_approved:  admin must approve before it shows on the listings page.
--   Both must be TRUE for the listing to be public on TEC.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hms_properties (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES public.hms_tenants(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  loc           TEXT        NOT NULL,
  price         TEXT        NOT NULL,           -- e.g. "6,500/mo"
  tags          TEXT[]      NOT NULL DEFAULT '{}',
  desc          TEXT,
  rating        NUMERIC(3,1) NOT NULL DEFAULT 0.0 CHECK (rating BETWEEN 0 AND 5),
  reviews       INT         NOT NULL DEFAULT 0,
  gender        TEXT        NOT NULL DEFAULT 'any' CHECK (gender IN ('boys', 'girls', 'any')),
  total_beds    INT         NOT NULL DEFAULT 0,
  available_beds INT        NOT NULL DEFAULT 0,
  listed_on_tec BOOLEAN     NOT NULL DEFAULT FALSE,
  tec_approved  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hms_properties ENABLE ROW LEVEL SECURITY;

-- Public / any-auth: read properties that are both opted-in and admin-approved
CREATE POLICY "hms_prop_public_read" ON public.hms_properties
  FOR SELECT TO authenticated, anon
  USING (listed_on_tec = TRUE AND tec_approved = TRUE);

-- Tenant: full CRUD on their own properties
CREATE POLICY "hms_prop_tenant_all" ON public.hms_properties
  FOR ALL TO authenticated
  USING (
    tenant_id = (SELECT id FROM public.hms_tenants WHERE auth_id = auth.uid() LIMIT 1)
  )
  WITH CHECK (
    tenant_id = (SELECT id FROM public.hms_tenants WHERE auth_id = auth.uid() LIMIT 1)
  );

-- Admin: full access
CREATE POLICY "hms_prop_admin_all" ON public.hms_properties
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- Trigger: keep updated_at current
CREATE OR REPLACE FUNCTION public.hms_prop_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_hms_prop_updated_at
  BEFORE UPDATE ON public.hms_properties
  FOR EACH ROW EXECUTE FUNCTION public.hms_prop_set_updated_at();


-- ============================================================
-- SECTION HMS-3 — PLAN LIMITS
--   Reference for the app — not enforced at DB level (app-level guard).
-- ============================================================

-- free:       up to 50 beds, no TEC listing
-- pro:        unlimited beds, TEC listing available (requires admin approval), ₹999/mo
-- enterprise: multi-property, custom cap, white-label, custom pricing

COMMENT ON COLUMN public.hms_tenants.plan IS
  'free: 50 bed cap, no TEC listing | pro: unlimited + TEC listing | enterprise: custom';
