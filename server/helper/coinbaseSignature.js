const { sign } = require("jsonwebtoken");
const crypto = require("crypto");
module.exports = {

    signatureGenerate: async (keyname, keysecret, requestmethod, requestpath) => {
        const key_name = keyname
        let key_secret = keysecret
        const request_method = requestmethod;
        const url = "api.coinbase.com";
        const request_path = requestpath;
        const algorithm = "ES256";
        const uri = request_method + " " + url + request_path;
        const token = sign(
            {
                iss: "cdp",
                nbf: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 120,
                sub: key_name,
                uri,
            },
            key_secret,
            {
                algorithm,
                header: {
                    kid: key_name,
                    nonce: crypto.randomBytes(16).toString("hex"),
                },
            }
        );
        return token
    },
}