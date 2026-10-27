alter table public.go_members add column google_sub text unique check(google_sub ~ '^[0-9]{1,255}$');
alter table public.go_cards drop constraint go_cards_member_id_fkey;
alter table public.go_cards add constraint go_cards_member_id_fkey foreign key(member_id) references public.go_members(id) on delete cascade;
