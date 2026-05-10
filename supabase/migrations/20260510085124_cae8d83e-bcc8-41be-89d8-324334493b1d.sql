
CREATE SEQUENCE IF NOT EXISTS public.orders_order_number_seq START 1001;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number BIGINT UNIQUE DEFAULT nextval('public.orders_order_number_seq'),
  ADD COLUMN IF NOT EXISTS device_name TEXT,
  ADD COLUMN IF NOT EXISTS price NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS assigned_auditor UUID,
  ADD COLUMN IF NOT EXISTS assigned_delivery UUID;

UPDATE public.orders SET order_number = nextval('public.orders_order_number_seq')
WHERE order_number IS NULL;

DROP POLICY IF EXISTS orders_select ON public.orders;
CREATE POLICY orders_select ON public.orders FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role)
  OR created_by = auth.uid()
  OR assigned_support = auth.uid()
  OR assigned_activator = auth.uid()
  OR assigned_auditor = auth.uid()
  OR assigned_delivery = auth.uid()
  OR has_role(auth.uid(), 'auditor'::app_role)
  OR has_role(auth.uid(), 'delivery'::app_role)
  OR has_role(auth.uid(), 'support'::app_role)
);

DROP POLICY IF EXISTS orders_update ON public.orders;
CREATE POLICY orders_update ON public.orders FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'auditor'::app_role)
  OR has_role(auth.uid(), 'delivery'::app_role)
  OR has_role(auth.uid(), 'support'::app_role)
  OR created_by = auth.uid()
  OR assigned_support = auth.uid()
  OR assigned_activator = auth.uid()
);

CREATE TABLE IF NOT EXISTS public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  created_by UUID,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY issues_select ON public.issues FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'support'::app_role)
  OR created_by = auth.uid()
  OR resolved_by = auth.uid()
);

CREATE POLICY issues_insert ON public.issues FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'support'::app_role)
  OR has_role(auth.uid(), 'receptionist'::app_role)
);

CREATE POLICY issues_update ON public.issues FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'support'::app_role)
);

CREATE POLICY issues_delete_manager ON public.issues FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

DROP TRIGGER IF EXISTS trg_issues_updated_at ON public.issues;
CREATE TRIGGER trg_issues_updated_at
BEFORE UPDATE ON public.issues
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  employee_id UUID NOT NULL,
  company TEXT NOT NULL,
  orders_count INTEGER NOT NULL DEFAULT 0,
  price_per_order NUMERIC(12,2) NOT NULL DEFAULT 0,
  returned_count INTEGER NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY deliveries_select ON public.deliveries FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role) OR employee_id = auth.uid()
);

CREATE POLICY deliveries_insert ON public.deliveries FOR INSERT TO authenticated
WITH CHECK (
  employee_id = auth.uid()
  AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'delivery'::app_role))
);

CREATE POLICY deliveries_update ON public.deliveries FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role) OR employee_id = auth.uid());

CREATE POLICY deliveries_delete_manager ON public.deliveries FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));
