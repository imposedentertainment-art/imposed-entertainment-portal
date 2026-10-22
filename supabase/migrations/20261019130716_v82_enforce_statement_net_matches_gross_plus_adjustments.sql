alter table public.artist_statements add constraint artist_statements_net_matches_gross_adjustments check (round(net_amount, 2) = round(gross_amount + adjustments, 2));
