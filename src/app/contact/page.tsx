import type { Metadata } from "next";

import { ContactForm } from "./contact-form";

const pageTitle = "Contact";
const pageDescription =
  "Connect with the GrantDirectory.org team for partnership inquiries, support questions, or product feedback.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  openGraph: {
    title: `${pageTitle} | GrantDirectory.org`,
    description: pageDescription,
  },
};

export default function ContactPage() {
  return (
    <section className="bg-slate-50 py-16">
      <div className="container-grid">
        <div className="mx-auto max-w-2xl space-y-10 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <header className="space-y-3 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Let’s talk about funding opportunities
            </h1>
            <p className="text-base text-slate-600">{pageDescription}</p>
          </header>

          <div className="space-y-4 text-sm text-slate-600">
            <p>
              We typically reply within one business day. If you need immediate help,
              email us directly at <a className="font-medium text-blue-600" href="mailto:support@grantdirectory.org">support@grantdirectory.org</a>.
            </p>
            <p>
              Our team is happy to assist with grant sourcing questions, onboarding
              new organizations, or exploring media and partnership ideas.
            </p>
          </div>

          <ContactForm />
        </div>
      </div>
    </section>
  );
}
