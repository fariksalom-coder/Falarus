CREATE TABLE IF NOT EXISTS public.fossils_payments (
  id bigserial PRIMARY KEY,
  phone text NOT NULL,
  tariff text NOT NULL,
  image_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fossils_payments_status ON public.fossils_payments (status);
CREATE INDEX IF NOT EXISTS idx_fossils_payments_created_at ON public.fossils_payments (created_at DESC);
