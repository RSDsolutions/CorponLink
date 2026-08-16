-- Insert Celerity Plans - Agosto 2026

BEGIN;

-- FAST CELERITY BASE
INSERT INTO public.plans (family, plan, speed, price) VALUES
('FAST CELERITY BASE', 'FAST CELERITY BASE 500 Mbps', '500 Mbps', 20.50),
('FAST CELERITY BASE', 'FAST CELERITY BASE 750 Mbps', '750 Mbps', 23.00),
('FAST CELERITY BASE', 'FAST CELERITY BASE 1000 Mbps', '1000 Mbps', 24.00),
('FAST CELERITY BASE', 'FAST CELERITY BASE 2000 Mbps', '2000 Mbps', 32.00);

-- FAST CELERITY IDEAL
INSERT INTO public.plans (family, plan, speed, price) VALUES
('FAST CELERITY IDEAL', 'Fast Celerity Ideal 500 Mbps', '500 Mbps', 23.00),
('FAST CELERITY IDEAL', 'Fast Celerity Ideal 750 Mbps', '750 Mbps', 25.00),
('FAST CELERITY IDEAL', 'Fast Celerity Ideal 1000 Mbps', '1000 Mbps', 27.00),
('FAST CELERITY IDEAL', 'Fast Celerity Ideal 2000 Mbps', '2000 Mbps', 36.00);

-- FAST CELERITY PREMIUM
INSERT INTO public.plans (family, plan, speed, price) VALUES
('FAST CELERITY PREMIUM', 'Fast Celerity Premium 500 Mbps', '500 Mbps', 29.00),
('FAST CELERITY PREMIUM', 'Fast Celerity Premium 750 Mbps', '750 Mbps', 30.00),
('FAST CELERITY PREMIUM', 'Fast Celerity Premium 1000 Mbps', '1000 Mbps', 32.00),
('FAST CELERITY PREMIUM', 'Fast Celerity Premium 2000 Mbps', '2000 Mbps', 45.00);

-- CELERITY GAMER
INSERT INTO public.plans (family, plan, speed, price) VALUES
('CELERITY GAMER', 'Celerity Gamer 750 Mbps', '750 Mbps', 29.99),
('CELERITY GAMER', 'Celerity Gamer 1000 Mbps', '1000 Mbps', 39.99);

-- CELERITY PARTNER IDEAL
INSERT INTO public.plans (family, plan, speed, price) VALUES
('CELERITY PARTNER IDEAL', 'Celerity Partner Ideal 500 Mbps', '500 Mbps', 25.00),
('CELERITY PARTNER IDEAL', 'Celerity Partner Ideal 750 Mbps', '750 Mbps', 27.00),
('CELERITY PARTNER IDEAL', 'Celerity Partner Ideal 1000 Mbps', '1000 Mbps', 29.00),
('CELERITY PARTNER IDEAL', 'Celerity Partner Ideal 2000 Mbps', '2000 Mbps', 38.00);

-- CELERITY PARTNER PREMIUM
INSERT INTO public.plans (family, plan, speed, price) VALUES
('CELERITY PARTNER PREMIUM', 'Celerity Partner Premium 500 Mbps', '500 Mbps', 31.00),
('CELERITY PARTNER PREMIUM', 'Celerity Partner Premium 750 Mbps', '750 Mbps', 32.00),
('CELERITY PARTNER PREMIUM', 'Celerity Partner Premium 1000 Mbps', '1000 Mbps', 34.00),
('CELERITY PARTNER PREMIUM', 'Celerity Partner Premium 2000 Mbps', '2000 Mbps', 47.00);

COMMIT;
