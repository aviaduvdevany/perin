** TABLES

```sql 
-- public.idempotency_keys definition

-- Drop table

-- DROP TABLE public.idempotency_keys;

CREATE TABLE public.idempotency_keys (
	"key" text NOT NULL,
	"scope" text NOT NULL,
	status text DEFAULT 'used'::text NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT idempotency_keys_pkey PRIMARY KEY (key)
);


-- public.users definition

-- Drop table

-- DROP TABLE public.users;

CREATE TABLE public.users (
	id text DEFAULT gen_random_uuid() NOT NULL,
	email text NOT NULL,
	email_verified timestamptz NULL,
	hashed_password text NULL,
	"name" text NULL,
	image text NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	perin_name text DEFAULT 'Perin'::text NULL,
	tone text NULL,
	avatar_url text NULL,
	preferred_hours jsonb NULL,
	timezone text DEFAULT 'UTC'::text NULL,
	memory jsonb DEFAULT '{}'::jsonb NULL,
	is_beta_user bool DEFAULT false NULL,
	"role" text DEFAULT 'user'::text NULL,
	CONSTRAINT users_email_key UNIQUE (email),
	CONSTRAINT users_pkey PRIMARY KEY (id),
	CONSTRAINT users_timezone_valid CHECK (((timezone IS NULL) OR is_valid_iana_timezone(timezone)))
);


-- public.audit_logs definition

-- Drop table

-- DROP TABLE public.audit_logs;

CREATE TABLE public.audit_logs (
	id text DEFAULT gen_random_uuid() NOT NULL,
	user_id text NOT NULL,
	"action" text NOT NULL,
	resource_type text NOT NULL,
	resource_id text NOT NULL,
	details jsonb NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
	CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs USING btree (resource_type, resource_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);


-- public.notification_devices definition

-- Drop table

-- DROP TABLE public.notification_devices;

CREATE TABLE public.notification_devices (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	user_id text NOT NULL,
	platform text NOT NULL,
	onesignal_player_id text NOT NULL,
	device_info jsonb NULL,
	is_active bool DEFAULT true NOT NULL,
	last_seen_at timestamptz NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT notification_devices_pkey PRIMARY KEY (id),
	CONSTRAINT notification_devices_platform_check CHECK ((platform = ANY (ARRAY['web'::text, 'ios'::text, 'android'::text]))),
	CONSTRAINT uq_notification_device UNIQUE (user_id, platform, onesignal_player_id),
	CONSTRAINT notification_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_notification_devices_player ON public.notification_devices USING btree (onesignal_player_id);
CREATE INDEX idx_notification_devices_user_active ON public.notification_devices USING btree (user_id, is_active);


-- public.notification_preferences definition

-- Drop table

-- DROP TABLE public.notification_preferences;

CREATE TABLE public.notification_preferences (
	user_id text NOT NULL,
	timezone text NULL,
	dnd jsonb NULL,
	channels jsonb NULL,
	digest jsonb NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT notification_preferences_pkey PRIMARY KEY (user_id),
	CONSTRAINT notification_preferences_timezone_valid CHECK (((timezone IS NULL) OR is_valid_iana_timezone(timezone))),
	CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);


-- public.notifications definition

-- Drop table

-- DROP TABLE public.notifications;

CREATE TABLE public.notifications (
	id text DEFAULT gen_random_uuid() NOT NULL,
	user_id text NOT NULL,
	"type" text NOT NULL,
	title text NOT NULL,
	body text NULL,
	"data" jsonb NULL,
	is_read bool DEFAULT false NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	requires_action bool DEFAULT false NOT NULL,
	is_resolved bool DEFAULT false NOT NULL,
	resolved_at timestamptz NULL,
	action_deadline_at timestamptz NULL,
	action_ref jsonb NULL,
	CONSTRAINT notifications_pkey PRIMARY KEY (id),
	CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_user_created_at ON public.notifications USING btree (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_requires_action ON public.notifications USING btree (user_id) WHERE (requires_action = true);
CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id) WHERE (is_read = false);
CREATE INDEX idx_notifications_user_unresolved ON public.notifications USING btree (user_id) WHERE (is_resolved = false);


-- public.user_connections definition

-- Drop table

-- DROP TABLE public.user_connections;

CREATE TABLE public.user_connections (
	id text DEFAULT gen_random_uuid() NOT NULL,
	requester_user_id text NOT NULL,
	target_user_id text NOT NULL,
	status text DEFAULT 'pending'::text NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT user_connections_pkey PRIMARY KEY (id),
	CONSTRAINT user_connections_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'revoked'::text]))),
	CONSTRAINT user_connections_requester_user_id_fkey FOREIGN KEY (requester_user_id) REFERENCES public.users(id) ON DELETE CASCADE,
	CONSTRAINT user_connections_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_user_connections_target ON public.user_connections USING btree (target_user_id);
CREATE INDEX idx_user_connections_user ON public.user_connections USING btree (requester_user_id);


-- public.user_integrations definition

-- Drop table

-- DROP TABLE public.user_integrations;

CREATE TABLE public.user_integrations (
	id text DEFAULT gen_random_uuid() NOT NULL,
	user_id text NOT NULL,
	integration_type text NOT NULL,
	access_token text NOT NULL,
	refresh_token text NULL,
	token_expires_at timestamptz NULL,
	scopes _text NULL,
	connected_at timestamptz DEFAULT now() NOT NULL,
	last_sync_at timestamptz NULL,
	is_active bool DEFAULT true NULL,
	metadata jsonb DEFAULT '{}'::jsonb NULL,
	account_email text NULL,
	account_label text NULL,
	CONSTRAINT user_integrations_pkey PRIMARY KEY (id),
	CONSTRAINT user_integrations_user_type_email_key UNIQUE (user_id, integration_type, account_email),
	CONSTRAINT user_integrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_user_integrations_account_email ON public.user_integrations USING btree (account_email);
CREATE INDEX idx_user_integrations_type ON public.user_integrations USING btree (integration_type);
CREATE INDEX idx_user_integrations_user_id ON public.user_integrations USING btree (user_id);


-- public.agent_sessions definition

-- Drop table

-- DROP TABLE public.agent_sessions;

CREATE TABLE public.agent_sessions (
	id text DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	initiator_user_id text NOT NULL,
	counterpart_user_id text NOT NULL,
	connection_id text NOT NULL,
	status text NOT NULL,
	ttl_expires_at timestamptz NOT NULL,
	outcome jsonb NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT agent_sessions_pkey PRIMARY KEY (id),
	CONSTRAINT agent_sessions_status_check CHECK ((status = ANY (ARRAY['initiated'::text, 'negotiating'::text, 'awaiting_confirmation'::text, 'confirmed'::text, 'canceled'::text, 'expired'::text, 'error'::text]))),
	CONSTRAINT agent_sessions_type_check CHECK ((type = ANY (ARRAY['schedule_meeting'::text, 'proposal_only'::text]))),
	CONSTRAINT agent_sessions_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.user_connections(id) ON DELETE CASCADE,
	CONSTRAINT agent_sessions_counterpart_user_id_fkey FOREIGN KEY (counterpart_user_id) REFERENCES public.users(id) ON DELETE CASCADE,
	CONSTRAINT agent_sessions_initiator_user_id_fkey FOREIGN KEY (initiator_user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_agent_sessions_conn ON public.agent_sessions USING btree (connection_id);
CREATE INDEX idx_agent_sessions_users ON public.agent_sessions USING btree (initiator_user_id, counterpart_user_id);


-- public.connection_permissions definition

-- Drop table

-- DROP TABLE public.connection_permissions;

CREATE TABLE public.connection_permissions (
	id text DEFAULT gen_random_uuid() NOT NULL,
	connection_id text NOT NULL,
	scopes _text DEFAULT '{}'::text[] NOT NULL,
	"constraints" jsonb DEFAULT '{}'::jsonb NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT connection_permissions_connection_id_key UNIQUE (connection_id),
	CONSTRAINT connection_permissions_pkey PRIMARY KEY (id),
	CONSTRAINT connection_permissions_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.user_connections(id) ON DELETE CASCADE
);


-- public.notification_deliveries definition

-- Drop table

-- DROP TABLE public.notification_deliveries;

CREATE TABLE public.notification_deliveries (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	notification_id text NOT NULL,
	channel text NOT NULL,
	status text NOT NULL,
	provider_message_id text NULL,
	"error" text NULL,
	attempts int4 DEFAULT 0 NOT NULL,
	last_attempt_at timestamptz NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT notification_deliveries_channel_check CHECK ((channel = ANY (ARRAY['mobile_push'::text, 'web_push'::text, 'email'::text, 'sms'::text, 'in_app'::text]))),
	CONSTRAINT notification_deliveries_pkey PRIMARY KEY (id),
	CONSTRAINT notification_deliveries_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'sent'::text, 'delivered'::text, 'failed'::text]))),
	CONSTRAINT notification_deliveries_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE
);
CREATE INDEX idx_notification_deliveries_channel ON public.notification_deliveries USING btree (channel);
CREATE INDEX idx_notification_deliveries_notification ON public.notification_deliveries USING btree (notification_id);
CREATE INDEX idx_notification_deliveries_status ON public.notification_deliveries USING btree (status);


-- public.agent_messages definition

-- Drop table

-- DROP TABLE public.agent_messages;

CREATE TABLE public.agent_messages (
	id text DEFAULT gen_random_uuid() NOT NULL,
	session_id text NOT NULL,
	from_user_id text NOT NULL,
	to_user_id text NOT NULL,
	"type" text NOT NULL,
	payload jsonb NOT NULL,
	dedupe_key text NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT agent_messages_pkey PRIMARY KEY (id),
	CONSTRAINT agent_messages_type_check CHECK ((type = ANY (ARRAY['proposal'::text, 'accept'::text, 'confirm'::text, 'cancel'::text, 'error'::text]))),
	CONSTRAINT agent_messages_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.users(id) ON DELETE CASCADE,
	CONSTRAINT agent_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
	CONSTRAINT agent_messages_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_agent_messages_session ON public.agent_messages USING btree (session_id, created_at);
CREATE UNIQUE INDEX ux_agent_messages_dedupe ON public.agent_messages USING btree (session_id, dedupe_key) WHERE (dedupe_key IS NOT NULL);

```

** INDEXES

```sql 
CREATE UNIQUE INDEX agent_messages_pkey ON public.agent_messages USING btree (id);

CREATE INDEX idx_agent_messages_session ON public.agent_messages USING btree (session_id, created_at);

CREATE UNIQUE INDEX ux_agent_messages_dedupe ON public.agent_messages USING btree (session_id, dedupe_key) WHERE (dedupe_key IS NOT NULL);

CREATE UNIQUE INDEX agent_sessions_pkey ON public.agent_sessions USING btree (id);

CREATE INDEX idx_agent_sessions_conn ON public.agent_sessions USING btree (connection_id);

CREATE INDEX idx_agent_sessions_users ON public.agent_sessions USING btree (initiator_user_id, counterpart_user_id);

CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);

CREATE INDEX idx_audit_logs_resource ON public.audit_logs USING btree (resource_type, resource_id);

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);

CREATE UNIQUE INDEX connection_permissions_connection_id_key ON public.connection_permissions USING btree (connection_id);

CREATE UNIQUE INDEX connection_permissions_pkey ON public.connection_permissions USING btree (id);

CREATE UNIQUE INDEX idempotency_keys_pkey ON public.idempotency_keys USING btree (key);

CREATE INDEX idx_notification_deliveries_channel ON public.notification_deliveries USING btree (channel);

CREATE INDEX idx_notification_deliveries_notification ON public.notification_deliveries USING btree (notification_id);

CREATE INDEX idx_notification_deliveries_status ON public.notification_deliveries USING btree (status);

CREATE UNIQUE INDEX notification_deliveries_pkey ON public.notification_deliveries USING btree (id);

CREATE INDEX idx_notification_devices_player ON public.notification_devices USING btree (onesignal_player_id);

CREATE INDEX idx_notification_devices_user_active ON public.notification_devices USING btree (user_id, is_active);

CREATE UNIQUE INDEX notification_devices_pkey ON public.notification_devices USING btree (id);

CREATE UNIQUE INDEX uq_notification_device ON public.notification_devices USING btree (user_id, platform, onesignal_player_id);

CREATE UNIQUE INDEX notification_preferences_pkey ON public.notification_preferences USING btree (user_id);

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id, is_read, created_at DESC);

CREATE INDEX idx_notifications_user_created_at ON public.notifications USING btree (user_id, created_at DESC);

CREATE INDEX idx_notifications_user_requires_action ON public.notifications USING btree (user_id) WHERE (requires_action = true);

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id) WHERE (is_read = false);

CREATE INDEX idx_notifications_user_unresolved ON public.notifications USING btree (user_id) WHERE (is_resolved = false);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE INDEX idx_user_connections_target ON public.user_connections USING btree (target_user_id);

CREATE INDEX idx_user_connections_user ON public.user_connections USING btree (requester_user_id);

CREATE UNIQUE INDEX user_connections_pkey ON public.user_connections USING btree (id);

CREATE INDEX idx_user_integrations_account_email ON public.user_integrations USING btree (account_email);

CREATE INDEX idx_user_integrations_type ON public.user_integrations USING btree (integration_type);

CREATE INDEX idx_user_integrations_user_id ON public.user_integrations USING btree (user_id);

CREATE UNIQUE INDEX user_integrations_pkey ON public.user_integrations USING btree (id);

CREATE UNIQUE INDEX user_integrations_user_type_email_key ON public.user_integrations USING btree (user_id, integration_type, account_email);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);
```

