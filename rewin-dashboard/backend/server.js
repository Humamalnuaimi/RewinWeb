// FEATURE: Backend Gmail API Email Server
// FILE: server.js
// PURPOSE: Express.js server with Gmail API integration for sending emails
// LAST MODIFIED: January 28, 2025

const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Stripe setup
let stripe = null;
try {
  // Resolve from multiple envs and validate
  let stripeKey = process.env.STRIPE_SECRET_KEY || process.env.Stripe_Secret_key || process.env.STRIPE_KEY || '';
  if (stripeKey && stripeKey.startsWith('REPLACE_')) {
    // Builder placeholder not resolved in this runtime
    console.warn('⚠️ Stripe key placeholder detected; billing routes will be disabled');
    stripeKey = '';
  }
  if (stripeKey && !/^sk_(test|live)_/i.test(stripeKey)) {
    console.warn('⚠️ STRIPE key does not look like sk_...; disabling billing');
    stripeKey = '';
  }
  if (stripeKey) {
    stripe = require('stripe')(stripeKey);
    console.log('✅ Stripe initialized');
  } else {
    console.log('ℹ️ STRIPE_SECRET_KEY not set; billing routes will be disabled');
  }
} catch (e) {
  console.error('❌ Stripe init error:', e);
}

// Middleware
app.use(cors());
// Use raw body for Stripe webhook verification
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Admin auth middleware using Firebase ID tokens
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'alnuaimi.humam@gmail.com').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
async function requireAdmin(req, res, next) {
  try {
    if (!admin.apps.length) {
      if (process.env.ALLOW_NO_ADMIN_AUTH === 'true') return next();
      return res.status(500).json({ success: false, error: 'Firebase Admin not initialized on server' });
    }
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      if (process.env.ALLOW_NO_ADMIN_AUTH === 'true') return next();
      return res.status(401).json({ success: false, error: 'Missing auth token' });
    }
    const decoded = await admin.auth().verifyIdToken(token);
    const email = (decoded.email || '').toLowerCase();
    const isAdmin = decoded.admin === true || ADMIN_EMAILS.includes(email);
    if (!isAdmin) return res.status(403).json({ success: false, error: 'Forbidden' });
    req.user = { uid: decoded.uid, email, isAdmin };
    next();
  } catch (e) {
    if (process.env.ALLOW_NO_ADMIN_AUTH === 'true') return next();
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

// Initialize Firebase Admin SDK (matching old admin panel approach)
try {
  // Load service account from several locations to support different setups
  let serviceAccount;
  const candidatePaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH,
    path.join(require('os').homedir(), 'firebase-keys', 'serviceAccountKey.json'),
    path.resolve(__dirname, 'serviceAccountKey.json'),
    path.resolve(process.cwd(), 'serviceAccountKey.json'),
    path.resolve(__dirname, 'firebase-service-account.json'),
    path.resolve(process.cwd(), 'firebase-service-account.json'),
  ].filter(Boolean);

  for (const p of candidatePaths) {
    try {
      if (p && fs.existsSync(p)) {
        // eslint-disable-next-line import/no-dynamic-require, global-require
        serviceAccount = require(p);
        console.log('✅ Service account loaded from:', p);
        break;
      }
    } catch {}
  }

  if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    console.log('✅ Service account loaded from environment variable');
  }

  if (!serviceAccount) {
    throw new Error('No service account key found via path or env');
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID || 'rewin-f4ca1'}-default-rtdb.firebaseio.com`
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  }
} catch (error) {
  console.error('❌ Firebase Admin SDK initialization failed:', error);
  console.error('💡 Provide FIREBASE_SERVICE_ACCOUNT_KEY or a serviceAccountKey.json next to backend/server.js');
}

// Gmail API configuration
let oauth2Client = null;
let gmailConfig = null;

// Initialize Gmail OAuth2 client
function initializeGmailAPI(config) {
  try {
    oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    // Set refresh token if available
    if (config.refreshToken) {
      oauth2Client.setCredentials({
        refresh_token: config.refreshToken
      });
    }

    gmailConfig = config;
    console.log('📧 Gmail API initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Gmail API:', error);
    return false;
  }
}

// Get authorization URL
app.post('/api/gmail/auth-url', (req, res) => {
  try {
    const { clientId, clientSecret, redirectUri } = req.body;

    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(400).json({
        success: false,
        error: 'Missing required OAuth credentials'
      });
    }

    // Initialize OAuth2 client
    const tempOAuth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Generate auth URL
    const authUrl = tempOAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/gmail.send'],
      prompt: 'consent'
    });

    res.json({
      success: true,
      authUrl: authUrl
    });

  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Exchange authorization code for tokens
app.post('/api/gmail/exchange-token', async (req, res) => {
  try {
    const { clientId, clientSecret, redirectUri, authCode } = req.body;

    if (!clientId || !clientSecret || !redirectUri || !authCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    // Create OAuth2 client
    const tempOAuth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Exchange code for tokens
    const { tokens } = await tempOAuth2Client.getToken(authCode);

    res.json({
      success: true,
      tokens: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date
      }
    });

  } catch (error) {
    console.error('Error exchanging token:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Configure Gmail API
app.post('/api/gmail/configure', (req, res) => {
  try {
    const { clientId, clientSecret, redirectUri, refreshToken, fromEmail, fromName } = req.body;

    if (!clientId || !clientSecret || !redirectUri || !refreshToken || !fromEmail) {
      return res.status(400).json({
        success: false,
        error: 'Missing required configuration parameters'
      });
    }

    const config = {
      clientId,
      clientSecret,
      redirectUri,
      refreshToken,
      fromEmail,
      fromName: fromName || 'Rewin Admin Panel'
    };

    const initialized = initializeGmailAPI(config);

    if (initialized) {
      res.json({
        success: true,
        message: 'Gmail API configured successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to initialize Gmail API'
      });
    }

  } catch (error) {
    console.error('Error configuring Gmail API:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test Gmail API connection
app.post('/api/gmail/test', async (req, res) => {
  try {
    if (!oauth2Client || !gmailConfig) {
      return res.status(400).json({
        success: false,
        error: 'Gmail API not configured. Please configure first.'
      });
    }

    // Get Gmail API instance
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Test by getting user profile
    const profile = await gmail.users.getProfile({ userId: 'me' });

    res.json({
      success: true,
      message: 'Gmail API connection successful',
      profile: {
        emailAddress: profile.data.emailAddress,
        messagesTotal: profile.data.messagesTotal
      }
    });

  } catch (error) {
    console.error('Gmail API test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send email via Gmail API
app.post('/api/gmail/send-email', async (req, res) => {
  try {
    if (!oauth2Client || !gmailConfig) {
      return res.status(400).json({
        success: false,
        error: 'Gmail API not configured. Please configure first.'
      });
    }

    const { to, subject, htmlBody, textBody } = req.body;

    if (!to || !subject || !htmlBody) {
      return res.status(400).json({
        success: false,
        error: 'Missing required email parameters (to, subject, htmlBody)'
      });
    }

    // Create email message
    const emailMessage = createEmailMessage({
      from: `${gmailConfig.fromName} <${gmailConfig.fromEmail}>`,
      to: to,
      subject: subject,
      htmlBody: htmlBody,
      textBody: textBody || htmlBody.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    });

    // Get Gmail API instance
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Send email
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: emailMessage
      }
    });

    console.log('✅ Email sent successfully via Gmail API:', result.data.id);

    res.json({
      success: true,
      messageId: result.data.id,
      message: 'Email sent successfully'
    });

  } catch (error) {
    console.error('Failed to send email via Gmail API:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send user invitation email
app.post('/api/send-invitation', async (req, res) => {
  try {
    if (!oauth2Client || !gmailConfig) {
      return res.status(400).json({
        success: false,
        error: 'Gmail API not configured. Please configure first.'
      });
    }

    const { userEmail, userName, invitationType, setupLink } = req.body;

    if (!userEmail || !userName || !invitationType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required invitation parameters'
      });
    }

    // Get appropriate email template
    const template = invitationType === 'email' 
      ? getUserInvitationTemplate({ userEmail, userName, setupLink })
      : getGmailInvitationTemplate({ userEmail, userName, setupLink });

    const subject = invitationType === 'email' 
      ? 'Welcome to Rewin - Set Up Your Account'
      : 'Welcome to Rewin - Sign In with Google';

    // Create text version
    const textBody = template.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    // Create email message
    const emailMessage = createEmailMessage({
      from: `${gmailConfig.fromName} <${gmailConfig.fromEmail}>`,
      to: userEmail,
      subject: subject,
      htmlBody: template,
      textBody: textBody
    });

    // Get Gmail API instance
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Send email
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: emailMessage
      }
    });

    console.log('✅ Invitation email sent successfully:', result.data.id);

    res.json({
      success: true,
      messageId: result.data.id,
      message: `Invitation sent successfully to ${userEmail}`
    });

  } catch (error) {
    console.error('Failed to send invitation email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to create base64url encoded email message
function createEmailMessage({ from, to, subject, htmlBody, textBody }) {
  const emailLines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="boundary123"',
    '',
    '--boundary123',
    'Content-Type: text/plain; charset=utf-8',
    '',
    textBody,
    '',
    '--boundary123',
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlBody,
    '',
    '--boundary123--'
  ];

  const email = emailLines.join('\r\n');
  
  // Encode to base64url
  return Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// =========================
// BILLING (Stripe) ENDPOINTS
// =========================
if (stripe) {
  let db = null;
  try {
    db = admin.firestore();
  } catch (e) {
    console.error('⚠️ Firestore unavailable: Firebase Admin not initialized');
  }

  // Create/retrieve Stripe customer for a user
  app.post('/api/billing/create-customer', requireAdmin, async (req, res) => {
    try {
      const { uid, email, name } = req.body;
      if (!uid) return res.status(400).json({ success: false, error: 'uid required' });

      let customerId = null;
      if (db) {
        const userRef = db.doc(`users/${uid}`);
        const snap = await userRef.get();
        const data = snap.exists ? snap.data() : {};
        customerId = data?.stripeCustomerId || null;
        if (!customerId) {
          const customer = await stripe.customers.create({ email: email || data?.email || undefined, name: name || data?.displayName || email || undefined, metadata: { uid } });
          customerId = customer.id;
          await userRef.set({ stripeCustomerId: customerId }, { merge: true });
        }
      } else {
        const customer = await stripe.customers.create({ email: email || undefined, name: name || email || undefined, metadata: { uid } });
        customerId = customer.id;
      }

      res.json({ success: true, customerId });
    } catch (err) {
      console.error('create-customer error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // List existing Stripe products and monthly/yearly prices
  app.post('/api/billing/plans', requireAdmin, async (req, res) => {
    try {
      if (!stripe) return res.status(500).json({ success: false, error: 'Stripe not configured on server' });
      const prices = await stripe.prices.list({ active: true, type: 'recurring', expand: ['data.product'], limit: 100 });
      const grouped = new Map();
      for (const pr of prices.data) {
        const prod = typeof pr.product === 'string' ? { id: pr.product, name: pr.nickname || pr.id } : pr.product;
        const g = grouped.get(prod.id) || { productId: prod.id, productName: prod.name || prod.id, monthlyPriceId: null, yearlyPriceId: null, monthlyAmount: null, yearlyAmount: null, currency: pr.currency };
        if (pr.recurring?.interval === 'month') { g.monthlyPriceId = pr.id; g.monthlyAmount = pr.unit_amount; g.currency = pr.currency; }
        if (pr.recurring?.interval === 'year') { g.yearlyPriceId = pr.id; g.yearlyAmount = pr.unit_amount; g.currency = pr.currency; }
        grouped.set(prod.id, g);
      }
      res.json({ success: true, plans: Array.from(grouped.values()) });
    } catch (err) {
      console.error('plans list error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create Stripe product and monthly/yearly prices from USD amounts, and save to user
  app.post('/api/billing/create-plan', requireAdmin, async (req, res) => {
    try {
      if (!stripe) return res.status(500).json({ success: false, error: 'Stripe not configured on server' });

      const { uid, name, monthlyUsd = 0, yearlyUsd = 0, currency = 'usd' } = req.body;
      if (!uid) return res.status(400).json({ success: false, error: 'uid required' });
      const m = Number(monthlyUsd) || 0;
      const y = Number(yearlyUsd) || 0;
      if (m <= 0 && y <= 0) return res.status(400).json({ success: false, error: 'Provide monthlyUsd and/or yearlyUsd > 0' });

      const product = await stripe.products.create({
        name: name || `User ${uid} Plan`,
        metadata: { uid }
      });

      let priceMonthlyId = null;
      let priceYearlyId = null;

      if (m > 0) {
        const p = await stripe.prices.create({
          unit_amount: Math.round(m * 100),
          currency,
          recurring: { interval: 'month' },
          product: product.id,
          metadata: { uid, kind: 'monthly' }
        });
        priceMonthlyId = p.id;
      }

      if (y > 0) {
        const p = await stripe.prices.create({
          unit_amount: Math.round(y * 100),
          currency,
          recurring: { interval: 'year' },
          product: product.id,
          metadata: { uid, kind: 'yearly' }
        });
        priceYearlyId = p.id;
      }

      const payload = {
        productId: product.id,
        priceMonthlyId,
        priceYearlyId,
        priceId: priceMonthlyId || priceYearlyId,
        billingInterval: priceMonthlyId ? 'month' : 'year'
      };
      if (db) await db.doc(`users/${uid}`).set(payload, { merge: true });

      res.json({ success: true, ...payload });
    } catch (err) {
      console.error('create-plan error:', err);
      const message = err?.raw?.message || err?.message || 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // Create Checkout Session (subscription by default)
  app.post('/api/billing/checkout', requireAdmin, async (req, res) => {
    try {
      const { uid, priceId, mode = 'subscription', successUrl, cancelUrl, email } = req.body;
      if (!uid || !priceId || !successUrl || !cancelUrl) return res.status(400).json({ success: false, error: 'uid, priceId, successUrl, cancelUrl required' });

      let customerId = null;
      if (db) {
        const userRef = db.doc(`users/${uid}`);
        const snap = await userRef.get();
        const data = snap.exists ? snap.data() : {};
        customerId = data?.stripeCustomerId || null;
        if (!customerId) {
          const customer = await stripe.customers.create({ email: data?.email || email || undefined, metadata: { uid } });
          customerId = customer.id;
          await userRef.set({ stripeCustomerId: customerId }, { merge: true });
        }
      } else {
        const customer = await stripe.customers.create({ email: email || undefined, metadata: { uid } });
        customerId = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        mode,
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: uid,
        metadata: { uid },
        allow_promotion_codes: true,
      });

      res.json({ success: true, url: session.url, id: session.id });
    } catch (err) {
      console.error('checkout error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create Customer Portal Session
  app.post('/api/billing/portal', requireAdmin, async (req, res) => {
    try {
      const { uid, returnUrl } = req.body;
      if (!uid || !returnUrl) return res.status(400).json({ success: false, error: 'uid and returnUrl required' });
      const userRef = db.doc(`users/${uid}`);
      const data = (await userRef.get()).data() || {};
      if (!data.stripeCustomerId) return res.status(400).json({ success: false, error: 'No stripeCustomerId for user' });

      const session = await stripe.billingPortal.sessions.create({ customer: data.stripeCustomerId, return_url: returnUrl });
      res.json({ success: true, url: session.url });
    } catch (err) {
      console.error('portal error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin sets user's plan (assign Stripe price IDs to user document)
  app.post('/api/billing/set-plan', requireAdmin, async (req, res) => {
    try {
      const { uid, priceId, priceMonthlyId, priceYearlyId, billingInterval } = req.body;
      if (!uid) return res.status(400).json({ success: false, error: 'uid required' });
      const payload = {
        priceId: priceId || null,
        priceMonthlyId: priceMonthlyId || null,
        priceYearlyId: priceYearlyId || null,
        billingInterval: billingInterval === 'year' ? 'year' : (billingInterval === 'month' ? 'month' : null),
      };
      if (db) await db.doc(`users/${uid}`).set(payload, { merge: true });
      res.json({ success: true, ...payload });
    } catch (err) {
      console.error('set-plan error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Subscription controls
  async function getUserData(uid) {
    const snap = await db.doc(`users/${uid}`).get();
    return snap.exists ? snap.data() : {};
  }

  async function ensureSubscriptionId(uid) {
    const data = await getUserData(uid);
    if (data.subscriptionId) return data.subscriptionId;
    if (!data.stripeCustomerId) return null;
    const list = await stripe.subscriptions.list({ customer: data.stripeCustomerId, status: 'all', limit: 3 });
    const sub = list.data.find(s => s.status !== 'canceled') || list.data[0] || null;
    const subId = sub?.id || null;
    if (subId) await db.doc(`users/${uid}`).set({ subscriptionId: subId, subscriptionStatus: sub.pause_collection ? 'paused' : (sub.status === 'active' ? 'active' : sub.status) }, { merge: true });
    return subId;
  }

  app.post('/api/billing/subscription/pause', requireAdmin, async (req, res) => {
    try {
      const { uid } = req.body;
      const subId = await ensureSubscriptionId(uid);
      if (!subId) {
        if (db) await db.doc(`users/${uid}`).set({ subscriptionStatus: 'paused' }, { merge: true });
        return res.json({ success: true, subscription: null, note: 'no-stripe-subscription' });
      }
      const sub = await stripe.subscriptions.update(subId, { pause_collection: { behavior: 'mark_uncollectible' } });
      if (db) await db.doc(`users/${uid}`).set({ subscriptionStatus: 'paused' }, { merge: true });
      res.json({ success: true, subscription: sub });
    } catch (err) {
      console.error('pause error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/billing/subscription/resume', requireAdmin, async (req, res) => {
    try {
      const { uid } = req.body;
      const subId = await ensureSubscriptionId(uid);
      if (!subId) {
        if (db) await db.doc(`users/${uid}`).set({ subscriptionStatus: 'active' }, { merge: true });
        return res.json({ success: true, subscription: null, note: 'no-stripe-subscription' });
      }
      const sub = await stripe.subscriptions.update(subId, { pause_collection: '' });
      if (db) await db.doc(`users/${uid}`).set({ subscriptionStatus: 'active' }, { merge: true });
      res.json({ success: true, subscription: sub });
    } catch (err) {
      console.error('resume error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/billing/subscription/cancel', requireAdmin, async (req, res) => {
    try {
      const { uid, atPeriodEnd = true } = req.body;
      const subId = await ensureSubscriptionId(uid);
      if (!subId) {
        if (db) await db.doc(`users/${uid}`).set({ subscriptionStatus: 'canceled' }, { merge: true });
        return res.json({ success: true, subscription: null, note: 'no-stripe-subscription' });
      }
      const sub = await stripe.subscriptions.update(subId, { cancel_at_period_end: !!atPeriodEnd });
      if (db) await db.doc(`users/${uid}`).set({ subscriptionStatus: atPeriodEnd ? 'active' : 'canceled' }, { merge: true });
      res.json({ success: true, subscription: sub });
    } catch (err) {
      console.error('cancel error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Invoice actions
  app.post('/api/billing/invoice-item', requireAdmin, async (req, res) => {
    try {
      const { uid, amount, description, currency = 'usd' } = req.body;
      const data = await getUserData(uid);
      if (!data.stripeCustomerId) return res.status(400).json({ success: false, error: 'No stripeCustomerId' });
      const item = await stripe.invoiceItems.create({ customer: data.stripeCustomerId, amount: Math.round(amount), currency, description });
      res.json({ success: true, item });
    } catch (err) {
      console.error('invoice-item error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/billing/invoice/create-draft', requireAdmin, async (req, res) => {
    try {
      const { uid, auto_advance = false, collection_method = 'send_invoice', days_until_due = 7 } = req.body;
      const data = await getUserData(uid);
      if (!data.stripeCustomerId) return res.status(400).json({ success: false, error: 'No stripeCustomerId' });
      const invoice = await stripe.invoices.create({ customer: data.stripeCustomerId, auto_advance, collection_method, days_until_due });
      await db.doc(`users/${uid}`).set({ pendingInvoiceId: invoice.id }, { merge: true });
      res.json({ success: true, invoice });
    } catch (err) {
      console.error('create-draft error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/billing/invoice/finalize', requireAdmin, async (req, res) => {
    try {
      const { invoiceId, send = true } = req.body;
      if (!invoiceId) return res.status(400).json({ success: false, error: 'invoiceId required' });
      const finalized = await stripe.invoices.finalizeInvoice(invoiceId);
      if (send) await stripe.invoices.sendInvoice(finalized.id);
      res.json({ success: true, invoice: finalized });
    } catch (err) {
      console.error('finalize error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/billing/invoices/list', requireAdmin, async (req, res) => {
    try {
      const { uid, limit = 10 } = req.body;
      const data = await getUserData(uid);
      if (!data.stripeCustomerId) return res.status(400).json({ success: false, error: 'No stripeCustomerId' });
      const invoices = await stripe.invoices.list({ customer: data.stripeCustomerId, limit });
      res.json({ success: true, invoices: invoices.data });
    } catch (err) {
      console.error('list invoices error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Stripe Webhook
  app.post('/api/billing/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const uid = session.client_reference_id || session.metadata?.uid;
          if (uid) {
            await db.doc(`users/${uid}`).set({
              stripeCustomerId: session.customer,
              subscriptionStatus: 'active',
              subscriptionId: session.subscription || null
            }, { merge: true });
          }
          break;
        }
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object;
          const customerId = invoice.customer;
          const uid = invoice.metadata?.uid || null;
          await updateUserByCustomerId(db, customerId, { subscriptionStatus: 'active', lastInvoiceAt: new Date().toISOString() }, uid);
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          const customerId = invoice.customer;
          const uid = invoice.metadata?.uid || null;
          await updateUserByCustomerId(db, customerId, { subscriptionStatus: 'past_due' }, uid);
          break;
        }
        case 'customer.subscription.updated': {
          const sub = event.data.object;
          const customerId = sub.customer;
          const status = sub.pause_collection ? 'paused' : (sub.status === 'active' ? 'active' : sub.status);
          await updateUserByCustomerId(db, customerId, { subscriptionStatus: status, subscriptionId: sub.id });
          break;
        }
        case 'customer.subscription.deleted': {
          const sub = event.data.object;
          await updateUserByCustomerId(db, sub.customer, { subscriptionStatus: 'canceled' });
          break;
        }
        default:
          break;
      }
      res.json({ received: true });
    } catch (e) {
      console.error('Webhook handling error:', e);
      res.status(500).send('Server error');
    }
  });
}

async function updateUserByCustomerId(db, customerId, updates, fallbackUid) {
  if (!customerId) return;
  const usersRef = db.collection('users');
  const snap = await usersRef.where('stripeCustomerId', '==', customerId).get();
  if (!snap.empty) {
    for (const doc of snap.docs) {
      await doc.ref.set(updates, { merge: true });
    }
  } else if (fallbackUid) {
    await db.doc(`users/${fallbackUid}`).set(updates, { merge: true });
  }
}

// Email templates
function getUserInvitationTemplate({ userEmail, userName, setupLink }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Rewin - Set Up Your Account</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .email-card {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            text-align: center;
        }
        .logo {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            margin: 0 auto 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 32px;
            font-weight: bold;
        }
        .title {
            color: #1e293b;
            font-size: 28px;
            font-weight: 700;
            margin: 0 0 10px;
        }
        .subtitle {
            color: #64748b;
            font-size: 16px;
            margin: 0 0 30px;
        }
        .welcome-text {
            color: #475569;
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 30px;
            text-align: left;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            transition: transform 0.2s ease;
        }
        .info-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin: 30px 0;
            text-align: left;
        }
        .info-title {
            color: #1e293b;
            font-weight: 600;
            margin: 0 0 10px;
        }
        .info-text {
            color: #64748b;
            font-size: 14px;
            margin: 0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 1px solid #e2e8f0;
            color: #94a3b8;
            font-size: 14px;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
        .security-note {
            background: #fef3c7;
            border: 1px solid #fbbf24;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
        }
        .security-note strong {
            color: #92400e;
        }
        .security-note p {
            color: #92400e;
            margin: 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="email-card">
            <div class="logo">R</div>
            <h1 class="title">Welcome to Rewin!</h1>
            <p class="subtitle">You've been invited to join our platform</p>
            
            <div class="welcome-text">
                <p>Hi <strong>${userName}</strong>,</p>
                <p>You've been invited to join <strong>Rewin</strong>, our comprehensive business management platform. We're excited to have you on board!</p>
                <p>To get started, please set up your account by creating a secure password:</p>
            </div>
            
            <a href="${setupLink || '#'}" class="cta-button">Set Up My Account</a>
            
            <div class="info-box">
                <div class="info-title">Your Account Details:</div>
                <p class="info-text">
                    <strong>Email:</strong> ${userEmail}<br>
                    <strong>Account Type:</strong> Business User<br>
                    <strong>Platform:</strong> Rewin Business Management
                </p>
            </div>
            
            <div class="security-note">
                <p><strong>Security Notice:</strong> This invitation link will expire in 24 hours for your security.</p>
            </div>
            
            <div class="info-box">
                <div class="info-title">What happens next?</div>
                <div class="info-text">
                    <p>1. Click the "Set Up My Account" button above</p>
                    <p>2. Create a secure password for your account</p>
                    <p>3. Complete your profile setup</p>
                    <p>4. Start managing your business with Rewin!</p>
                </div>
            </div>
            
            <div class="footer">
                <p>Need help? Contact our support team at <a href="mailto:support@rewin.com">support@rewin.com</a></p>
                <p>This invitation was sent to ${userEmail}. If you didn't expect this email, please ignore it.</p>
                <p>&copy; 2025 Rewin. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

function getGmailInvitationTemplate({ userEmail, userName, setupLink }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Rewin - Sign In with Google</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .email-card {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            text-align: center;
        }
        .logo {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            margin: 0 auto 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 32px;
            font-weight: bold;
        }
        .google-icon {
            width: 60px;
            height: 60px;
            background: white;
            border: 2px solid #e2e8f0;
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .title {
            color: #1e293b;
            font-size: 28px;
            font-weight: 700;
            margin: 0 0 10px;
        }
        .subtitle {
            color: #64748b;
            font-size: 16px;
            margin: 0 0 30px;
        }
        .welcome-text {
            color: #475569;
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 30px;
            text-align: left;
        }
        .cta-button {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            background: white;
            color: #374151;
            text-decoration: none;
            padding: 16px 24px;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .info-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin: 30px 0;
            text-align: left;
        }
        .info-title {
            color: #1e293b;
            font-weight: 600;
            margin: 0 0 10px;
        }
        .info-text {
            color: #64748b;
            font-size: 14px;
            margin: 0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 1px solid #e2e8f0;
            color: #94a3b8;
            font-size: 14px;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
        .security-note {
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
        }
        .security-note strong {
            color: #0369a1;
        }
        .security-note p {
            color: #0369a1;
            margin: 0;
            font-size: 14px;
        }
        .benefits-list {
            text-align: left;
            color: #475569;
            font-size: 14px;
        }
        .benefits-list li {
            margin: 8px 0;
            padding-left: 8px;
        }
        .benefits-list li::marker {
            content: "✓ ";
            color: #10b981;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="email-card">
            <div class="logo">R</div>
            <div class="google-icon">G</div>
            
            <h1 class="title">Welcome to Rewin!</h1>
            <p class="subtitle">You've been invited to join with Google Sign-In</p>
            
            <div class="welcome-text">
                <p>Hi <strong>${userName}</strong>,</p>
                <p>You've been invited to join <strong>Rewin</strong> with Google Sign-In. We're excited to have you on board!</p>
                <p>Since your invitation is set up for Google Sign-In, you can get started immediately:</p>
            </div>
            
            <a href="${setupLink || '#'}" class="cta-button">Sign In with Google</a>
            
            <div class="info-box">
                <div class="info-title">Your Account Details:</div>
                <p class="info-text">
                    <strong>Email:</strong> ${userEmail}<br>
                    <strong>Account Type:</strong> Business User<br>
                    <strong>Sign-In Method:</strong> Google OAuth<br>
                    <strong>Platform:</strong> Rewin Business Management
                </p>
            </div>
            
            <div class="info-box">
                <div class="info-title">Benefits of Google Sign-In:</div>
                <ul class="benefits-list">
                    <li>Quick and secure access with your existing Google account</li>
                    <li>No need to remember another password</li>
                    <li>Enhanced security with Google's authentication</li>
                    <li>Seamless integration with Google services</li>
                </ul>
            </div>
            
            <div class="security-note">
                <p><strong>Secure Access:</strong> Your account is protected by Google's advanced security features.</p>
            </div>
            
            <div class="info-box">
                <div class="info-title">What happens next?</div>
                <div class="info-text">
                    <p>1. Click the "Sign In with Google" button above</p>
                    <p>2. Authorize Rewin to access your Google account</p>
                    <p>3. Complete your profile setup (if needed)</p>
                    <p>4. Start managing your business with Rewin!</p>
                </div>
            </div>
            
            <div class="footer">
                <p>Need help? Contact our support team at <a href="mailto:support@rewin.com">support@rewin.com</a></p>
                <p>This invitation was sent to ${userEmail}. If you didn't expect this email, please ignore it.</p>
                <p>&copy; 2025 Rewin. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

// Delete user from Firebase Auth
app.post('/api/auth/delete-user', async (req, res) => {
  try {
    const { uid, email } = req.body;

    if (!uid) {
      return res.status(400).json({
        success: false,
        error: 'User ID (uid) is required'
      });
    }

    console.log(`🗑️ Backend: Attempting to delete Firebase Auth user: ${uid} (${email})`);

    // Check if Firebase Admin is properly initialized
    if (!admin.apps.length) {
      console.log('⚠️ Firebase Admin SDK not initialized');
      return res.status(500).json({
        success: false,
        error: 'Firebase Admin SDK not initialized. Service account key required for user deletion.'
      });
    }

    try {
      // Follow the old admin panel's approach: Firestore-first deletion
      console.log(`🗑️ Starting FIRESTORE-FIRST deletion for user: ${uid}`);
      
      // 1. Check if user document exists in Firestore
      const userDocRef = admin.firestore().collection('users').doc(uid);
      const userDocSnapshot = await userDocRef.get();
      
      if (!userDocSnapshot.exists) {
        console.log(`❌ User document ${uid} does not exist in Firestore`);
        // Still try to delete from Auth if document doesn't exist
      } else {
        console.log(`✅ Found user document in Firestore: ${uid}`);
      }
      
      // 2. Delete ALL subcollections first (matching old admin panel exactly)
      const collections = [
        // Web dashboard collections
        'web_customers', 
        'web_transactions', 
        'web_visits',
        // Mobile app collections
        'customers', 
        'transactions', 
        'outlets',
        'checkins',
        // Shared collections
        'campaigns',
        'promotions',
        'promotionUsage',
        'customerPromotions',
        'twilio_account',
        'twilio_events'
      ];
      
      let totalDeleted = 0;
      
      for (const collectionName of collections) {
        try {
          const snapshot = await admin.firestore()
            .collection('users').doc(uid)
            .collection(collectionName).get();
          
          if (snapshot.size > 0) {
            const batch = admin.firestore().batch();
            snapshot.docs.forEach(doc => {
              batch.delete(doc.ref);
            });
            await batch.commit();
            totalDeleted += snapshot.size;
            console.log(`✅ Deleted ${snapshot.size} documents from ${collectionName}`);
          }
        } catch (error) {
          console.log(`⚠️ Error deleting ${collectionName}:`, error.message);
        }
      }
      
      // 3. Delete main user document from Firestore
      if (userDocSnapshot.exists) {
        try {
          await userDocRef.delete();
          console.log('✅ Main user document deleted from Firestore');
          totalDeleted += 1;
          
          // Wait for deletion to propagate
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verify deletion
          const deletedDocCheck = await userDocRef.get();
          if (deletedDocCheck.exists) {
            console.error('❌ ERROR: User document still exists after deletion!');
            throw new Error('User document deletion failed - document still exists');
          } else {
            console.log('✅ Verified: User document completely removed from Firestore');
          }
        } catch (error) {
          console.error('❌ Error deleting main user document:', error);
          throw error;
        }
      }
      
      // 4. Revoke all refresh tokens before Auth deletion (matching old admin panel)
      try {
        await admin.auth().revokeRefreshTokens(uid);
        console.log('✅ Revoked all refresh tokens for user');
        
        // Wait for revocation to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.log('⚠️ Could not revoke refresh tokens:', error.message);
      }
      
      // 5. Delete user from Firebase Auth
      await admin.auth().deleteUser(uid);
      console.log(`✅ Successfully deleted Firebase Auth user: ${uid}`);

      res.json({
        success: true,
        message: `User ${uid} deleted successfully from Firebase Auth and Firestore with all associated data`,
        deletedUser: {
          uid,
          email,
          deletedAt: new Date().toISOString(),
          totalDeleted,
          collectionsDeleted: collections.length
        }
      });

    } catch (authError) {
      console.error('❌ Firebase Auth deletion error:', authError);
      
      // Handle specific Firebase Auth errors
      let errorMessage = 'Failed to delete user from Firebase Auth';
      if (authError.code === 'auth/user-not-found') {
        errorMessage = 'User not found in Firebase Auth (may have already been deleted)';
        // Consider this a success since the user doesn't exist
        return res.json({
          success: true,
          message: 'User not found in Firebase Auth (already deleted or never existed)',
          deletedUser: {
            uid,
            email,
            deletedAt: new Date().toISOString(),
            note: 'User was not found in Firebase Auth'
          }
        });
      } else if (authError.code === 'auth/insufficient-permission') {
        errorMessage = 'Insufficient permissions. Service account key required for user deletion.';
      }

      res.status(500).json({
        success: false,
        error: errorMessage,
        code: authError.code || 'unknown'
      });
    }

  } catch (error) {
    console.error('❌ Delete user endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Analytics overview endpoint (copied from original admin panel)
app.get('/api/analytics/overview', async (req, res) => {
  try {
    console.log('📊 Getting analytics overview...');
    
    let totalUsers = 0;
    let totalOutlets = 0;
    let totalCustomers = 0;
    let totalRevenue = 0;

    // Get total users from Firebase Auth (like original admin panel)
    try {
      const usersSnapshot = await admin.auth().listUsers();
      totalUsers = usersSnapshot.users.length;
      console.log(`✅ Found ${totalUsers} users in Firebase Auth`);
    } catch (error) {
      console.log('Could not fetch users, using default value');
      totalUsers = 1; // Default based on what we see in Firebase console
    }

    // Get outlets, customers, and revenue from real data
    try {
      const usersSnapshot = await admin.auth().listUsers();
      
      for (const user of usersSnapshot.users) {
        const userId = user.uid;
        
        // Count outlets for this user
        try {
          const outletsSnapshot = await admin.firestore()
            .collection('users')
            .doc(userId)
            .collection('outlets')
            .get();
          totalOutlets += outletsSnapshot.size;
        } catch (error) {
          console.log(`Could not fetch outlets for user ${userId}`);
        }

        // Count customers for this user
        try {
          const customersSnapshot = await admin.firestore()
            .collection('users')
            .doc(userId)
            .collection('customers')
            .get();
          totalCustomers += customersSnapshot.size;
        } catch (error) {
          console.log(`Could not fetch customers for user ${userId}`);
        }

        // Calculate revenue from transactions
        try {
          const transactionsSnapshot = await admin.firestore()
            .collection('users')
            .doc(userId)
            .collection('web_transactions')
            .get();
          
          transactionsSnapshot.docs.forEach(doc => {
            const transaction = doc.data();
            if (transaction.pointsChanged && transaction.pointsChanged > 0) {
              totalRevenue += transaction.pointsChanged * 0.10; // $0.10 per point
            }
          });
        } catch (error) {
          console.log(`Could not fetch transactions for user ${userId}`);
        }
      }
    } catch (error) {
      console.log('Could not fetch user data for analytics');
    }

    const response = {
      totalUsers,
      totalOutlets,
      totalCustomers,
      totalRevenue: Math.round(totalRevenue * 100) / 100, // Round to 2 decimal places
      recentActivity: [] // Can be populated later if needed
    };

    console.log('📊 Analytics overview:', response);
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error getting analytics overview:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get analytics overview',
      totalUsers: 0,
      totalOutlets: 0,
      totalCustomers: 0,
      totalRevenue: 0
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Gmail Email Server is running',
    timestamp: new Date().toISOString(),
    configured: !!oauth2Client,
    firebaseAdmin: !!admin.apps.length
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Gmail Email Server running on port ${PORT}`);
  console.log(`📧 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
