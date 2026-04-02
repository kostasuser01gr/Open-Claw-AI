import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import { requireAuth, toRecord } from './request';
import { writeAuditLog } from './audit';
import type { PaymentRecord } from './types';

const db = getFirestore();
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');

interface CheckoutRequest {
  reservationId: string;
  successUrl: string;
  cancelUrl: string;
}

interface CheckoutResult {
  sessionId: string;
  url: string;
}

/**
 * Creates a Stripe Checkout session for a reservation payment.
 *
 * Validates ownership, prevents duplicate payments, and records the
 * payment intent in Firestore before redirecting the user to Stripe.
 */
export async function handleCreateCheckoutSession(
  request: CallableRequest<unknown>,
): Promise<CheckoutResult> {
  const uid = requireAuth(request.auth);
  const data = toRecord(request.data) as unknown as CheckoutRequest;

  if (!data.reservationId || typeof data.reservationId !== 'string') {
    throw new HttpsError('invalid-argument', 'reservationId is required.');
  }
  if (!data.successUrl || typeof data.successUrl !== 'string') {
    throw new HttpsError('invalid-argument', 'successUrl is required.');
  }
  if (!data.cancelUrl || typeof data.cancelUrl !== 'string') {
    throw new HttpsError('invalid-argument', 'cancelUrl is required.');
  }

  // Validate reservation exists and belongs to the caller
  const reservationSnap = await db.collection('reservations').doc(data.reservationId).get();
  if (!reservationSnap.exists) {
    throw new HttpsError('not-found', 'Reservation not found.');
  }

  const reservation = reservationSnap.data()!;
  if (reservation.customerId !== uid) {
    throw new HttpsError('permission-denied', 'You can only pay for your own reservations.');
  }

  if (reservation.status !== 'pending') {
    throw new HttpsError('failed-precondition', 'Only pending reservations can be paid.');
  }

  // Prevent duplicate payment sessions
  const existingPayment = await db
    .collection('payments')
    .where('reservationId', '==', data.reservationId)
    .where('status', 'in', ['pending', 'succeeded'])
    .limit(1)
    .get();

  if (!existingPayment.empty) {
    const existing = existingPayment.docs[0].data() as PaymentRecord;
    if (existing.status === 'succeeded') {
      throw new HttpsError('already-exists', 'This reservation has already been paid.');
    }
  }

  const amount = typeof reservation.totalPrice === 'number' ? reservation.totalPrice : 0;
  if (amount <= 0) {
    throw new HttpsError('failed-precondition', 'Reservation has no valid price.');
  }

  const apiKey = stripeSecretKey.value();
  if (!apiKey) {
    logger.error('STRIPE_SECRET_KEY is not configured.');
    throw new HttpsError('internal', 'Payment service is not configured.');
  }

  try {
    // Use Stripe API via fetch to avoid adding the full Stripe SDK as a dependency.
    // This keeps the Functions bundle small and avoids version-lock issues.
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'payment',
        'payment_method_types[0]': 'card',
        'line_items[0][price_data][currency]': 'eur',
        'line_items[0][price_data][unit_amount]': String(Math.round(amount * 100)),
        'line_items[0][price_data][product_data][name]':
          `Reservation ${data.reservationId.slice(0, 8)} — ${reservation.vehicleName || 'Vehicle'}`,
        'line_items[0][quantity]': '1',
        'success_url': data.successUrl,
        'cancel_url': data.cancelUrl,
        'client_reference_id': data.reservationId,
        'metadata[reservationId]': data.reservationId,
        'metadata[customerId]': uid,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('Stripe Checkout session creation failed', { status: response.status, body: errorBody });
      throw new HttpsError('internal', 'Failed to create payment session.');
    }

    const session = (await response.json()) as { id: string; url: string };

    // Record the pending payment in Firestore
    const paymentRef = db.collection('payments').doc();
    await paymentRef.set({
      id: paymentRef.id,
      reservationId: data.reservationId,
      customerId: uid,
      amount,
      currency: 'eur',
      status: 'pending',
      stripeSessionId: session.id,
      createdAt: new Date().toISOString(),
    } satisfies PaymentRecord);

    await writeAuditLog({
      uid,
      action: 'create_checkout_session',
      collection: 'payments',
      documentId: paymentRef.id,
      details: {
        reservationId: data.reservationId,
        amount,
        stripeSessionId: session.id,
      },
    });

    logger.info('Checkout session created', { uid, reservationId: data.reservationId, sessionId: session.id });
    return { sessionId: session.id, url: session.url };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('Payment session creation failed', { uid, error });
    throw new HttpsError('internal', 'Failed to create payment session. Please try again.');
  }
}
