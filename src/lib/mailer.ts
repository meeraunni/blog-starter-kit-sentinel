import nodemailer from "nodemailer";

const requiredEnvVars = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "CONTACT_TO_EMAIL",
] as const;

function getMissingEnvVars() {
  return requiredEnvVars.filter((key) => !process.env[key]);
}

export function isMailerConfigured() {
  return getMissingEnvVars().length === 0;
}

export function getMailerConfigError() {
  const missing = getMissingEnvVars();

  if (missing.length === 0) {
    return null;
  }

  return `Missing email configuration: ${missing.join(", ")}`;
}

export function createTransporter() {
  const port = Number(process.env.SMTP_PORT || "587");

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export function getEmailFrom() {
  return process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "";
}

export function getContactInbox() {
  return process.env.CONTACT_TO_EMAIL || "info@sentinelidentity.ca";
}
