const axios = require("axios");
const OAuth = require("oauth-1.0a");
const crypto = require("crypto");
require("dotenv").config();

const oauth = OAuth({
  consumer: {
    key: process.env.CONSUMER_KEY,
    secret: process.env.CONSUMER_SECRET,
  },
  signature_method: "HMAC-SHA1",
  hash_function(base_string, key) {
    return crypto.createHmac("sha1", key).update(base_string).digest("base64");
  },
});

const token = {
  key: process.env.ACCESS_TOKEN,
  secret: process.env.ACCESS_TOKEN_SECRET,
};

const BASE_URL = "https://secure.splitwise.com/api/v3.0";

async function swGet(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  const requestData = { url, method: "GET" };
  const header = oauth.toHeader(oauth.authorize(requestData, token));
  const res = await axios.get(url, {
    headers: { Authorization: header.Authorization },
  });
  return res.data;
}

async function swPost(endpoint, bodyParams) {
  const url = `${BASE_URL}${endpoint}`;

  // CRITICAL: body params must be included in oauth.authorize for correct signature
  const requestData = { url, method: "POST", data: bodyParams };
  const header = oauth.toHeader(oauth.authorize(requestData, token));

  const params = new URLSearchParams(bodyParams).toString();

  const res = await axios.post(url, params, {
    headers: {
      Authorization: header.Authorization,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  return res.data;
}

module.exports = { swGet, swPost };
