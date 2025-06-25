const axios = require('axios');
const crypto = require('crypto');

/**
 * PaykuClient encapsulates interactions with the PAYKU payment gateway API.
 * @class
 */
class PaykuClient {
  /**
   * @constructor
   * @param {object} config
   * @param {string} config.apiKey - Your PAYKU API key
   * @param {string} config.secretKey - Your PAYKU secret key
   * @param {string} [config.baseURL=https://payku.my.id/api] - Base URL for the PAYKU API
   * @throws {Error} if apiKey or secretKey are missing
   */
  constructor({ apiKey, secretKey, baseURL = 'https://payku.my.id/api' }) {
    if (!apiKey || !secretKey) {
      throw new Error('apiKey and secretKey are required');
    }
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.baseURL = baseURL;
    this.http = axios.create({
      baseURL: this.baseURL,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Generate HMAC-SHA256 signature based on sorted payload and secret key
   * @private
   * @param {object} payload - Request payload (will include timestamp)
   * @returns {string} signature hex string
   */
  generateSignature(payload) {
    // include timestamp and sort keys lexicographically
    const sortedPayload = { ...payload };
    const sortedKeys = Object.keys(sortedPayload).sort();
    // build string in format key1=value1&key2=value2...
    const stringToSign = sortedKeys.map(k => `${k}=${sortedPayload[k]}`).join('&');
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(stringToSign)
      .digest('hex');
  }

  /**
   * Prepare headers including API key, timestamp, and signature
   * @private
   * @param {object} payload - Request payload to be signed
   * @returns {object} headers object
   */
  prepareHeaders(payload) {
    const timestamp = Date.now().toString();
    // merge timestamp into payload copy for signing
    const payloadWithTs = { ...payload, timestamp };
    const signature = this.generateSignature(payloadWithTs);
    return {
      'X-API-Key': this.apiKey,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
    };
  }

  /**
   * Create a new payment transaction
   * @param {object} data - Transaction payload
   * @param {string} data.external_id - Unique ID from your system
   * @param {number} data.amount - Amount in IDR (integer, no decimals)
   * @param {string} [data.description] - Transaction description
   * @param {string} data.customer_name - Customer full name
   * @param {string} data.customer_email - Customer email
   * @param {string} [data.customer_phone] - Customer phone
   * @param {string} [data.webhook_url] - Webhook URL for notifications
   * @returns {Promise<object>} API response data
   */
  async createTransaction(data) {
    const endpoint = '/create-transaction';
    // prepare headers based on payload
    const headers = this.prepareHeaders(data);
    const response = await this.http.post(endpoint, data, { headers });
    return response.data;
  }

  /**
   * Get transaction details
   * @param {string} transactionId - PAYKU transaction ID
   * @returns {Promise<object>} API response data
   */
  async getTransaction(transactionId) {
    const endpoint = `/transaction/${transactionId}`;
    // GET has no body payload, use only timestamp for signature
    const headers = this.prepareHeaders({});
    const response = await this.http.get(endpoint, { headers });
    return response.data;
  }

  /**
   * Cancel a pending transaction
   * @param {string} transactionId - PAYKU transaction ID
   * @returns {Promise<object>} API response data
   */
  async cancelTransaction(transactionId) {
    const endpoint = `/transaction/${transactionId}/cancel`;
    const payload = { transaction_id: transactionId };
    const headers = this.prepareHeaders(payload);
    const response = await this.http.post(endpoint, payload, { headers });
    return response.data;
  }

  /**
   * Withdraw balance to an e-wallet
   * @param {object} data
   * @param {string} data.kode - E-wallet code (e.g., BBSD)
   * @param {number} data.amount - Amount in IDR
   * @param {string} data.phone - Recipient phone number
   * @param {string} data.userId - Your PAYKU userId
   * @returns {Promise<object>} API response data
   */
  async withdraw(data) {
    const endpoint = '/withdraw';
    const headers = this.prepareHeaders(data);
    const response = await this.http.post(endpoint, data, { headers });
    return response.data;
  }

  /**
   * Get account details for your PAYKU account
   * @param {string} userId - Your PAYKU userId
   * @returns {Promise<object>} API response data
   */
  async getAccount(userId) {
    const endpoint = `/account/${userId}`;
    const headers = this.prepareHeaders({});
    const response = await this.http.get(endpoint, { headers });
    return response.data;
  }

  /**
   * Transfer balance to another PAYKU user
   * @param {object} data
   * @param {string} data.recipient_email - Recipient's registered email
   * @param {number} data.amount - Amount in IDR
   * @param {string} [data.description] - Transfer note
   * @returns {Promise<object>} API response data
   */
  async transfer(data) {
    const endpoint = '/transfer';
    const headers = this.prepareHeaders(data);
    const response = await this.http.post(endpoint, data, { headers });
    return response.data;
  }
}

module.exports = PaykuClient;