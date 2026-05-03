const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
require('dotenv').config();

const oauth = OAuth({
  consumer: {
    key: process.env.CONSUMER_KEY,
    secret: process.env.CONSUMER_SECRET,
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  },
});

const token = {
  key: process.env.ACCESS_TOKEN,
  secret: process.env.ACCESS_TOKEN_SECRET,
};

function getAuthHeader(url, method = 'GET') {
  const requestData = { url, method };
  const header = oauth.toHeader(oauth.authorize(requestData, token));
  return header.Authorization;
}

module.exports = { getAuthHeader };
