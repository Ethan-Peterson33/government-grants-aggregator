import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { digitalProducts } from "@/config/digital-products";

const product = digitalProducts.find(
  (item) => item.slug === "first-time-homebuyer-starter-pack"
);

export const metadata: Metadata = {
  title: "First-Time Homebuyer Starter Pack (2025 Edition) | GrantDirectory.org",
  description:
    "A complete digital workbook for first-time buyers with checklists, timelines, grant guidance, and worksheets.",
};

const whatsInside = [
  "90-Day Homebuying Roadmap",
  "Down Payment Assistance Eligibility Checklist",
  "Complete Document Checklist (fillable)",
  "30-Day Credit Boost Plan",
  "2025 Grant Calendar",
  "Loan Program Comparison Chart",
  "Homebuyer Budget Worksheet",
  "Assistance Program Tracker",
  "Closing Week Checklist",
  "Bonus: Grant Stacking Guide ($25k–$40k+ examples)",
];

const whoItsFor = [
  "Renters preparing to buy their first home",
  "Buyers who want to use grants or down payment assistance",
  "Anyone who feels overwhelmed by the process and wants a step-by-step system",
];

const whyItWorks = [
  {
    title: "Grant-focused",
    description:
      "Built with an emphasis on down payment assistance and first-time buyer programs so you know where to start.",
  },
  {
    title: "Checklists, not fluff",
    description: "Practical, fillable pages keep you organized and moving forward without the jargon.",
  },
  {
    title: "Step-by-step flow",
    description: "Follow a clear timeline from credit prep to closing week, with reminders for each milestone.",
  },
];

const outcomes = [
  "A clear plan for the next 90 days",
  "Organized documents ready for lenders and grant programs",
  "Better understanding of loan types and which fits you",
  "A repeatable system you can reuse when you move or buy again",
];

const faqs = [
  {
    question: "Is this a physical book or digital download?",
    answer: "It's a digital PDF you can print or use on any device.",
  },
  {
    question: "Does this include state-specific grants?",
    answer:
      "It focuses on the process, timelines, and national program types. You can discover specific grants for your state on GrantDirectory.org.",
  },
  {
    question: "Can I use this with my partner or family?",
    answer: "Yes. You can complete the worksheets together and share the checklists as you plan your purchase.",
  },
  {
    question: "What if I'm more than 90 days away from buying?",
    answer:
      "Start with the credit, budgeting, and document prep sections now. You'll be ready to move quickly when the timing is right.",
  },
  {
    question: "Is this financial or legal advice?",
    answer:
      "No. This workbook is educational and should not replace guidance from licensed financial, legal, or real estate professionals.",
  },
];

export default function FirstTimeHomebuyerStarterPackPage() {
  if (!product) {
    notFound();
  }

  return (
    <main className="bg-slate-50 py-12">
      <div className="mx-auto max-w-5xl px-4 space-y-12">
        <section className="grid gap-8 rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-100 lg:grid-cols-2 lg:items-center">
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
              {product.name}
            </h1>
            <p className="text-lg text-slate-700">
              A complete roadmap, checklist system, and grant-focused workbook to help you buy your first home with confidence.
            </p>
            <p className="text-base text-slate-700 leading-relaxed">
              {product.longDescription}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 pt-4">
              <Link
                href={product.lemonSqueezyUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Get the Starter Pack
              </Link>
              <Link
                href="/resources"
                className="inline-flex items-center rounded-md border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Back to resources
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 shadow-inner">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              What's included
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-800">
              <li>• 90-day roadmap and weekly milestones</li>
              <li>• Fillable checklists and trackers</li>
              <li>• Grant and DPA guidance</li>
              <li>• Loan comparison and budgeting tools</li>
              <li>• Printable and device-friendly PDF</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">
            What's inside the Starter Pack
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {whatsInside.map((item) => (
              <div
                key={item}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="space-y-3 rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <h2 className="text-2xl font-semibold text-slate-900">Who this guide is for</h2>
            <ul className="space-y-2 text-slate-700">
              {whoItsFor.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-3 rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <h2 className="text-2xl font-semibold text-slate-900">Why this Starter Pack works</h2>
            <div className="space-y-4">
              {whyItWorks.map((item) => (
                <div key={item.title} className="space-y-1">
                  <p className="text-base font-semibold text-slate-900">{item.title}</p>
                  <p className="text-sm text-slate-700">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-2xl font-semibold text-slate-900">What you'll walk away with</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-slate-700">
            {outcomes.map((item) => (
              <li key={item} className="rounded-md bg-slate-50 px-3 py-2 text-sm">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100"
              >
                <p className="text-base font-semibold text-slate-900">{faq.question}</p>
                <p className="mt-2 text-sm text-slate-700 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-blue-600 p-6 text-white shadow-sm">
          <h2 className="text-2xl font-semibold">Ready to start your homebuying journey?</h2>
          <p className="mt-2 text-sm text-blue-50">
            Get instant access to the Starter Pack and follow a proven roadmap from renter to homeowner.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={product.lemonSqueezyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-md bg-white px-5 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              Get the Starter Pack
            </Link>
            <Link
              href="/resources"
              className="inline-flex items-center rounded-md border border-white/70 px-5 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Back to resources
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
