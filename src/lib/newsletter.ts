import crypto from "crypto";
import { Resend } from "resend";
import { Post } from "@/interfaces/post";
import { ensureDatabaseSchema, runQuery } from "@/lib/db";
import { getBaseUrl, getSiteUrl } from "@/lib/site";

type SubscriberRow = {
  id: number;
  email: string;
  name: string | null;
  status: string;
  unsubscribe_token: string;
};

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  return new Resend(apiKey);
}

function getMailFrom() {
  const from = process.env.MAIL_FROM_EMAIL;

  if (!from) {
    throw new Error("Missing MAIL_FROM_EMAIL");
  }

  return from;
}

function getContactInbox() {
  const to = process.env.CONTACT_TO_EMAIL;

  if (!to) {
    throw new Error("Missing CONTACT_TO_EMAIL");
  }

  return to;
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
  return Boolean(process.env.DATABASE_URL && process.env.RESEND_API_KEY && process.env.MAIL_FROM_EMAIL);
}

export async function upsertSubscriber(email: string, name?: string) {
  await ensureDatabaseSchema();

  const unsubscribeToken = crypto.randomUUID();
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name?.trim() || null;

  const rows = await runQuery<SubscriberRow>`
    INSERT INTO newsletter_subscribers (email, name, status, unsubscribe_token, updated_at)
    VALUES (${normalizedEmail}, ${trimmedName}, 'active', ${unsubscribeToken}, NOW())
    ON CONFLICT (email)
    DO UPDATE SET
      name = COALESCE(EXCLUDED.name, newsletter_subscribers.name),
      status = 'active',
      updated_at = NOW()
    RETURNING id, email, name, status, unsubscribe_token
  `;

  return rows[0] as SubscriberRow;
}

export async function sendSubscriptionConfirmation(subscriber: SubscriberRow) {
  const resend = getResend();
  const from = getMailFrom();
  const unsubscribeUrl = getBaseUrl(`/api/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribe_token)}`);
  const siteUrl = getSiteUrl();

  await resend.emails.send({
    from,
    to: [subscriber.email],
    subject: "You’re subscribed to Microsoft Entra Blog updates",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h1 style="font-size: 22px; margin-bottom: 12px;">Subscription confirmed</h1>
        <p>You're now subscribed to Microsoft Entra Blog updates from Sentinel Identity.</p>
        <p>You'll get notified when a new technical post is published.</p>
        <p><a href="${siteUrl}" style="color: #0f172a;">Visit the blog</a></p>
        <p style="font-size: 13px; color: #64748b;">If you no longer want these emails, you can <a href="${unsubscribeUrl}" style="color: #64748b;">unsubscribe here</a>.</p>
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

async function getActiveSubscribers() {
  await ensureDatabaseSchema();

  return runQuery<SubscriberRow>`
    SELECT id, email, name, status, unsubscribe_token
    FROM newsletter_subscribers
    WHERE status = 'active'
    ORDER BY created_at ASC
  `;
}

async function claimNewsletterSend(post: Post) {
  await ensureDatabaseSchema();

  const retried = await runQuery<{ id: number }>`
    UPDATE newsletter_sends
    SET status = 'processing', attempted_at = NOW(), error = NULL
    WHERE post_slug = ${post.slug} AND status = 'failed'
    RETURNING id
  `;

  if (retried[0]) {
    return retried[0];
  }

  const inserted = await runQuery<{ id: number }>`
    INSERT INTO newsletter_sends (post_slug, post_title, status, attempted_at)
    VALUES (${post.slug}, ${post.title}, 'processing', NOW())
    ON CONFLICT (post_slug) DO NOTHING
    RETURNING id
  `;

  return inserted[0] || null;
}

async function markNewsletterSend(post: Post, values: {
  status: "sent" | "failed";
  subscriberCount: number;
  deliveredCount: number;
  error?: string;
}) {
  const status = values.status;

  await runQuery`
    UPDATE newsletter_sends
    SET
      status = ${status},
      subscriber_count = ${values.subscriberCount},
      delivered_count = ${values.deliveredCount},
      sent_at = CASE WHEN ${status} = 'sent' THEN NOW() ELSE sent_at END,
      error = ${values.error || null}
    WHERE post_slug = ${post.slug}
  `;
}

async function sendNewPostEmail(subscriber: SubscriberRow, post: Post) {
  const resend = getResend();
  const from = getMailFrom();
  const postUrl = getBaseUrl(`/posts/${post.slug}`);
  const unsubscribeUrl = getBaseUrl(`/api/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribe_token)}`);
  const greeting = subscriber.name?.trim() ? `Hi ${escapeHtml(subscriber.name.trim())},` : "Hello,";

  await resend.emails.send({
    from,
    to: [subscriber.email],
    subject: `${post.title} | Microsoft Entra Blog`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.65; color: #0f172a;">
        <p>${greeting}</p>
        <h1 style="font-size: 22px; margin: 12px 0;">${escapeHtml(post.title)}</h1>
        <p>${escapeHtml(post.excerpt)}</p>
        <p><a href="${postUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 999px; background: #020617; color: #ffffff; text-decoration: none;">Read the new post</a></p>
        <p style="font-size: 13px; color: #64748b;">If you no longer want blog updates, you can <a href="${unsubscribeUrl}" style="color: #64748b;">unsubscribe here</a>.</p>
      </div>
    `,
  });
}

export async function syncLatestPostToSubscribers(post: Post | undefined) {
  if (!post || !newsletterReady()) {
    return { status: "skipped" as const };
  }

  const claim = await claimNewsletterSend(post);

  if (!claim) {
    return { status: "already-sent" as const };
  }

  const subscribers = await getActiveSubscribers();
  let deliveredCount = 0;

  try {
    for (const subscriber of subscribers) {
      await sendNewPostEmail(subscriber as SubscriberRow, post);
      deliveredCount += 1;
    }

    await markNewsletterSend(post, {
      status: "sent",
      subscriberCount: subscribers.length,
      deliveredCount,
    });

    return {
      status: "sent" as const,
      subscriberCount: subscribers.length,
      deliveredCount,
    };
  } catch (error) {
    await markNewsletterSend(post, {
      status: "failed",
      subscriberCount: subscribers.length,
      deliveredCount,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}

export async function unsubscribeByToken(token: string) {
  await ensureDatabaseSchema();

  const rows = await runQuery<{ email: string }>`
    UPDATE newsletter_subscribers
    SET status = 'unsubscribed', updated_at = NOW()
    WHERE unsubscribe_token = ${token}
    RETURNING email
  `;

  return rows[0] || null;
}
