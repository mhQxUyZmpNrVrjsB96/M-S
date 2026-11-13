-- ==============================================================================
-- M&S TAKE A MANAGMENT - SUPABASE DATABASE SCHEMA & REALTIME SETUP
-- Esegui questo script completo nel SQL Editor del tuo progetto Supabase.
-- ==============================================================================

-- 1. Tabella Distributori Automatici
CREATE TABLE IF NOT EXISTS public.vending_machines (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    address TEXT DEFAULT '',
    zone TEXT DEFAULT '',
    coordinates JSONB DEFAULT '{"lat": 0, "lng": 0, "x": 50, "y": 50}'::jsonb,
    status TEXT DEFAULT 'operativo',
    slots JSONB DEFAULT '[]'::jsonb,
    cash_balance NUMERIC DEFAULT 0,
    pos_balance NUMERIC DEFAULT 0,
    last_restock_date TEXT DEFAULT '',
    coffee_counter_current NUMERIC DEFAULT 0,
    coffee_counter_last_restock NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabella Catalogo Prodotti & Magazzino
CREATE TABLE IF NOT EXISTS public.vending_products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit_cost NUMERIC DEFAULT 0,
    default_price NUMERIC DEFAULT 0,
    unit TEXT DEFAULT 'pz',
    warehouse_stock NUMERIC DEFAULT 0,
    warehouse_alert_threshold NUMERIC DEFAULT 5,
    active_batch_id TEXT,
    image_url TEXT,
    description TEXT,
    coffee_config JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabella Lotti d'Acquisto Fornitori & Fatture
CREATE TABLE IF NOT EXISTS public.vending_purchases (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    batch_number TEXT DEFAULT '',
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    supplier TEXT DEFAULT '',
    package_count NUMERIC DEFAULT 1,
    units_per_package NUMERIC DEFAULT 1,
    total_units NUMERIC DEFAULT 0,
    remaining_units NUMERIC DEFAULT 0,
    price_input_type TEXT DEFAULT 'per_confezione',
    is_price_without_vat BOOLEAN DEFAULT false,
    input_price NUMERIC DEFAULT 0,
    vat_rate NUMERIC DEFAULT 22,
    total_taxable NUMERIC DEFAULT 0,
    total_vat NUMERIC DEFAULT 0,
    total_gross NUMERIC DEFAULT 0,
    unit_cost_net NUMERIC DEFAULT 0,
    unit_cost_with_vat NUMERIC DEFAULT 0,
    cost_basis_used TEXT DEFAULT 'netto',
    invoice_ref TEXT,
    notes TEXT,
    expiry_date TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabella Storico Sessioni di Ricarica & Vendite
CREATE TABLE IF NOT EXISTS public.vending_restock_history (
    id TEXT PRIMARY KEY,
    machine_id TEXT NOT NULL,
    machine_name TEXT NOT NULL,
    machine_code TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    total_sold NUMERIC DEFAULT 0,
    total_revenue NUMERIC DEFAULT 0,
    total_cost NUMERIC DEFAULT 0,
    total_profit NUMERIC DEFAULT 0,
    cash_collected NUMERIC DEFAULT 0,
    operator_notes TEXT DEFAULT '',
    coffee_counter_previous NUMERIC DEFAULT 0,
    coffee_counter_current NUMERIC DEFAULT 0,
    coffee_dispenses NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabella Registro Manutenzioni & Riparazioni
CREATE TABLE IF NOT EXISTS public.vending_maintenances (
    id TEXT PRIMARY KEY,
    machine_id TEXT NOT NULL,
    machine_name TEXT NOT NULL,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    note TEXT,
    component_name TEXT,
    cost NUMERIC,
    created_at TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabella Spese Fisse Negozio H24
CREATE TABLE IF NOT EXISTS public.vending_fixed_costs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    recurrence TEXT DEFAULT 'mensile',
    date_added TEXT NOT NULL,
    due_date TEXT,
    notes TEXT,
    auto_deduction BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabella Tracciamento Storico per Singola Spirale
CREATE TABLE IF NOT EXISTS public.vending_tracked_spirals (
    id TEXT PRIMARY KEY,
    machine_id TEXT NOT NULL,
    machine_code TEXT NOT NULL,
    machine_name TEXT NOT NULL,
    machine_type TEXT,
    slot_id TEXT NOT NULL,
    slot_label TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_category TEXT,
    total_sold_pieces NUMERIC DEFAULT 0,
    total_revenue NUMERIC DEFAULT 0,
    total_cost NUMERIC DEFAULT 0,
    total_profit NUMERIC DEFAULT 0,
    current_capacity NUMERIC,
    current_stock NUMERIC,
    current_sale_price NUMERIC,
    status TEXT DEFAULT 'attiva',
    start_date TEXT DEFAULT '',
    closed_date TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabella Preset Dosaggi & Ricette Caffè
CREATE TABLE IF NOT EXISTS public.vending_dosage_presets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    grams_per_dose NUMERIC NOT NULL,
    icon TEXT DEFAULT '☕',
    package_grams NUMERIC DEFAULT 1000,
    notes TEXT,
    is_custom BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabella Snapshot di Stato Globale (Canale di Sincronizzazione Multidispositivo Atomico)
CREATE TABLE IF NOT EXISTS public.vending_store_state (
    id TEXT PRIMARY KEY,
    state_json JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- SICUREZZA: ABILITAZIONE ROW LEVEL SECURITY (RLS) & POLICY
-- ==============================================================================

ALTER TABLE public.vending_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vending_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vending_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vending_restock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vending_maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vending_fixed_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vending_tracked_spirals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vending_dosage_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vending_store_state ENABLE ROW LEVEL SECURITY;

-- Crea policy di lettura e scrittura complete per l'app gestionale
DO $$
BEGIN
    DROP POLICY IF EXISTS "Permetti accesso completo vending_machines" ON public.vending_machines;
    CREATE POLICY "Permetti accesso completo vending_machines" ON public.vending_machines FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Permetti accesso completo vending_products" ON public.vending_products;
    CREATE POLICY "Permetti accesso completo vending_products" ON public.vending_products FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Permetti accesso completo vending_purchases" ON public.vending_purchases;
    CREATE POLICY "Permetti accesso completo vending_purchases" ON public.vending_purchases FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Permetti accesso completo vending_restock_history" ON public.vending_restock_history;
    CREATE POLICY "Permetti accesso completo vending_restock_history" ON public.vending_restock_history FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Permetti accesso completo vending_maintenances" ON public.vending_maintenances;
    CREATE POLICY "Permetti accesso completo vending_maintenances" ON public.vending_maintenances FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Permetti accesso completo vending_fixed_costs" ON public.vending_fixed_costs;
    CREATE POLICY "Permetti accesso completo vending_fixed_costs" ON public.vending_fixed_costs FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Permetti accesso completo vending_tracked_spirals" ON public.vending_tracked_spirals;
    CREATE POLICY "Permetti accesso completo vending_tracked_spirals" ON public.vending_tracked_spirals FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Permetti accesso completo vending_dosage_presets" ON public.vending_dosage_presets;
    CREATE POLICY "Permetti accesso completo vending_dosage_presets" ON public.vending_dosage_presets FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Permetti accesso completo vending_store_state" ON public.vending_store_state;
    CREATE POLICY "Permetti accesso completo vending_store_state" ON public.vending_store_state FOR ALL USING (true) WITH CHECK (true);
END $$;

-- ==============================================================================
-- SINCRONIZZAZIONE REALTIME: ABILITA LA PUBBLICAZIONE SUPABASE REALTIME
-- ==============================================================================
DO $$
BEGIN
    -- Aggiungi tabelle alla pubblicazione supabase_realtime se non già presenti
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.vending_store_state;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.vending_machines;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.vending_products;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.vending_purchases;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.vending_restock_history;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.vending_maintenances;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.vending_fixed_costs;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.vending_tracked_spirals;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.vending_dosage_presets;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
