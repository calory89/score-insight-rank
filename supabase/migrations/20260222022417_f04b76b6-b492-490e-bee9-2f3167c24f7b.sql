-- Create subscriptions table for tracking user plans and credits
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'free',
  credits_total integer NOT NULL DEFAULT 5,
  credits_used integer NOT NULL DEFAULT 0,
  billing_period_start timestamp with time zone NOT NULL DEFAULT now(),
  billing_period_end timestamp with time zone NOT NULL DEFAULT (now() + interval '1 month'),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service can manage subscriptions"
ON public.subscriptions FOR ALL
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert Super Pro for rrppspain@gmail.com
INSERT INTO public.subscriptions (user_id, plan, credits_total, credits_used)
SELECT p.user_id, 'super_pro', 999, 47
FROM public.profiles p
WHERE p.email = 'rrppspain@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET plan = 'super_pro', credits_total = 999, credits_used = 47;