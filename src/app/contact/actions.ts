"use server";

import { sendContactEmail } from "@/lib/email";

export type ContactFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const successResponse: ContactFormState = {
  status: "success",
  message: "Thanks for reaching out! Our team will reply shortly.",
};

export async function submitContactForm(
  _: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot.trim().length > 0) {
    return successResponse;
  }

  const name = (formData.get("name") ?? "").toString().trim();
  const email = (formData.get("email") ?? "").toString().trim();
  const message = (formData.get("message") ?? "").toString().trim();

  if (!name || !email || !message) {
    return {
      status: "error",
      message: "Please complete all required fields before submitting the form.",
    };
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return {
      status: "error",
      message: "Enter a valid email address so we can follow up with you.",
    };
  }

  try {
    await sendContactEmail({ name, email, message });
    return successResponse;
  } catch (error) {
    console.error("Failed to send contact email", error);
    return {
      status: "error",
      message:
        "We couldn't deliver your message right now. Please try again or email support@grantdirectory.org.",
    };
  }
}
