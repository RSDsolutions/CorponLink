-- Fix canonical ownership for academy recipe purchases.
-- The purchase record should reference public.profiles, matching the rest of the platform
-- and allowing the admin relationship `profiles!user_id` to resolve correctly.

alter table public.academy_recipe_purchases
  drop constraint if exists academy_recipe_purchases_user_id_fkey;

alter table public.academy_recipe_purchases
  add constraint academy_recipe_purchases_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

create index if not exists academy_recipe_purchases_user_id_idx
  on public.academy_recipe_purchases (user_id);
