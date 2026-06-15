-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.chat_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_full_name text NOT NULL,
  category text NOT NULL,
  brief_description text NOT NULL,
  status text NOT NULL DEFAULT 'waiting'::text CHECK (status = ANY (ARRAY['waiting'::text, 'accepted'::text, 'closed'::text])),
  assigned_agent_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  closed_at timestamp with time zone,
  accepted_at timestamp with time zone,
  CONSTRAINT chat_sessions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid,
  sender_type text NOT NULL CHECK (sender_type = ANY (ARRAY['customer'::text, 'agent'::text, 'system'::text])),
  sender_id text,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id)
);
CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tracking_code text NOT NULL UNIQUE,
  customer_full_name text NOT NULL CHECK (char_length(customer_full_name) >= 1 AND char_length(customer_full_name) <= 100),
  category text NOT NULL CHECK (char_length(category) >= 1 AND char_length(category) <= 80),
  priority text NOT NULL DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])),
  subject text NOT NULL CHECK (char_length(subject) >= 1 AND char_length(subject) <= 150),
  description text NOT NULL CHECK (char_length(description) >= 1 AND char_length(description) <= 2000),
  status text NOT NULL DEFAULT 'submitted'::text CHECK (status = ANY (ARRAY['submitted'::text, 'accepted'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text])),
  assigned_agent_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  accepted_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  closed_at timestamp with time zone,
  CONSTRAINT support_tickets_pkey PRIMARY KEY (id)
);
CREATE TABLE public.support_ticket_replies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  tracking_code text NOT NULL,
  sender_type text NOT NULL DEFAULT 'agent'::text CHECK (sender_type = ANY (ARRAY['customer'::text, 'agent'::text, 'system'::text])),
  sender_id text,
  sender_name text NOT NULL CHECK (char_length(sender_name) >= 1 AND char_length(sender_name) <= 100),
  message text NOT NULL CHECK (char_length(message) >= 1 AND char_length(message) <= 4000),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT support_ticket_replies_pkey PRIMARY KEY (id),
  CONSTRAINT support_ticket_replies_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id)
);