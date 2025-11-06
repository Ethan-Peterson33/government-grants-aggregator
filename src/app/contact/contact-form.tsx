"use client";

import clsx from "clsx";
import { useFormState, useFormStatus } from "react-dom";

import { submitContactForm, type ContactFormState } from "./actions";

const initialState: ContactFormState = {
  status: "idle",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:w-auto"
      disabled={pending}
    >
      {pending ? "Sending..." : "Send message"}
    </button>
  );
}

export function ContactForm() {
  const [state, formAction] = useFormState(submitContactForm, initialState);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="Your full name"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="you@example.org"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700" htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          placeholder="Tell us how we can help"
        />
      </div>

      <div className="hidden" aria-hidden="true">
        <label className="sr-only" htmlFor="website">
          Website
        </label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state.status !== "idle" && state.message ? (
        <div
          className={clsx(
            "rounded-md border px-3 py-2 text-sm",
            state.status === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          )}
          role="status"
          aria-live="polite"
        >
          {state.message}
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}
