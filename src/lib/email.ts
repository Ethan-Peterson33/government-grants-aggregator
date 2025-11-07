const RESEND_API_ENDPOINT = "https://api.resend.com/emails";

export type ContactEmailPayload = {
  name: string;
  email: string;
  message: string;
};

export async function sendContactEmail({ name, email, message }: ContactEmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.CONTACT_EMAIL_FROM;
  const toAddress = process.env.CONTACT_EMAIL_TO;

console.log('apiKey: ',apiKey,  '       fromAddress: ', fromAddress, '      toAddress: ', toAddress)

  if (!apiKey || !fromAddress || !toAddress) {
    throw new Error("Contact email environment variables are missing.");
  }

  const response = await fetch(RESEND_API_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [toAddress],
      subject: `New contact form submission from ${name}`,
      reply_to: email,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }
}
