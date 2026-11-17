-- INTEGRATION TEST ONLY. Synthetic empty reproduction of current public Go schema structure.

-- READ-ONLY introspection of production columns/constraints. No private records, credentials or keys.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$BEGIN CREATE ROLE service_role; EXCEPTION WHEN duplicate_object THEN NULL; END$$;

CREATE TABLE public."dogs" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "name" text DEFAULT '이름 미정'::text NOT NULL,
 "gender" text DEFAULT '여자'::text NOT NULL,
 "neutered" boolean DEFAULT false NOT NULL,
 "age" text DEFAULT '나이 미정'::text NOT NULL,
 "description" text DEFAULT ''::text NOT NULL,
 "images" text[] DEFAULT '{}'::text[] NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "category" text DEFAULT 'adoption'::text NOT NULL,
 "adopted" boolean DEFAULT false NOT NULL,
 "arrived_at" date,
 "adopted_at" date,
 "profile" jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE public."go_affinity" (
 "member_id" uuid NOT NULL,
 "dog_id" uuid NOT NULL,
 "level" smallint DEFAULT 0 NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."go_battle_card_stats" (
 "card_id" uuid NOT NULL,
 "dog_id" uuid NOT NULL,
 "power" smallint NOT NULL,
 "charm" smallint NOT NULL,
 "element" text NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."go_battles" (
 "id" uuid NOT NULL,
 "member_id" uuid NOT NULL,
 "first_card_id" uuid NOT NULL,
 "second_card_id" uuid NOT NULL,
 "first_dog_id" uuid NOT NULL,
 "second_dog_id" uuid NOT NULL,
 "first_power" smallint NOT NULL,
 "first_charm" smallint NOT NULL,
 "first_element" text NOT NULL,
 "first_bonus" smallint NOT NULL,
 "first_score" smallint NOT NULL,
 "second_power" smallint NOT NULL,
 "second_charm" smallint NOT NULL,
 "second_element" text NOT NULL,
 "second_bonus" smallint NOT NULL,
 "second_score" smallint NOT NULL,
 "winner" text NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."go_cards" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "dog_id" uuid NOT NULL,
 "member_id" uuid NOT NULL,
 "image_path" text NOT NULL,
 "photo_style" text NOT NULL,
 "description" text DEFAULT ''::text NOT NULL,
 "captured_at" timestamp with time zone DEFAULT now() NOT NULL,
 "status" text DEFAULT 'approved'::text NOT NULL,
 "reviewed_at" timestamp with time zone,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "title" text DEFAULT ''::text NOT NULL,
 "rejection_reason" text,
 "rejection_note" text,
 "cuteness" smallint,
 "charm" smallint,
 "affection" smallint,
 "share_count" bigint DEFAULT 0 NOT NULL
);

CREATE TABLE public."go_coin_transactions" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "member_id" uuid NOT NULL,
 "amount" integer NOT NULL,
 "event_type" text NOT NULL,
 "source_key" text NOT NULL,
 "local_day" date NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."go_coin_wallets" (
 "member_id" uuid NOT NULL,
 "balance" bigint DEFAULT 0 NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."go_interactions" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "member_id" uuid NOT NULL,
 "dog_id" uuid NOT NULL,
 "action" text NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."go_members" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "nickname" text NOT NULL,
 "nickname_key" text NOT NULL,
 "password_hash" text NOT NULL,
 "recovery_hash" text NOT NULL,
 "disabled" boolean DEFAULT false NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "email" text,
 "session_version" integer DEFAULT 0 NOT NULL,
 "google_sub" text,
 "profile_bio" text DEFAULT ''::text NOT NULL,
 "avatar_dog" text,
 "go_popup_enabled" boolean DEFAULT true NOT NULL,
 "go_popup_hide_until" timestamp with time zone,
 "go_popup_last_seen_kst" date,
 "recovery_question" text,
 "recovery_answer_hash" text
);

CREATE TABLE public."go_official_assets" (
 "version_id" uuid NOT NULL,
 "slot" smallint NOT NULL,
 "title" text DEFAULT ''::text NOT NULL,
 "original_path" text NOT NULL,
 "display_path" text NOT NULL,
 "crop_x" numeric(6,4) DEFAULT 0.5 NOT NULL,
 "crop_y" numeric(6,4) DEFAULT 0.5 NOT NULL,
 "zoom" numeric(6,3) DEFAULT 1 NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."go_official_daily_draws" (
 "member_id" uuid NOT NULL,
 "local_day" date NOT NULL,
 "dog_id" uuid NOT NULL,
 "slot" smallint NOT NULL,
 "duplicate" boolean NOT NULL,
 "proposed_power" smallint,
 "proposed_charm" smallint,
 "resolved_at" timestamp with time zone,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."go_official_hidden" (
 "member_id" uuid NOT NULL,
 "dog_id" uuid NOT NULL,
 "unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
 "seen_at" timestamp with time zone
);

CREATE TABLE public."go_official_issuance_markers" (
 "dog_id" uuid NOT NULL,
 "first_issued_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."go_official_owned" (
 "member_id" uuid NOT NULL,
 "dog_id" uuid NOT NULL,
 "slot" smallint NOT NULL,
 "power" smallint NOT NULL,
 "charm" smallint NOT NULL,
 "acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
 "seen_at" timestamp with time zone
);

CREATE TABLE public."go_official_purchases" (
 "member_id" uuid NOT NULL,
 "request_id" uuid NOT NULL,
 "dog_id" uuid NOT NULL,
 "slot" smallint NOT NULL,
 "coins" integer DEFAULT 200 NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."go_official_sets" (
 "dog_id" uuid NOT NULL,
 "current_version" uuid,
 "paused" boolean DEFAULT false NOT NULL,
 "published_once_at" timestamp with time zone,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."go_official_versions" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "dog_id" uuid NOT NULL,
 "status" text DEFAULT 'draft'::text NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "published_at" timestamp with time zone
);

CREATE TABLE public."go_pvp_records" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "member_id" uuid NOT NULL,
 "opponent_id" uuid,
 "opponent_name" text NOT NULL,
 "room_id" uuid NOT NULL,
 "round_number" integer NOT NULL,
 "outcome" text NOT NULL,
 "my_score" smallint NOT NULL,
 "opponent_score" smallint NOT NULL,
 "finished_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."go_pvp_rooms" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "invite_code" text NOT NULL,
 "host_id" uuid NOT NULL,
 "guest_id" uuid,
 "status" text DEFAULT 'waiting'::text NOT NULL,
 "round_number" integer DEFAULT 1 NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "invite_expires_at" timestamp with time zone DEFAULT (now() + '00:30:00'::interval) NOT NULL,
 "joined_at" timestamp with time zone,
 "ready_deadline" timestamp with time zone,
 "host_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
 "guest_seen_at" timestamp with time zone,
 "host_rematch" boolean DEFAULT false NOT NULL,
 "guest_rematch" boolean DEFAULT false NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."go_pvp_rounds" (
 "room_id" uuid NOT NULL,
 "round_number" integer NOT NULL,
 "host_card" jsonb,
 "guest_card" jsonb,
 "host_ready" boolean DEFAULT false NOT NULL,
 "guest_ready" boolean DEFAULT false NOT NULL,
 "winner" text,
 "host_score" smallint,
 "guest_score" smallint,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "finished_at" timestamp with time zone
);

ALTER TABLE public."dogs" ADD CONSTRAINT "dogs_pkey" PRIMARY KEY (id);

ALTER TABLE public."go_affinity" ADD CONSTRAINT "go_affinity_pkey" PRIMARY KEY (member_id, dog_id);

ALTER TABLE public."go_affinity" ADD CONSTRAINT "go_affinity_level_check" CHECK (((level >= 0) AND (level <= 10)));

ALTER TABLE public."go_battle_card_stats" ADD CONSTRAINT "go_battle_card_stats_pkey" PRIMARY KEY (card_id);

ALTER TABLE public."go_battle_card_stats" ADD CONSTRAINT "go_battle_card_stats_element_check" CHECK ((element = ANY (ARRAY['햇살'::text, '숲'::text, '물결'::text, '별빛'::text, '온기'::text, '꿈결'::text])));

ALTER TABLE public."go_battle_card_stats" ADD CONSTRAINT "go_battle_card_stats_charm_check" CHECK (((charm >= 1) AND (charm <= 5)));

ALTER TABLE public."go_battle_card_stats" ADD CONSTRAINT "go_battle_card_stats_power_check" CHECK (((power >= 1) AND (power <= 5)));

ALTER TABLE public."go_battles" ADD CONSTRAINT "go_battles_pkey" PRIMARY KEY (id);

ALTER TABLE public."go_battles" ADD CONSTRAINT "go_battles_first_bonus_check" CHECK ((first_bonus = ANY (ARRAY[0, 2])));

ALTER TABLE public."go_battles" ADD CONSTRAINT "go_battles_check" CHECK ((first_card_id <> second_card_id));

ALTER TABLE public."go_battles" ADD CONSTRAINT "go_battles_check1" CHECK ((first_dog_id <> second_dog_id));

ALTER TABLE public."go_battles" ADD CONSTRAINT "go_battles_first_charm_check" CHECK (((first_charm >= 1) AND (first_charm <= 5)));

ALTER TABLE public."go_battles" ADD CONSTRAINT "go_battles_first_power_check" CHECK (((first_power >= 1) AND (first_power <= 5)));

ALTER TABLE public."go_battles" ADD CONSTRAINT "go_battles_second_bonus_check" CHECK ((second_bonus = ANY (ARRAY[0, 2])));

ALTER TABLE public."go_battles" ADD CONSTRAINT "go_battles_second_charm_check" CHECK (((second_charm >= 1) AND (second_charm <= 5)));

ALTER TABLE public."go_battles" ADD CONSTRAINT "go_battles_second_power_check" CHECK (((second_power >= 1) AND (second_power <= 5)));

ALTER TABLE public."go_battles" ADD CONSTRAINT "go_battles_winner_check" CHECK ((winner = ANY (ARRAY['first'::text, 'second'::text, 'draw'::text])));

ALTER TABLE public."go_cards" ADD CONSTRAINT "go_cards_image_path_key" UNIQUE (image_path);

ALTER TABLE public."go_cards" ADD CONSTRAINT "go_cards_pkey" PRIMARY KEY (id);

ALTER TABLE public."go_cards" ADD CONSTRAINT "go_cards_affection_check" CHECK (((affection >= 1) AND (affection <= 5)));

ALTER TABLE public."go_cards" ADD CONSTRAINT "go_cards_charm_check" CHECK (((charm >= 1) AND (charm <= 5)));

ALTER TABLE public."go_cards" ADD CONSTRAINT "go_cards_cuteness_check" CHECK (((cuteness >= 1) AND (cuteness <= 5)));

ALTER TABLE public."go_cards" ADD CONSTRAINT "go_cards_description_check" CHECK ((char_length(description) <= 200));

ALTER TABLE public."go_cards" ADD CONSTRAINT "go_cards_photo_style_check" CHECK ((photo_style = ANY (ARRAY['original'::text, 'cutout'::text])));

ALTER TABLE public."go_cards" ADD CONSTRAINT "go_cards_share_count_check" CHECK ((share_count >= 0));

ALTER TABLE public."go_cards" ADD CONSTRAINT "go_cards_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'hidden'::text])));

ALTER TABLE public."go_cards" ADD CONSTRAINT "go_rejection_note" CHECK (((rejection_note IS NULL) OR (char_length(rejection_note) <= 300)));

ALTER TABLE public."go_cards" ADD CONSTRAINT "go_rejection_reason" CHECK (((rejection_reason IS NULL) OR (rejection_reason = ANY (ARRAY['no_dog'::text, 'wrong_dog'::text, 'privacy'::text, 'quality'::text, 'inappropriate'::text, 'other'::text]))));

ALTER TABLE public."go_cards" ADD CONSTRAINT "go_title_length" CHECK ((char_length(title) <= 80));

ALTER TABLE public."go_coin_transactions" ADD CONSTRAINT "go_coin_transactions_member_id_source_key_key" UNIQUE (member_id, source_key);

ALTER TABLE public."go_coin_transactions" ADD CONSTRAINT "go_coin_transactions_pkey" PRIMARY KEY (id);

ALTER TABLE public."go_coin_transactions" ADD CONSTRAINT "go_coin_transactions_event_type_check" CHECK ((event_type = ANY (ARRAY['care'::text, 'quest_care'::text, 'quest_visit'::text, 'visit_reversal'::text, 'store_purchase'::text, 'quest_draw'::text, 'quest_battle'::text])));

ALTER TABLE public."go_coin_transactions" ADD CONSTRAINT "go_coin_transactions_amount_check" CHECK ((amount <> 0));

ALTER TABLE public."go_coin_transactions" ADD CONSTRAINT "go_coin_transactions_source_key_check" CHECK (((length(source_key) >= 1) AND (length(source_key) <= 200)));

ALTER TABLE public."go_coin_wallets" ADD CONSTRAINT "go_coin_wallets_pkey" PRIMARY KEY (member_id);

ALTER TABLE public."go_coin_wallets" ADD CONSTRAINT "go_coin_wallets_balance_check" CHECK ((balance >= 0));

ALTER TABLE public."go_interactions" ADD CONSTRAINT "go_interactions_pkey" PRIMARY KEY (id);

ALTER TABLE public."go_interactions" ADD CONSTRAINT "go_interactions_action_check" CHECK ((action = ANY (ARRAY['snack'::text, 'praise'::text, 'play'::text])));

ALTER TABLE public."go_members" ADD CONSTRAINT "go_members_google_sub_key" UNIQUE (google_sub);

ALTER TABLE public."go_members" ADD CONSTRAINT "go_members_nickname_key_key" UNIQUE (nickname_key);

ALTER TABLE public."go_members" ADD CONSTRAINT "go_members_pkey" PRIMARY KEY (id);

ALTER TABLE public."go_members" ADD CONSTRAINT "go_members_google_sub_check" CHECK ((google_sub ~ '^[0-9]{1,255}$'::text));

ALTER TABLE public."go_members" ADD CONSTRAINT "go_members_avatar_dog_check" CHECK (((avatar_dog IS NULL) OR (avatar_dog = ANY (ARRAY['깡지'::text, '버디'::text, '뽀실'::text, '구름'::text, '오레오'::text]))));

ALTER TABLE public."go_members" ADD CONSTRAINT "go_members_profile_bio_check" CHECK ((char_length(profile_bio) <= 100));

ALTER TABLE public."go_members" ADD CONSTRAINT "go_nickname_length" CHECK (((char_length(nickname) >= 2) AND (char_length(nickname) <= 14)));

ALTER TABLE public."go_official_assets" ADD CONSTRAINT "go_official_assets_pkey" PRIMARY KEY (version_id, slot);

ALTER TABLE public."go_official_assets" ADD CONSTRAINT "go_official_assets_display_path_check" CHECK (((length(display_path) >= 4) AND (length(display_path) <= 400)));

ALTER TABLE public."go_official_assets" ADD CONSTRAINT "go_official_assets_check" CHECK (((slot = 6) OR ((length(TRIM(BOTH FROM title)) >= 1) AND (length(TRIM(BOTH FROM title)) <= 30))));

ALTER TABLE public."go_official_assets" ADD CONSTRAINT "go_official_assets_crop_x_check" CHECK (((crop_x >= (0)::numeric) AND (crop_x <= (1)::numeric)));

ALTER TABLE public."go_official_assets" ADD CONSTRAINT "go_official_assets_crop_y_check" CHECK (((crop_y >= (0)::numeric) AND (crop_y <= (1)::numeric)));

ALTER TABLE public."go_official_assets" ADD CONSTRAINT "go_official_assets_original_path_check" CHECK (((length(original_path) >= 4) AND (length(original_path) <= 400)));

ALTER TABLE public."go_official_assets" ADD CONSTRAINT "go_official_assets_slot_check" CHECK (((slot >= 1) AND (slot <= 6)));

ALTER TABLE public."go_official_assets" ADD CONSTRAINT "go_official_assets_title_check" CHECK ((char_length(title) <= 30));

ALTER TABLE public."go_official_assets" ADD CONSTRAINT "go_official_assets_zoom_check" CHECK (((zoom >= (1)::numeric) AND (zoom <= (3)::numeric)));

ALTER TABLE public."go_official_daily_draws" ADD CONSTRAINT "go_official_daily_draws_pkey" PRIMARY KEY (member_id, local_day);

ALTER TABLE public."go_official_daily_draws" ADD CONSTRAINT "go_official_daily_draws_slot_check" CHECK (((slot >= 1) AND (slot <= 5)));

ALTER TABLE public."go_official_daily_draws" ADD CONSTRAINT "go_official_daily_draws_check" CHECK (((NOT duplicate) OR ((proposed_power IS NOT NULL) AND (proposed_charm IS NOT NULL))));

ALTER TABLE public."go_official_daily_draws" ADD CONSTRAINT "go_official_daily_draws_proposed_charm_check" CHECK (((proposed_charm >= 1) AND (proposed_charm <= 5)));

ALTER TABLE public."go_official_daily_draws" ADD CONSTRAINT "go_official_daily_draws_proposed_power_check" CHECK (((proposed_power >= 1) AND (proposed_power <= 5)));

ALTER TABLE public."go_official_hidden" ADD CONSTRAINT "go_official_hidden_pkey" PRIMARY KEY (member_id, dog_id);

ALTER TABLE public."go_official_issuance_markers" ADD CONSTRAINT "go_official_issuance_markers_pkey" PRIMARY KEY (dog_id);

ALTER TABLE public."go_official_owned" ADD CONSTRAINT "go_official_owned_pkey" PRIMARY KEY (member_id, dog_id, slot);

ALTER TABLE public."go_official_owned" ADD CONSTRAINT "go_official_owned_power_check" CHECK (((power >= 1) AND (power <= 5)));

ALTER TABLE public."go_official_owned" ADD CONSTRAINT "go_official_owned_charm_check" CHECK (((charm >= 1) AND (charm <= 5)));

ALTER TABLE public."go_official_owned" ADD CONSTRAINT "go_official_owned_slot_check" CHECK (((slot >= 1) AND (slot <= 5)));

ALTER TABLE public."go_official_purchases" ADD CONSTRAINT "go_official_purchases_pkey" PRIMARY KEY (member_id, request_id);

ALTER TABLE public."go_official_purchases" ADD CONSTRAINT "go_official_purchases_coins_check" CHECK ((coins = 200));

ALTER TABLE public."go_official_purchases" ADD CONSTRAINT "go_official_purchases_slot_check" CHECK (((slot >= 1) AND (slot <= 5)));

ALTER TABLE public."go_official_sets" ADD CONSTRAINT "go_official_sets_pkey" PRIMARY KEY (dog_id);

ALTER TABLE public."go_official_versions" ADD CONSTRAINT "go_official_versions_id_dog_id_key" UNIQUE (id, dog_id);

ALTER TABLE public."go_official_versions" ADD CONSTRAINT "go_official_versions_pkey" PRIMARY KEY (id);

ALTER TABLE public."go_official_versions" ADD CONSTRAINT "go_official_versions_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'retired'::text])));

ALTER TABLE public."go_pvp_records" ADD CONSTRAINT "go_pvp_records_member_id_room_id_round_number_key" UNIQUE (member_id, room_id, round_number);

ALTER TABLE public."go_pvp_records" ADD CONSTRAINT "go_pvp_records_pkey" PRIMARY KEY (id);

ALTER TABLE public."go_pvp_records" ADD CONSTRAINT "go_pvp_records_outcome_check" CHECK ((outcome = ANY (ARRAY['win'::text, 'draw'::text, 'loss'::text])));

ALTER TABLE public."go_pvp_records" ADD CONSTRAINT "go_pvp_records_my_score_check" CHECK (((my_score >= 2) AND (my_score <= 10)));

ALTER TABLE public."go_pvp_records" ADD CONSTRAINT "go_pvp_records_opponent_score_check" CHECK (((opponent_score >= 2) AND (opponent_score <= 10)));

ALTER TABLE public."go_pvp_records" ADD CONSTRAINT "go_pvp_records_round_number_check" CHECK ((round_number >= 1));

ALTER TABLE public."go_pvp_rooms" ADD CONSTRAINT "go_pvp_rooms_invite_code_key" UNIQUE (invite_code);

ALTER TABLE public."go_pvp_rooms" ADD CONSTRAINT "go_pvp_rooms_pkey" PRIMARY KEY (id);

ALTER TABLE public."go_pvp_rooms" ADD CONSTRAINT "go_pvp_rooms_invite_code_check" CHECK ((invite_code ~ '^[A-F0-9]{12}$'::text));

ALTER TABLE public."go_pvp_rooms" ADD CONSTRAINT "go_pvp_rooms_check" CHECK (((guest_id IS NULL) OR (guest_id <> host_id)));

ALTER TABLE public."go_pvp_rooms" ADD CONSTRAINT "go_pvp_rooms_round_number_check" CHECK ((round_number >= 1));

ALTER TABLE public."go_pvp_rooms" ADD CONSTRAINT "go_pvp_rooms_status_check" CHECK ((status = ANY (ARRAY['waiting'::text, 'playing'::text, 'completed'::text, 'cancelled'::text])));

ALTER TABLE public."go_pvp_rounds" ADD CONSTRAINT "go_pvp_rounds_pkey" PRIMARY KEY (room_id, round_number);

ALTER TABLE public."go_pvp_rounds" ADD CONSTRAINT "go_pvp_rounds_guest_score_check" CHECK (((guest_score >= 2) AND (guest_score <= 10)));

ALTER TABLE public."go_pvp_rounds" ADD CONSTRAINT "go_pvp_rounds_host_score_check" CHECK (((host_score >= 2) AND (host_score <= 10)));

ALTER TABLE public."go_pvp_rounds" ADD CONSTRAINT "go_pvp_rounds_check" CHECK ((((winner IS NULL) AND (finished_at IS NULL)) OR ((winner IS NOT NULL) AND (finished_at IS NOT NULL) AND (host_score IS NOT NULL) AND (guest_score IS NOT NULL))));

ALTER TABLE public."go_pvp_rounds" ADD CONSTRAINT "go_pvp_rounds_round_number_check" CHECK ((round_number >= 1));

ALTER TABLE public."go_pvp_rounds" ADD CONSTRAINT "go_pvp_rounds_winner_check" CHECK ((winner = ANY (ARRAY['host'::text, 'guest'::text, 'draw'::text])));

ALTER TABLE public."go_affinity" ADD CONSTRAINT "go_affinity_dog_id_fkey" FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE CASCADE;

ALTER TABLE public."go_affinity" ADD CONSTRAINT "go_affinity_member_id_fkey" FOREIGN KEY (member_id) REFERENCES go_members(id) ON DELETE CASCADE;

ALTER TABLE public."go_battle_card_stats" ADD CONSTRAINT "go_battle_card_stats_dog_id_fkey" FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE CASCADE;

ALTER TABLE public."go_battle_card_stats" ADD CONSTRAINT "go_battle_card_stats_card_id_fkey" FOREIGN KEY (card_id) REFERENCES go_cards(id) ON DELETE CASCADE;

ALTER TABLE public."go_battles" ADD CONSTRAINT "go_battles_member_id_fkey" FOREIGN KEY (member_id) REFERENCES go_members(id) ON DELETE CASCADE;

ALTER TABLE public."go_cards" ADD CONSTRAINT "go_cards_dog_id_fkey" FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE RESTRICT;

ALTER TABLE public."go_cards" ADD CONSTRAINT "go_cards_member_id_fkey" FOREIGN KEY (member_id) REFERENCES go_members(id) ON DELETE CASCADE;

ALTER TABLE public."go_coin_transactions" ADD CONSTRAINT "go_coin_transactions_member_id_fkey" FOREIGN KEY (member_id) REFERENCES go_members(id) ON DELETE CASCADE;

ALTER TABLE public."go_coin_wallets" ADD CONSTRAINT "go_coin_wallets_member_id_fkey" FOREIGN KEY (member_id) REFERENCES go_members(id) ON DELETE CASCADE;

ALTER TABLE public."go_interactions" ADD CONSTRAINT "go_interactions_member_id_fkey" FOREIGN KEY (member_id) REFERENCES go_members(id) ON DELETE CASCADE;

ALTER TABLE public."go_interactions" ADD CONSTRAINT "go_interactions_dog_id_fkey" FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE CASCADE;

ALTER TABLE public."go_official_assets" ADD CONSTRAINT "go_official_assets_version_id_fkey" FOREIGN KEY (version_id) REFERENCES go_official_versions(id) ON DELETE CASCADE;

ALTER TABLE public."go_official_daily_draws" ADD CONSTRAINT "go_official_daily_draws_dog_id_fkey" FOREIGN KEY (dog_id) REFERENCES go_official_sets(dog_id) ON DELETE RESTRICT;

ALTER TABLE public."go_official_daily_draws" ADD CONSTRAINT "go_official_daily_draws_member_id_fkey" FOREIGN KEY (member_id) REFERENCES go_members(id) ON DELETE CASCADE;

ALTER TABLE public."go_official_hidden" ADD CONSTRAINT "go_official_hidden_dog_id_fkey" FOREIGN KEY (dog_id) REFERENCES go_official_sets(dog_id) ON DELETE RESTRICT;

ALTER TABLE public."go_official_hidden" ADD CONSTRAINT "go_official_hidden_member_id_fkey" FOREIGN KEY (member_id) REFERENCES go_members(id) ON DELETE CASCADE;

ALTER TABLE public."go_official_issuance_markers" ADD CONSTRAINT "go_official_issuance_markers_dog_id_fkey" FOREIGN KEY (dog_id) REFERENCES go_official_sets(dog_id) ON DELETE RESTRICT;

ALTER TABLE public."go_official_owned" ADD CONSTRAINT "go_official_owned_dog_id_fkey" FOREIGN KEY (dog_id) REFERENCES go_official_sets(dog_id) ON DELETE RESTRICT;

ALTER TABLE public."go_official_owned" ADD CONSTRAINT "go_official_owned_member_id_fkey" FOREIGN KEY (member_id) REFERENCES go_members(id) ON DELETE CASCADE;

ALTER TABLE public."go_official_purchases" ADD CONSTRAINT "go_official_purchases_member_id_fkey" FOREIGN KEY (member_id) REFERENCES go_members(id) ON DELETE CASCADE;

ALTER TABLE public."go_official_purchases" ADD CONSTRAINT "go_official_purchases_dog_id_fkey" FOREIGN KEY (dog_id) REFERENCES go_official_sets(dog_id) ON DELETE RESTRICT;

ALTER TABLE public."go_official_sets" ADD CONSTRAINT "go_official_current_version_fk" FOREIGN KEY (current_version, dog_id) REFERENCES go_official_versions(id, dog_id) DEFERRABLE;

ALTER TABLE public."go_official_sets" ADD CONSTRAINT "go_official_sets_dog_id_fkey" FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE RESTRICT;

ALTER TABLE public."go_official_versions" ADD CONSTRAINT "go_official_versions_dog_id_fkey" FOREIGN KEY (dog_id) REFERENCES go_official_sets(dog_id) ON DELETE CASCADE;

ALTER TABLE public."go_pvp_records" ADD CONSTRAINT "go_pvp_records_member_id_fkey" FOREIGN KEY (member_id) REFERENCES go_members(id) ON DELETE CASCADE;

ALTER TABLE public."go_pvp_records" ADD CONSTRAINT "go_pvp_records_opponent_id_fkey" FOREIGN KEY (opponent_id) REFERENCES go_members(id) ON DELETE SET NULL;

ALTER TABLE public."go_pvp_rooms" ADD CONSTRAINT "go_pvp_rooms_guest_id_fkey" FOREIGN KEY (guest_id) REFERENCES go_members(id) ON DELETE SET NULL;

ALTER TABLE public."go_pvp_rooms" ADD CONSTRAINT "go_pvp_rooms_host_id_fkey" FOREIGN KEY (host_id) REFERENCES go_members(id) ON DELETE CASCADE;

ALTER TABLE public."go_pvp_rounds" ADD CONSTRAINT "go_pvp_rounds_room_id_fkey" FOREIGN KEY (room_id) REFERENCES go_pvp_rooms(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.go_battle_random_rating()
 RETURNS smallint
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
 SELECT CASE WHEN v < 0.1 THEN 1 WHEN v < 0.3 THEN 2
             WHEN v < 0.7 THEN 3 WHEN v < 0.9 THEN 4 ELSE 5 END::smallint
 FROM (SELECT random() AS v) AS draw;
$function$;
