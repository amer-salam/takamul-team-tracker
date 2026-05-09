
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('manager', 'receptionist', 'support', 'activator');

-- Order status
CREATE TYPE public.order_status AS ENUM ('new', 'processing', 'activated', 'completed', 'cancelled');

-- Task type
CREATE TYPE public.task_type AS ENUM ('order_received', 'problem_resolved', 'code_activated', 'note');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  product TEXT NOT NULL DEFAULT 'satellite_device',
  status public.order_status NOT NULL DEFAULT 'new',
  notes TEXT,
  device_code TEXT,
  source TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_support UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_activator UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Tasks (activity log)
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type public.task_type NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto profile + first user becomes manager
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.raw_user_meta_data->>'phone');

  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'manager');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies
-- profiles
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles
CREATE POLICY "roles_select_self_or_manager" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "roles_manager_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- orders: managers see all; employees see orders they're tied to
CREATE POLICY "orders_select" ON public.orders FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'manager')
    OR created_by = auth.uid()
    OR assigned_support = auth.uid()
    OR assigned_activator = auth.uid()
  );
CREATE POLICY "orders_insert" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'receptionist')
  );
CREATE POLICY "orders_update" ON public.orders FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'manager')
    OR created_by = auth.uid()
    OR assigned_support = auth.uid()
    OR assigned_activator = auth.uid()
  );
CREATE POLICY "orders_delete_manager" ON public.orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));

-- tasks
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'manager') OR employee_id = auth.uid());
CREATE POLICY "tasks_insert_own" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid());
CREATE POLICY "tasks_delete_manager" ON public.tasks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));

CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_tasks_employee ON public.tasks(employee_id);
CREATE INDEX idx_tasks_order ON public.tasks(order_id);
