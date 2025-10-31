🏛️ Government Grants Portal

A Next.js + Supabase–powered, SEO-optimized grant discovery platform for public, private, and nonprofit funding opportunities.

📖 Project Description

The Government Grants Portal is a modern, open-source grant aggregation and discovery system designed to make funding opportunities accessible, searchable, and indexable by both users and search engines.

Built with Next.js 15, Supabase, and Edge Functions, the platform automatically scrapes official government and verified funding websites (e.g., Grants.gov, USGrants.org, state programs) and organizes the data into a structured, searchable database.

It focuses on transparency, accessibility, and performance — surfacing real-time structured data in a user-friendly interface optimized for SEO and discoverability.

🧩 End-to-End Data Pipeline
🕸️ Scraping Layer (Supabase Edge Functions)

Automated functions fetch and refresh grant data daily.
Each source’s configuration stores its own CSS selectors and extraction logic, allowing rapid onboarding of new agencies, states, or organizations.

💾 Storage Layer (Supabase Database)

Parsed grants are stored in a normalized schema (grants, scrape_sources, scrape_logs).
Deduplication and hashing ensure clean updates.
Summaries, categories, and opportunity identifiers are enriched by AI and external APIs.

💡 Presentation Layer (Next.js Frontend)

A fast, responsive frontend enables visitors to:

Search and filter grants by category, location, funding type, or department

Read concise summaries and full descriptions

Browse related opportunities by tag or agency

Each posting is assigned a canonical, keyword-rich URL for maximum SEO impact.

🌐 Core Features
Feature	Description
🔍 Smart Search & Filters	Real-time filtering by title, category, department, or location
⚙️ Automated Scraping	Supabase Edge Functions fetch and refresh listings daily
🧠 AI Summarization	OpenAI generates short, human-readable summaries from long descriptions
🏷️ SEO-Optimized Routing	Clean URLs like /grants/education/california/school-infrastructure-funding-abc123
🔗 Internal Linking	Related grants by agency, category, and location
🧾 Structured Data	Implements schema.org/Grant and BreadcrumbList JSON-LD for rich results
⚡ Server-Side Rendering (SSR)	Lightning-fast load times and optimal crawlability
🧱 Scalable Architecture	Modular ingestion pipeline for adding new sources
💬 Summaries & Details	Grants display concise summaries plus full descriptions and official apply links
🧭 Vision

Create a centralized, transparent hub for public and private funding opportunities that is:

Easily discoverable via SEO-friendly URLs

Continuously updated via automated scraping

Modular, open-source, and easy to extend

Starting with U.S. federal and state grants, the system can expand to foundations, universities, and global programs.

🧩 Why This Matters

Grant data is scattered across dozens of agency portals and PDFs.
Most are not indexed well, poorly formatted, or hidden behind complex filters.

This project bridges that gap by combining:

Automation for collection

AI for summarization

Modern web architecture for accessibility

By exposing structured data with rich metadata and contextual linking, this system:

Makes funding opportunities more visible

Empowers individuals and organizations to discover new programs

Demonstrates open-data best practices for civic tech and transparency

🧮 Database Schema
Column	Type	Notes
id	uuid	PK
source_id	uuid	FK → scrape_sources
title	text	Grant title
apply_link	text	Official grant or application URL
category	text	e.g., Education, Business, Agriculture
agency	text	Issuing organization
funding_amount	text	Formatted amount string
eligibility	text	Who can apply
deadline	text	Application due date
state	text	Extracted from metadata
city	text	If applicable
description	text	Full program description (HTML)
summary	text	AI-generated summary
summary_model	text	e.g., gpt-3.5-turbo
summary_updated_at	timestamptz	When last summarized
scraped_at	timestamptz	Default now()
hash	text	Generated `md5(title

latest_grants View

create or replace view latest_grants as
select distinct on (hash) *
from grants
order by hash, scraped_at desc;

🌍 SEO and Routing

Canonical URL pattern:
/grants/{category}/{state}/{slug}

Each page serves structured metadata:

Detail pages → Grant JSON-LD

Lists/categories → ItemList JSON-LD

All pages → BreadcrumbList for navigation hierarchy

Example:
/grants/education/california/community-school-funding-6c218708

🔗 Internal Linking

Each grant detail page links to:

“More grants in {state}”

“More {category} grants”

“More from {agency}”

Category and state pages cross-link to related filters for stronger crawl depth.
Breadcrumbs mirror the hierarchy for every page, strengthening internal SEO signals.

🧠 Future Enhancements

Add more state, foundation, and nonprofit sources

Build email “grant alerts” for subscribers

Expand AI summaries → include eligibility highlights

Implement geo-filtering and proximity search

Track search analytics and trends

Integrate monetization (ads / affiliate / premium alerts)

🧰 Environment Variables
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=



schema:
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.grant_categories (
  category_code text NOT NULL,
  category_label text NOT NULL,
  scraped boolean NOT NULL DEFAULT false,
  last_fetch_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT grant_categories_pkey PRIMARY KEY (category_code)
);
CREATE TABLE public.grant_scrape_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  active boolean DEFAULT true,
  last_scraped_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  query text,
  selectors jsonb,
  last_page_scraped integer DEFAULT 0,
  CONSTRAINT grant_scrape_sources_pkey PRIMARY KEY (id)
);
CREATE TABLE public.grants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_id uuid,
  title text NOT NULL,
  apply_link text,
  agency text,
  amount text,
  deadline text,
  eligibility text,
  category text,
  state text,
  summary text,
  scraped_at timestamp with time zone NOT NULL DEFAULT now(),
  hash text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  description text,
  details_scraped_at timestamp with time zone,
  details_error text,
  status text,
  summary_auto text,
  summary_model text,
  summary_updated_at timestamp with time zone,
  description_hash text,
  notice_id text,
  solicitation_number text,
  full_parent_path_name text,
  full_parent_path_code text,
  posted_date date,
  type text,
  base_type text,
  archive_type text,
  archive_date date,
  set_aside_code text,
  response_deadline timestamp with time zone,
  naics_code text,
  classification_code text,
  active boolean,
  description_url text,
  ui_link text,
  award_amount numeric,
  award_number text,
  awardee_name text,
  agency_code text,
  open_date date,
  close_date date,
  source text,
  agency_name text,
  opportunity_number text UNIQUE,
  category_code text,
  opportunity_id integer,
  CONSTRAINT grants_pkey PRIMARY KEY (id),
  CONSTRAINT grants_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.grant_scrape_sources(id)
);
CREATE TABLE public.jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_id uuid,
  title text,
  apply_link text,
  category text,
  employment_type text,
  location text,
  closing_at text,
  department text,
  salary text,
  scraped_at timestamp with time zone NOT NULL DEFAULT now(),
  hash text,
  state text,
  CONSTRAINT jobs_pkey PRIMARY KEY (id),
  CONSTRAINT jobs_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.scrape_sources(id)
);
CREATE TABLE public.scrape_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_id uuid,
  status text NOT NULL CHECK (status = ANY (ARRAY['queued'::text, 'running'::text, 'done'::text, 'failed'::text])),
  message text,
  started_at timestamp with time zone DEFAULT now(),
  finished_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scrape_logs_pkey PRIMARY KEY (id),
  CONSTRAINT scrape_logs_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.scrape_sources(id)
);
CREATE TABLE public.scrape_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  active boolean DEFAULT true,
  last_scraped_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  query text,
  selectors jsonb,
  CONSTRAINT scrape_sources_pkey PRIMARY KEY (id)
);
