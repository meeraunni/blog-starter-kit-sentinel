import { Resend } from "resend";
import { Post } from "@/interfaces/post";
import { getSiteUrl } from "@/lib/site";

type ContactRecord = {
  id?: string;
  email: string;
  first_name?: string;
  unsubscribed?: boolean;
};

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  return new Resend(apiKey);
}

function getMailFrom() {
  return process.env.MAIL_FROM_EMAIL || "Sentinel Identity <onboarding@resend.dev>";
}

function getContactInbox() {
  return process.env.CONTACT_TO_EMAIL || "info@sentinelidentity.ca";
}

function getSegmentId() {
  return process.env.RESEND_SEGMENT_ID || "";
}

function getAudienceId() {
  return process.env.RESEND_AUDIENCE_ID || "";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function newsletterReady() {
  return Boolean(process.env.RESEND_API_KEY);
}

async function getContactByEmail(email: string) {
  const resend = getResend();
  const audienceId = getAudienceId();
  const { data } = await resend.contacts.get({
    email,
    audienceId: audienceId || undefined,
  });
  return (data || null) as ContactRecord | null;
}

export async function registerSubscriber(email: string, name?: string) {
  const resend = getResend();
  const segmentId = getSegmentId();
  const audienceId = getAudienceId();
  const normalizedEmail = email.trim().toLowerCase();
  const firstName = name?.trim() || undefined;

  const existing = await getContactByEmail(normalizedEmail);

  if (existing?.id) {
    await resend.contacts.update({
      email: normalizedEmail,
      audienceId: audienceId || undefined,
      unsubscribed: false,
      firstName: firstName || null,
      properties: firstName ? { first_name: firstName } : undefined,
    });

    if (segmentId) {
      await resend.contacts.segments.add({
        contactId: existing.id,
        segmentId,
      });
    }

    return {
      email: normalizedEmail,
      firstName,
      contactId: existing.id,
    };
  }

  const { data, error } = await resend.contacts.create({
    email: normalizedEmail,
    audienceId,
    firstName,
    unsubscribed: false,
  });

  if (error) {
    throw new Error(error.message || "Could not create contact");
  }

  return {
    email: normalizedEmail,
    firstName,
    contactId: data?.id || "",
  };
}

export async function sendSubscriptionConfirmation(values: {
  email: string;
  firstName?: string;
}) {
  const resend = getResend();
  const from = getMailFrom();
  const siteUrl = getSiteUrl();
  const greeting = values.firstName ? `Hi ${escapeHtml(values.firstName)},` : "Hello,";

  await resend.emails.send({
    from,
    to: [values.email],
    subject: "You’re subscribed to Microsoft Entra Blog updates",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <p>${greeting}</p>
        <h1 style="font-size: 22px; margin-bottom: 12px;">Subscription confirmed</h1>
        <p>You are now subscribed to Microsoft Entra Blog updates from Sentinel Identity.</p>
        <p><a href="${siteUrl}" style="color: #0f172a;">Visit the blog</a></p>
      </div>
    `,
  });
}

export async function sendConsultingRequestEmail(values: {
  name: string;
  company?: string;
  email: string;
  challenge: string;
}) {
  const resend = getResend();
  const from = getMailFrom();
  const to = getContactInbox();

  await resend.emails.send({
    from,
    to: [to],
    replyTo: values.email,
    subject: `New Sentinel Identity consulting request from ${values.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h1 style="font-size: 22px; margin-bottom: 16px;">New consulting request</h1>
        <p><strong>Name:</strong> ${escapeHtml(values.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(values.email)}</p>
        <p><strong>Company:</strong> ${escapeHtml(values.company || "Not provided")}</p>
        <p><strong>Tenant details:</strong></p>
        <p style="white-space: pre-wrap;">${escapeHtml(values.challenge)}</p>
      </div>
    `,
  });
}

export async function syncLatestPostToSubscribers(post: Post | undefined) {
  if (!post || !newsletterReady()) {
    return { status: "skipped" as const };
  }

  const resend = getResend();
  const from = getMailFrom();
  const siteUrl = getSiteUrl();
  const segmentId = getSegmentId();

  if (!segmentId) {
    return { status: "skipped" as const };
  }

  const { data, error } = await resend.broadcasts.create({
    segmentId,
    from,
    subject: `${post.title} | Microsoft Entra Blog`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.65; color: #0f172a;">
        <h1 style="font-size: 22px; margin: 12px 0;">${escapeHtml(post.title)}</h1>
        <p>${escapeHtml(post.excerpt)}</p>
        <p><a href="${siteUrl}/posts/${post.slug}" style="display: inline-block; padding: 12px 18px; border-radius: 999px; background: #020617; color: #ffffff; text-decoration: none;">Read the new post</a></p>
        <p style="font-size: 13px; color: #64748b;">You can manage your subscription from your email provider or Resend unsubscribe controls.</p>
      </div>
    `,
    name: `post-${post.slug}`,
    send: true,
  });

  if (error) {
    throw new Error(error.message || "Broadcast creation failed");
  }

  return {
    status: "sent" as const,
    broadcastId: data?.id || null,
  };
}

export async function unsubscribeByToken(_token: string) {
  return null;
}
