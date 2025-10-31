src/
 ├── app/
 │    ├── layout.tsx
 │    ├── page.tsx                     # homepage /jobs overview
 │    ├── jobs/
 │    │    ├── page.tsx                # /jobs?query=&category=&location=
 │    │    ├── [state]/page.tsx        # /jobs/va
 │    │    ├── [state]/[city]/page.tsx # /jobs/va/richmond
 │    │    ├── [state]/[city]/[category]/page.tsx
 │    │    └── [state]/[city]/[category]/[slug]/page.tsx  # job detail
 │    └── api/
 │         └── revalidate/route.ts     # optional ISR trigger
 │
 ├── components/
 │    ├── filters/FiltersBar.tsx
 │    ├── jobs/JobCard.tsx
 │    ├── jobs/JobDetail.tsx
 │    ├── jobs/RelatedLinks.tsx
 │    ├── Pagination.tsx
 │    ├── Breadcrumbs.tsx
 │    └── ui/*                         # shadcn components
 │
 ├── lib/
 │    ├── supabase/client.ts
 │    ├── supabase/server.ts
 │    ├── types.ts
 │    ├── search.ts
 │    ├── slug.ts                      # keyworded URLs
 │    ├── seo.ts                       # JSON-LD & meta helpers
 │    └── utils.ts
 │
 └── styles/globals.css


🏛️ Government Jobs Portal
A Next.js + Supabase–powered, SEO-optimized job board for public sector careers
📖 Project Description

The Government Jobs Portal is a modern, open-source job aggregation and discovery platform designed to make government career listings accessible, searchable, and indexable by both users and search engines.

Built with Next.js 15, Supabase, and Edge Functions, the portal automatically scrapes official government job listings (such as from the Virginia Jobs Network and other state or federal portals) and organizes them into a structured, searchable database.

It focuses on transparency, accessibility, and performance — surfacing real-time, structured data in a user-friendly interface optimized for SEO and discoverability.

This project demonstrates a full end-to-end data pipeline:

Scraping Layer (Supabase Edge Functions)
Automated functions fetch job postings daily, clean and structure the data, and store them in Supabase.
The design supports multiple sources through stored CSS selectors and extraction logic, making it easy to onboard new state or agency websites.

Storage Layer (Supabase Database)
Parsed job postings are stored in a normalized schema (jobs, scrape_sources, and scrape_logs).
Deduplication and hashing ensure daily updates without repetition.
A latest_jobs view provides the most recent unique postings for public queries.

Presentation Layer (Next.js Frontend)
A responsive, high-performance frontend allows visitors to browse, search, and filter jobs by category, location, department, or employment type.
Each posting is given a canonical, keyword-rich URL for maximum SEO impact.

🌐 Core Features
Feature	Description
🔍 Smart Search & Filters	Real-time filtering by title, location, category, and employment type.
⚙️ Automated Scraping	Supabase Edge Functions fetch new listings daily and store structured data.
🧠 SEO-Optimized Routing	Clean URLs like /jobs/virginia/richmond/faculty/creative-services-coordinator-abc123.
🔗 Internal Linking	Related job and facet links for improved crawlability and UX.
🧾 Structured Data	Implements schema.org/JobPosting
 and BreadcrumbList JSON-LD for Google Jobs indexing.
⚡ Server-Side Rendering (SSR)	Pages rendered on the server for performance and SEO.
💾 Database-Driven Views	Real-time data from Supabase’s latest_jobs view ensures freshness without duplication.
🧱 Scalable Architecture	Modular scraping and ingestion pipeline for multi-source expansion.
🧭 Vision

The goal of this project is to create a centralized, transparent hub for public sector job listings that is:

Easily discoverable through SEO-friendly URLs

Continuously updated via automated scraping

Lightweight, modular, and open-source

It is built to scale — starting with Virginia government jobs and expanding to include regional, federal, and other verified public service postings.

🧩 Why This Matters

Government job boards are often fragmented, outdated, or hidden behind poor user interfaces.
This project bridges that gap by combining the automation of data aggregation with the discoverability of a modern web experience.

By exposing standardized job data with structured metadata and contextual linking, this system:

Makes government jobs more visible to the public

Improves SEO and traffic for public agencies

Demonstrates open data best practices for civic technology


🧩 Database Schema
jobs
column	type	notes
id	uuid PK	generated
source_id	uuid	FK to scrape_sources
title	text	job title
apply_link	text	direct URL to job
category	text	department or field
employment_type	text	full-time, part-time
location	text	human-readable location
state	text	extracted from location
city	text	extracted from location
department	text	hiring agency
salary	text	formatted salary string
closing_at	text	application deadline
scraped_at	timestamptz	default now()
hash	text generated always	`md5(title
latest_jobs View
create or replace view latest_jobs as
select distinct on (hash) *
from jobs
order by hash, scraped_at desc;



🌍 SEO and Routing

Canonical URL Pattern:

/jobs/{state}/{city}/{category}/{job-slug}-{shortid}


Each page type serves structured metadata:

Detail pages → JobPosting JSON-LD

Lists and categories → ItemList JSON-LD

All → BreadcrumbList for internal link hierarchy

Example:

/jobs/virginia/richmond/administrative/ph-nurse-6c218708

🔗 Internal Linking

Detail pages link to:

“More jobs in {city}”

“More {category} jobs in {state}”

“More at {department}”

Category and location pages link to related filters and agencies.

Breadcrumbs mirror the path for every page.

This creates a dense internal link network, boosting crawl depth and ranking signals across the entire domain.

🧠 Future Enhancements

Add additional state and federal portals

Implement email job alerts

Integrate AI for job summarization

Add geo-filtering and proximity search

Track search analytics and trends


NEXT_PUBLIC_SUPABASE_URL=<your-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-key>
