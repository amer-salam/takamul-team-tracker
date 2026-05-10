
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'auditor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'delivery';

ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'pending_audit';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'audited_printed';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'in_delivery';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'delivered';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'returned';

ALTER TYPE public.task_type ADD VALUE IF NOT EXISTS 'audit_done';
ALTER TYPE public.task_type ADD VALUE IF NOT EXISTS 'delivery_done';
ALTER TYPE public.task_type ADD VALUE IF NOT EXISTS 'issue_received';
ALTER TYPE public.task_type ADD VALUE IF NOT EXISTS 'issue_resolved';
