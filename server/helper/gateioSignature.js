const crypto = require('crypto');
const axios = require('axios');
module.exports = {

    signatureGenerate: async (method, url, queryString , payloadString, api_key, secret_key) => {
        const key = api_key;        // api_key
        const secret = secret_key;     // api_secret

        const t = Math.floor(Date.now() / 1000);
        const hashedPayload = crypto.createHash('sha512').update(payloadString).digest('hex');
        const signString = `${method}\n${url}\n${queryString}\n${hashedPayload}\n${t}`;
        const sign = crypto.createHmac('sha512', secret).update(signString).digest('hex');

        return {
            KEY: key,
            Timestamp: t.toString(),
            SIGN: sign
        };
    },
}
