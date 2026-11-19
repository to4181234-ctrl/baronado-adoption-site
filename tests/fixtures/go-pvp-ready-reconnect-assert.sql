-- Synthetic isolated PostgreSQL only: reproduce temporary lag, real disconnect and re-ready.
DO $pvp_ready_test$
DECLARE
 a uuid:='11111111-1111-4111-8111-111111111111';
 b uuid:='22222222-2222-4222-8222-222222222222';
 ca uuid:='55555555-5555-4555-8555-555555555555';
 cb uuid:='66666666-6666-4666-8666-666666666666';
 room uuid;code text;r jsonb;
BEGIN
 r:=public.go_pvp_create(a);
 IF r->>'ok'<>'true' THEN RAISE EXCEPTION 'room create failed %',r; END IF;
 room:=(r->>'roomId')::uuid;code:=r->>'inviteCode';
 r:=public.go_pvp_join(b,code);
 IF r->>'ok'<>'true' THEN RAISE EXCEPTION 'room join failed %',r; END IF;
 r:=public.go_pvp_action(a,room,'select','camera',ca);
 IF r->>'ok'<>'true' THEN RAISE EXCEPTION 'host card selection failed %',r; END IF;
 r:=public.go_pvp_action(b,room,'select','camera',cb);
 IF r->>'ok'<>'true' THEN RAISE EXCEPTION 'guest card selection failed %',r; END IF;
 r:=public.go_pvp_action(a,room,'ready');
 IF r->>'status'<>'ready' THEN RAISE EXCEPTION 'host ready was not stored %',r; END IF;
 -- Ten-second delay must not revoke readiness or hide a live peer.
 UPDATE public.go_pvp_rooms SET guest_seen_at=now()-interval '10 seconds' WHERE id=room;
 r:=public.go_pvp_action(a,room,'sync');
 IF r->>'status'<>'playing' THEN RAISE EXCEPTION '10s delay cancelled room %',r; END IF;
 IF NOT (SELECT host_ready FROM public.go_pvp_rounds WHERE room_id=room AND round_number=1) THEN
   RAISE EXCEPTION '10s jitter incorrectly revoked host READY'; END IF;
 r:=public.go_pvp_snapshot(a,room);
 IF r->>'otherConnected'<>'true' OR r->>'myReady'<>'true' OR r->>'otherCard'<>'null' THEN
   RAISE EXCEPTION '10s snapshot wrong or opponent leaked %',r; END IF;
 -- Twenty-second gap is a real interruption: both must explicitly ready again.
 UPDATE public.go_pvp_rooms SET guest_seen_at=now()-interval '20 seconds' WHERE id=room;
 r:=public.go_pvp_action(a,room,'sync');
 IF r->>'status'<>'playing' THEN RAISE EXCEPTION '20s gap prematurely ended room %',r; END IF;
 IF EXISTS(SELECT 1 FROM public.go_pvp_rounds WHERE room_id=room AND round_number=1 AND (host_ready OR guest_ready)) THEN
   RAISE EXCEPTION '20s true interruption failed to clear READY flags'; END IF;
 r:=public.go_pvp_snapshot(a,room);
 IF r->>'otherConnected'<>'false' OR r->>'otherCard'<>'null' THEN
   RAISE EXCEPTION 'disconnected opponent leaked %',r; END IF;
 r:=public.go_pvp_action(b,room,'sync');
 IF r->>'status'<>'playing' THEN RAISE EXCEPTION 'guest reconnect failed %',r; END IF;
 r:=public.go_pvp_action(a,room,'ready');
 IF r->>'status'<>'ready' THEN RAISE EXCEPTION 'reconnected host ready failed %',r; END IF;
 IF EXISTS(SELECT 1 FROM public.go_pvp_records WHERE room_id=room) THEN
   RAISE EXCEPTION 'match started before both explicit READY'; END IF;
 r:=public.go_pvp_action(b,room,'ready');
 IF r->>'status'<>'completed' THEN RAISE EXCEPTION 'both READY failed to finish match %',r; END IF;
 IF (SELECT count(*) FROM public.go_pvp_records WHERE room_id=room)<>2 THEN
   RAISE EXCEPTION 'matching results not exactly one per participant'; END IF;
 r:=public.go_pvp_snapshot(a,room);
 IF r->>'status'<>'completed' OR r->>'otherCard'='null' OR (r->>'otherCard') IS NULL THEN
   RAISE EXCEPTION 'completed cards did not reveal to both %',r; END IF;
END $pvp_ready_test$;
