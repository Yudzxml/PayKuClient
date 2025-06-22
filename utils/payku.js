/* File: utils/payku.js */
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

  generateSignature(payload, timestamp) {
    const dataToSign = { ...payload, timestamp };
    const sortedKeys = Object.keys(dataToSign).sort();
    const stringToSign = sortedKeys
      .map(key => `${key}=${dataToSign[key]}`)
      .join('&');

    return crypto
      .createHmac('sha256', this.secretKey)
      .update(stringToSign)
      .digest('hex');
  }

  prepareHeaders(payload) {
    const timestamp = Date.now().toString();
    const signature = this.generateSignature(payload, timestamp);

    return {
      'X-API-Key': this.apiKey,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
    };
  }

  async createTransaction(data) {
    const endpoint = '/create-transaction';
    const headers = this.prepareHeaders(data);
    const response = await this.http.post(endpoint, data, { headers });
    return response.data;
  }

  async getTransaction(transactionId) {
    const endpoint = `/transaction/${transactionId}`;
    const payload = { transaction_id: transactionId };
    const headers = this.prepareHeaders(payload);
    const response = await this.http.get(endpoint, { headers });
    return response.data;
  }

  async cancelTransaction(transactionId) {
    const endpoint = `/transaction/${transactionId}/cancel`;
    const payload = { transaction_id: transactionId };
    const headers = this.prepareHeaders(payload);
    const response = await this.http.post(endpoint, payload, { headers });
    return response.data;
  }
}

module.exports = PaykuClient;