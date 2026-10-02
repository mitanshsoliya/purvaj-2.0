import pool from '../config/db.js';

/**
 * WhatsApp & SMS Messaging Service for PURVAJ 2.0
 * Architecture: Clean provider abstraction supporting Sandbox mode and Production APIs.
 * Sensitive API keys are strictly read from process.env and never hardcoded.
 */

class MessagingService {
  constructor() {
    this.whatsappEnabled = process.env.WHATSAPP_ENABLED === 'true';
    this.whatsappProvider = process.env.WHATSAPP_PROVIDER || 'sandbox';
    this.whatsappApiKey = process.env.WHATSAPP_API_KEY || '';
    this.whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

    this.smsEnabled = process.env.SMS_ENABLED === 'true';
    this.smsProvider = process.env.SMS_PROVIDER || 'sandbox';
    this.smsApiKey = process.env.SMS_API_KEY || '';
    this.smsSenderId = process.env.SMS_SENDER_ID || 'PURVAJ';
  }

  /**
   * Check shop notification preferences
   */
  async getShopPreferences(shopId) {
    if (!shopId) return null;
    try {
      const res = await pool.query(
        'SELECT * FROM notification_preferences WHERE shop_id = $1',
        [shopId]
      );
      if (res.rows.length > 0) return res.rows[0];

      // Auto-create default preferences if missing
      const insert = await pool.query(
        `INSERT INTO notification_preferences (shop_id) VALUES ($1)
         ON CONFLICT (shop_id) DO UPDATE SET updated_at = NOW() RETURNING *`,
        [shopId]
      );
      return insert.rows[0];
    } catch {
      return null;
    }
  }

  /**
   * Internal logger for WhatsApp/SMS transmissions
   */
  async logMessage({
    channel,
    provider,
    recipient,
    shopId,
    eventType,
    orderId,
    invoiceId,
    paymentId,
    content,
    templateName,
    providerMessageId,
    status,
    failureReason,
    metadata = {},
  }) {
    try {
      await pool.query(
        `INSERT INTO message_logs (
          channel, provider, recipient, shop_id, event_type,
          order_id, invoice_id, payment_id, content, template_name,
          provider_message_id, status, failure_reason, metadata, sent_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
        [
          channel,
          provider,
          recipient || 'unknown',
          shopId || null,
          eventType,
          orderId || null,
          invoiceId || null,
          paymentId || null,
          content,
          templateName || null,
          providerMessageId || null,
          status,
          failureReason || null,
          JSON.stringify(metadata),
        ]
      );
    } catch (err) {
      console.error('Failed to write message log:', err.message);
    }
  }

  /**
   * Send WhatsApp message via configured provider or sandbox
   */
  async sendWhatsApp({ recipient, content, templateName, eventType, shopId, orderId, invoiceId, paymentId, metadata = {} }) {
    if (!recipient) return { success: false, reason: 'Recipient phone missing' };

    // Check preferences unless critical
    const prefs = await this.getShopPreferences(shopId);
    if (prefs && !prefs.channel_whatsapp && !['INVOICE_GENERATED', 'PAYMENT_CONFIRMED'].includes(eventType)) {
      await this.logMessage({
        channel: 'whatsapp',
        provider: this.whatsappProvider,
        recipient,
        shopId,
        eventType,
        orderId,
        invoiceId,
        paymentId,
        content,
        templateName,
        status: 'skipped',
        failureReason: 'Shop opted out of WhatsApp messages',
      });
      return { success: false, reason: 'Shop opted out of WhatsApp' };
    }

    // Sandbox / Development Mode
    if (!this.whatsappEnabled || this.whatsappProvider === 'sandbox' || !this.whatsappApiKey) {
      const mockId = `wa_sbx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await this.logMessage({
        channel: 'whatsapp',
        provider: 'sandbox',
        recipient,
        shopId,
        eventType,
        orderId,
        invoiceId,
        paymentId,
        content,
        templateName,
        providerMessageId: mockId,
        status: 'simulated',
        metadata: { ...metadata, note: 'WhatsApp simulated in sandbox mode. Set WHATSAPP_API_KEY in .env for production.' },
      });
      return { success: true, simulated: true, providerMessageId: mockId };
    }

    // Production Provider (Meta Cloud API / Twilio / Gupshup)
    try {
      if (this.whatsappProvider === 'meta') {
        const url = `https://graph.facebook.com/v19.0/${this.whatsappPhoneId}/messages`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.whatsappApiKey}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: recipient.replace(/\D/g, ''),
            type: 'text',
            text: { body: content },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Meta API error');

        const messageId = data.messages?.[0]?.id || 'meta_ok';
        await this.logMessage({
          channel: 'whatsapp',
          provider: 'meta',
          recipient,
          shopId,
          eventType,
          orderId,
          invoiceId,
          paymentId,
          content,
          templateName,
          providerMessageId: messageId,
          status: 'sent',
          metadata,
        });
        return { success: true, providerMessageId: messageId };
      }

      throw new Error(`Unsupported WhatsApp provider: ${this.whatsappProvider}`);
    } catch (err) {
      console.error('WhatsApp dispatch error:', err.message);
      await this.logMessage({
        channel: 'whatsapp',
        provider: this.whatsappProvider,
        recipient,
        shopId,
        eventType,
        orderId,
        invoiceId,
        paymentId,
        content,
        templateName,
        status: 'failed',
        failureReason: err.message,
      });
      return { success: false, error: err.message };
    }
  }

  /**
   * Send SMS via configured provider or sandbox
   */
  async sendSMS({ recipient, content, eventType, shopId, orderId, invoiceId, paymentId, metadata = {} }) {
    if (!recipient) return { success: false, reason: 'Recipient phone missing' };

    const prefs = await this.getShopPreferences(shopId);
    if (prefs && !prefs.channel_sms && !['INVOICE_GENERATED', 'PAYMENT_CONFIRMED', 'AUTH_OTP'].includes(eventType)) {
      await this.logMessage({
        channel: 'sms',
        provider: this.smsProvider,
        recipient,
        shopId,
        eventType,
        orderId,
        invoiceId,
        paymentId,
        content,
        status: 'skipped',
        failureReason: 'Shop opted out of SMS',
      });
      return { success: false, reason: 'Shop opted out of SMS' };
    }

    if (!this.smsEnabled || this.smsProvider === 'sandbox' || !this.smsApiKey) {
      const mockId = `sms_sbx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await this.logMessage({
        channel: 'sms',
        provider: 'sandbox',
        recipient,
        shopId,
        eventType,
        orderId,
        invoiceId,
        paymentId,
        content,
        providerMessageId: mockId,
        status: 'simulated',
        metadata: { ...metadata, note: 'SMS simulated in sandbox mode. Set SMS_API_KEY in .env for production.' },
      });
      return { success: true, simulated: true, providerMessageId: mockId };
    }

    // Production SMS dispatch (MSG91 / Fast2SMS / Twilio)
    try {
      if (this.smsProvider === 'msg91') {
        const res = await fetch('https://api.msg91.com/api/v5/flow/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authkey: this.smsApiKey,
          },
          body: JSON.stringify({
            flow_id: process.env.MSG91_FLOW_ID || 'flow_purvaj',
            sender: this.smsSenderId,
            recipients: [{ mobiles: recipient, ...metadata }],
          }),
        });
        const data = await res.json();
        const msgId = data.message || 'msg91_sent';
        await this.logMessage({
          channel: 'sms',
          provider: 'msg91',
          recipient,
          shopId,
          eventType,
          orderId,
          invoiceId,
          paymentId,
          content,
          providerMessageId: msgId,
          status: 'sent',
        });
        return { success: true, providerMessageId: msgId };
      }

      throw new Error(`Unsupported SMS provider: ${this.smsProvider}`);
    } catch (err) {
      console.error('SMS dispatch error:', err.message);
      await this.logMessage({
        channel: 'sms',
        provider: this.smsProvider,
        recipient,
        shopId,
        eventType,
        orderId,
        invoiceId,
        paymentId,
        content,
        status: 'failed',
        failureReason: err.message,
      });
      return { success: false, error: err.message };
    }
  }

  // --- Specialized Wholesale Event Triggers ---

  async notifyOrderConfirmed(order, shop) {
    const text = `📦 Order Confirmed! Hello ${shop.shop_name}, wholesale order #${order.order_number} for ₹${parseFloat(order.total).toLocaleString('en-IN')} has been confirmed. Central Warehouse is packing your cartons. Track in Purvaj 2.0.`;
    await Promise.allSettled([
      this.sendWhatsApp({
        recipient: shop.mobile,
        content: text,
        templateName: 'order_confirmed',
        eventType: 'ORDER_CONFIRMED',
        shopId: shop.id,
        orderId: order.id,
      }),
      this.sendSMS({
        recipient: shop.mobile,
        content: text,
        eventType: 'ORDER_CONFIRMED',
        shopId: shop.id,
        orderId: order.id,
      }),
    ]);
  }

  async notifyDeliveryUpdate(orderOrPayload, maybeShop, maybeDeliveryStatus, driverDetails = {}) {
    let orderId, orderNumber, shopId, mobile, deliveryStatus, driverInfo;

    if (orderOrPayload && (orderOrPayload.orderNumber || orderOrPayload.deliveryStatus || orderOrPayload.shopId)) {
      orderId = orderOrPayload.orderId;
      orderNumber = orderOrPayload.orderNumber;
      shopId = orderOrPayload.shopId;
      mobile = orderOrPayload.mobile;
      deliveryStatus = orderOrPayload.deliveryStatus;
      driverInfo = { vehicle_number: orderOrPayload.vehicle_number, ...driverDetails };
    } else {
      orderId = orderOrPayload?.id;
      orderNumber = orderOrPayload?.order_number;
      shopId = maybeShop?.id;
      mobile = maybeShop?.mobile;
      deliveryStatus = maybeDeliveryStatus;
      driverInfo = driverDetails || {};
    }

    const safeStatus = (deliveryStatus || 'UPDATED').toUpperCase().replace(/_/g, ' ');
    const text = `🚚 Delivery Update: Order #${orderNumber || 'N/A'} is now ${safeStatus}. Vehicle: ${driverInfo.vehicle_number || 'Central Warehouse Dispatch'}.`;
    await Promise.allSettled([
      this.sendWhatsApp({
        recipient: mobile,
        content: text,
        templateName: 'delivery_update',
        eventType: 'DELIVERY_UPDATE',
        shopId,
        orderId,
        metadata: { deliveryStatus, ...driverInfo },
      }),
      this.sendSMS({
        recipient: mobile,
        content: text,
        eventType: 'DELIVERY_UPDATE',
        shopId,
        orderId,
      }),
    ]);
  }

  async notifyInvoiceGenerated(invoice, shop) {
    const text = `🧾 GST Tax Invoice Issued: Tax Invoice #${invoice.invoice_number} for ₹${parseFloat(invoice.total).toLocaleString('en-IN')} is ready. Due: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : '15 Days'}. Download bill from Purvaj 2.0.`;
    await Promise.allSettled([
      this.sendWhatsApp({
        recipient: shop.mobile,
        content: text,
        templateName: 'invoice_generated',
        eventType: 'INVOICE_GENERATED',
        shopId: shop.id,
        invoiceId: invoice.id,
      }),
      this.sendSMS({
        recipient: shop.mobile,
        content: text,
        eventType: 'INVOICE_GENERATED',
        shopId: shop.id,
        invoiceId: invoice.id,
      }),
    ]);
  }

  async notifyPaymentConfirmed(payment, shop) {
    const text = `💰 Payment Received: ₹${parseFloat(payment.amount).toLocaleString('en-IN')} credited to ${shop.shop_name} via ${payment.method?.toUpperCase()}. Remaining Udhaar: ₹${parseFloat(shop.credit_used || 0).toLocaleString('en-IN')}. Thank you!`;
    await Promise.allSettled([
      this.sendWhatsApp({
        recipient: shop.mobile,
        content: text,
        templateName: 'payment_confirmed',
        eventType: 'PAYMENT_CONFIRMED',
        shopId: shop.id,
        paymentId: payment.id,
      }),
      this.sendSMS({
        recipient: shop.mobile,
        content: text,
        eventType: 'PAYMENT_CONFIRMED',
        shopId: shop.id,
        paymentId: payment.id,
      }),
    ]);
  }

  async notifyPaymentReminder(shop, outstandingAmount) {
    const text = `⚠️ Payment Reminder: ${shop.shop_name}, you have an outstanding balance of ₹${parseFloat(outstandingAmount).toLocaleString('en-IN')} with Purvaj Central Warehouse. Please clear dues to maintain your credit limit.`;
    await Promise.allSettled([
      this.sendWhatsApp({
        recipient: shop.mobile,
        content: text,
        templateName: 'payment_reminder',
        eventType: 'PAYMENT_REMINDER',
        shopId: shop.id,
      }),
      this.sendSMS({
        recipient: shop.mobile,
        content: text,
        eventType: 'PAYMENT_REMINDER',
        shopId: shop.id,
      }),
    ]);
  }
}

export const messagingService = new MessagingService();
export default messagingService;
