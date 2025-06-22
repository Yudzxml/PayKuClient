const axios = require('axios');
const crypto = require('crypto');

class PaykuClient {
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
   * Generate HMAC-SHA256 signature based on timestamp, method, and endpoint path
   * @param {string} method - HTTP method (GET, POST)
   * @param {string} path - API path (e.g. '/transaction/{id}')
   * @param {string} timestamp - UNIX timestamp in milliseconds
   * @returns {string} signature hex string
   */
  generateSignature(method, path, timestamp) {
    const stringToSign = `${timestamp}${method.toUpperCase()}${path}`;
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(stringToSign)
      .digest('hex');
  }

  /**
   * Prepare headers including API key, timestamp, and signature
   * @param {string} method
   * @param {string} path
   * @returns {{ 'X-API-Key': string, 'X-Timestamp': string, 'X-Signature': string }}
   */
  prepareHeaders(method, path) {
    const timestamp = Date.now().toString();
    const signature = this.generateSignature(method, path, timestamp);
    return {
      'X-API-Key': this.apiKey,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
    };
  }

  /**
   * Create a new transaction
   * @param {object} data - transaction payload
   */
  async createTransaction(data) {
    const endpoint = '/create-transaction';
    const headers = this.prepareHeaders('POST', endpoint);
    const response = await this.http.post(endpoint, data, { headers });
    return response.data;
  }

  /**
   * Retrieve a transaction by ID
   * @param {string} transactionId
   */
  async getTransaction(transactionId) {
    const endpoint = `/transaction/${transactionId}`;
    const headers = this.prepareHeaders('GET', endpoint);
    const response = await this.http.get(endpoint, { headers });
    return response.data;
  }

  /**
   * Cancel a transaction by ID
   * @param {string} transactionId
   */
  async cancelTransaction(transactionId) {
    const endpoint = `/transaction/${transactionId}/cancel`;
    const headers = this.prepareHeaders('POST', endpoint);
    const payload = { transaction_id: transactionId };
    const response = await this.http.post(endpoint, payload, { headers });
    return response.data;
  }
}

module.exports = PaykuClient;