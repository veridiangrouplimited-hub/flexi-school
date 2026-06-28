import { AppError } from '../../utils/AppError';

const BASE =
  process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

async function getAccessToken(): Promise<string> {
  const clientId     = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new AppError(
      'PayPal credentials not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.',
      503,
      'PAYPAL_NOT_CONFIGURED',
    );
  }

  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method:  'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    'grant_type=client_credentials',
  });

  if (!res.ok) throw new AppError('PayPal authentication failed', 502, 'PAYPAL_AUTH_FAILED');
  const { access_token } = await res.json() as { access_token: string };
  return access_token;
}

export interface PayPalOrder {
  orderId:     string;
  approvalUrl: string;
}

export async function createPayPalOrder(params: {
  amount:    string;
  currency:  string;
  invoiceId: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<PayPalOrder> {
  const token = await getAccessToken();

  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: params.invoiceId,
        amount: { currency_code: params.currency, value: params.amount },
      }],
      application_context: {
        brand_name:          'FlexiSchool',
        user_action:         'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
        return_url:          params.returnUrl,
        cancel_url:          params.cancelUrl,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new AppError(`PayPal order creation failed: ${err}`, 502, 'PAYPAL_ORDER_FAILED');
  }

  const order = await res.json() as {
    id:    string;
    links: Array<{ href: string; rel: string }>;
  };

  const approvalUrl = order.links.find((l) => l.rel === 'approve')?.href;
  if (!approvalUrl) throw new AppError('No approval URL in PayPal response', 502, 'PAYPAL_NO_URL');

  return { orderId: order.id, approvalUrl };
}

export async function capturePayPalOrder(orderId: string): Promise<{ status: string }> {
  const token = await getAccessToken();

  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}/capture`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new AppError(`PayPal capture failed: ${err}`, 502, 'PAYPAL_CAPTURE_FAILED');
  }

  return res.json() as Promise<{ status: string }>;
}
