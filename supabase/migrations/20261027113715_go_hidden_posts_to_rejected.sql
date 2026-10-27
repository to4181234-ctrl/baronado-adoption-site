-- Preserve formerly hidden posts and every related record; change only their list status.
update public.go_cards set status='rejected' where status='hidden';
