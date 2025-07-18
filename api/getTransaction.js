/* File: api/getTransaction.js */
const PaykuClient = require('../utils/payku');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing transaction id' });
  }

  try {
    const client = new PaykuClient({
      apiKey: process.env.PAYKU_API_KEY,
      secretKey: process.env.PAYKU_SECRET_KEY,
    });
    const data = await client.getTransaction(id);
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};