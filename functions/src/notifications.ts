import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import type { EmailNotification } from './types';

const db = getFirestore();
const sendgridApiKey = defineSecret('SENDGRID_API_KEY');

const BATCH_SIZE = 20;
const FROM_EMAIL = 'noreply@openclaw.ai';
const FROM_NAME = 'Open Claw AI';

// Template rendering — plain text with variable substitution.
// Keeps the Functions bundle small by avoiding a template engine dependency.
const TEMPLATES: Record<string, (data: Record<string, unknown>) => { subject: string; html: string }> = {
  reservation_confirmed: (data) => ({
    subject: `Reservation Confirmed — ${data.vehicleName || 'Your Vehicle'}`,
    html: [
      `<h2>Your reservation is confirmed</h2>`,
      `<p>Hi ${data.customerName || 'there'},</p>`,
      `<p>Your reservation <strong>${data.reservationId || ''}</strong> has been confirmed.</p>`,
      `<ul>`,
      `  <li><strong>Vehicle:</strong> ${data.vehicleName || 'N/A'}</li>`,
      `  <li><strong>Pickup:</strong> ${data.pickupDate || 'N/A'}</li>`,
      `  <li><strong>Dropoff:</strong> ${data.dropoffDate || 'N/A'}</li>`,
      `  <li><strong>Total:</strong> €${data.totalPrice || '0'}</li>`,
      `</ul>`,
      `<p>Thank you for choosing Open Claw.</p>`,
    ].join('\n'),
  }),

  reservation_cancelled: (data) => ({
    subject: `Reservation Cancelled — ${data.vehicleName || 'Your Vehicle'}`,
    html: [
      `<h2>Your reservation has been cancelled</h2>`,
      `<p>Hi ${data.customerName || 'there'},</p>`,
      `<p>Reservation <strong>${data.reservationId || ''}</strong> has been cancelled.</p>`,
      `<p>If this was a mistake, please contact us or create a new booking.</p>`,
    ].join('\n'),
  }),

  reservation_reminder: (data) => ({
    subject: `Pickup Reminder — ${data.vehicleName || 'Your Vehicle'}`,
    html: [
      `<h2>Your pickup is tomorrow</h2>`,
      `<p>Hi ${data.customerName || 'there'},</p>`,
      `<p>Reminder: your reservation <strong>${data.reservationId || ''}</strong> ` +
        `starts on <strong>${data.pickupDate || 'N/A'}</strong>.</p>`,
      `<p>See you soon!</p>`,
    ].join('\n'),
  }),

  payment_receipt: (data) => ({
    subject: `Payment Receipt — €${data.amount || '0'}`,
    html: [
      `<h2>Payment received</h2>`,
      `<p>Hi ${data.customerName || 'there'},</p>`,
      `<p>We received your payment of <strong>€${data.amount || '0'}</strong> ` +
        `for reservation <strong>${data.reservationId || ''}</strong>.</p>`,
      `<p>Thank you!</p>`,
    ].join('\n'),
  }),
};

/**
 * Sends an email via the SendGrid v3 API using fetch.
 * Returns true on success, false on failure.
 */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = sendgridApiKey.value();
  if (!apiKey) {
    logger.error('SENDGRID_API_KEY is not configured — skipping email send.');
    return false;
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('SendGrid API error', { status: response.status, body: errorBody, to });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Email send failed', { to, error });
    return false;
  }
}

/**
 * Processes queued email notifications.
 * Called by a scheduled function every 15 minutes.
 *
 * Reads up to BATCH_SIZE queued emails, renders the template,
 * sends via SendGrid, and updates the document status.
 */
export async function processEmailNotifications(): Promise<{ processed: number; failed: number }> {
  const snapshot = await db
    .collection('email_queue')
    .where('status', '==', 'queued')
    .limit(BATCH_SIZE)
    .get();

  if (snapshot.empty) {
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const doc of snapshot.docs) {
    const notification = doc.data() as EmailNotification;
    const templateFn = TEMPLATES[notification.template];

    if (!templateFn) {
      logger.warn('Unknown email template', { template: notification.template, docId: doc.id });
      await doc.ref.update({ status: 'failed', error: 'Unknown template' });
      failed++;
      continue;
    }

    if (!notification.to || typeof notification.to !== 'string') {
      await doc.ref.update({ status: 'failed', error: 'Missing recipient' });
      failed++;
      continue;
    }

    const { subject, html } = templateFn(notification.data ?? {});
    const success = await sendEmail(notification.to, subject, html);

    if (success) {
      await doc.ref.update({ status: 'sent', sentAt: new Date().toISOString() });
      processed++;
    } else {
      await doc.ref.update({ status: 'failed' });
      failed++;
    }
  }

  return { processed, failed };
}
