import Script from "next/script";
import type { Metadata } from "next";

const faqs: {
  question: string;
  answer: string[];
  bullets?: string[];
}[] = [
  {
    question: "What is a government grant?",
    answer: [
      "A government grant is funding awarded by a federal, state, or local agency to support projects that advance public priorities such as community development, education, health, or research.",
      "Unlike loans, grants do not need to be repaid when recipients meet the stated requirements. Each opportunity lists its eligibility rules, funding limits, and reporting expectations so you can decide whether it is a good fit for your organization.",
    ],
  },
  {
    question: "Who can apply for government grants?",
    answer: [
      "Eligibility varies by program, but most grants target nonprofits, tribal organizations, educational institutions, and government entities. Some opportunities also welcome small businesses, cooperatives, or individual applicants pursuing public-benefit projects.",
      "Every listing on Grant Directory summarizes the core eligibility language and links to the official notice so you can confirm the details before you apply.",
    ],
  },
  {
    question: "How does Grant Directory source and update grants?",
    answer: [
      "Grant Directory aggregates opportunities from trusted federal systems such as Grants.gov, state portals, and local economic development feeds.",
      "Our team refreshes the database daily with automated imports and manual reviews to verify that deadlines, funding amounts, and apply links remain current. Listings that close or lapse are archived so active searches only show open programs.",
    ],
  },
  {
    question: "What is the difference between federal and state or local grants?",
    answer: [
      "Federal grants are funded by nationwide agencies and often support programs with broad geographic reach. State and local grants focus on projects within a specific state, county, or city and may emphasize community impact or regional economic development.",
      "Grant Directory flags each listing with its jurisdiction so you can quickly separate nationwide opportunities from place-based funding.",
    ],
  },
  {
    question: "How do I search for grants by state or city?",
    answer: [
      "Start on the Search Grants page and use the location filters. Choose a state from the dropdown or type a city to narrow results to opportunities that serve your community.",
      "You can also explore the state and local grant hubs (for example /grants/state/CA or /grants/local/NY/new-york-city) to see curated lists that stay in sync with the main search results.",
    ],
  },
  {
    question: "Can I filter grants by category or focus area?",
    answer: [
      "Yes. The category dropdown only shows focus areas with active funding, such as Community Development, Health Services, or Workforce Training.",
      "Select a category and the results immediately refresh to highlight grants whose official category codes match that focus area, so you never scroll through empty or outdated sections.",
    ],
  },
  {
    question: "What are the most common grant categories?",
    answer: [
      "Popular categories include Education, Economic Development, Health and Human Services, Housing, Community Facilities, Public Safety, Environmental Resilience, and Small Business Support.",
      "Grant Directory keeps the category list aligned with the latest award notices so you can see which focus areas currently have the most opportunities.",
    ],
  },
  {
    question: "How do grant deadlines and open or close dates work?",
    answer: [
      "Most opportunities publish an open date when applications are accepted and a closing date when submissions end. Some programs also list anticipated award or review timelines.",
      "Our listings surface those dates, and the search filters allow you to focus on grants that are still open so you do not waste time on expired opportunities.",
    ],
  },
  {
    question: "Is Grant Directory free to use?",
    answer: [
      "Yes. Grant Directory is a free discovery tool designed to make public funding easier to navigate. You can browse, filter, and share listings without creating an account or paying a subscription.",
      "We link back to the official application portal for every opportunity so you always apply through the authoritative source.",
    ],
  },
  {
    question: "Are there grants for small businesses or startups?",
    answer: [
      "Many economic development agencies offer grants for small businesses, manufacturers, and entrepreneurs—especially for innovation, exporting, workforce training, or recovery initiatives.",
      "Use the category filter (for example Business Development or Entrepreneurship) or search by keywords like \"small business\" to surface the most relevant programs.",
    ],
  },
  {
    question: "What tips can help me write a strong grant application?",
    answer: [
      "Successful proposals clearly explain the community need, outline measurable outcomes, and show how the requested budget supports those goals.",
      "Many funders also expect evidence of partnerships, a realistic work plan, and a sustainability strategy for the project once grant funding ends.",
    ],
    bullets: [
      "Read the full notice of funding opportunity and follow every formatting requirement.",
      "Align your objectives with the funder’s stated priorities and use their language where appropriate.",
      "Build a review calendar so stakeholders can proofread, sign, and submit the package before the deadline.",
    ],
  },
  {
    question: "How are grants different from loans or other financing?",
    answer: [
      "Grants are awards you do not repay, while loans require repayment with interest. Grants often have strict spending rules and reporting requirements, whereas loans focus on your ability to repay the lender.",
      "Some projects pair grants with other financing, but understanding the difference helps you plan budgets and compliance duties accurately.",
    ],
  },
  {
    question: "How often is Grant Directory updated?",
    answer: [
      "We sync with official data sources every day and run quality checks throughout the week. New grants usually appear on the site within hours of their public release.",
      "If an opportunity closes early or an agency revises a notice, we update the listing so your saved links stay accurate.",
    ],
  },
];

export const metadata: Metadata = {
  title: "Government Grants FAQ | Grant Directory",
  description:
    "Answers to common questions about government grants, eligibility, deadlines, and how Grant Directory keeps opportunity listings current.",
};

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: [...faq.answer, ...(faq.bullets ?? []).map((bullet) => `• ${bullet}`)].join("\n\n"),
      },
    })),
  };

  return (
    <div className="container-grid space-y-10 py-12">
      <header className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Frequently Asked Questions</p>
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Government grant FAQs</h1>
        <p className="max-w-2xl text-base text-slate-600">
          Learn how government grants work, who can apply, and how Grant Directory keeps you informed with the latest
          verified funding opportunities for nonprofits, small businesses, and community projects.
        </p>
      </header>

      <section className="space-y-3">
        {faqs.map((faq) => (
          <details key={faq.question} className="group rounded-xl border border-slate-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-left text-base font-semibold text-slate-900 transition focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 [&::-webkit-details-marker]:hidden">
              <span>{faq.question}</span>
              <span className="text-xl font-bold text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <div className="space-y-3 border-t border-slate-200 px-4 py-4 text-sm text-slate-700">
              {faq.answer.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {faq.bullets && (
                <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
                  {faq.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        ))}
      </section>

      <section className="rounded-xl border border-blue-100 bg-blue-50 p-6 text-sm text-blue-900">
        <h2 className="text-base font-semibold text-blue-900">Ready to explore current opportunities?</h2>
        <p className="mt-2">
          Visit the <a className="font-semibold underline" href="/grants">Search Grants</a> page to filter by
          category, location, agency, and keywords. New programs are added daily so you can quickly spot funding that
          matches your mission.
        </p>
      </section>

      <Script
        id="faq-structured-data"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
