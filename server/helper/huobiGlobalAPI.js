const util = require('util');
const request = require('request');
const requestPromise = util.promisify(request);
const crypto = require('crypto');
var CryptoJS = require('crypto-js');
var Promise = require('bluebird');
var moment = require('moment');
var HmacSHA256 = require('crypto-js/hmac-sha256')
var http = require('./hbsdkConfig');
const nodeHuobiSdk = require("node-huobi-sdk")
var url = require('url');
const URL = 'https://api.huobipro.com';
import config from "config";
const HOST = url.parse(URL).host;
const REST_URL = 'https://api.huobi.de.com';
const MARKET_WS = 'wss://api.huobi.de.com/ws';
const ACCOUNT_WS = 'wss://api.huobi.de.com/ws/v2';

const baseURL = "https://api.huobi.pro";

function sign_sha(method, baseurl, path, data, secretkey) {
    var pars = [];
    for (let item in data) {
        pars.push(item + "=" + encodeURIComponent(data[item]));
    }
    var p = pars.sort().join("&");
    var meta = [method, baseurl, path, p].join('\n');
    // console.log(meta);
    var hash = HmacSHA256(meta, secretkey);
    var Signature = encodeURIComponent(CryptoJS.enc.Base64.stringify(hash));
    p += `&Signature=${Signature}`;
    return p;
}

function get_body(apiKey) {
    return {
        AccessKeyId: apiKey,
        SignatureMethod: "HmacSHA256",
        SignatureVersion: 2,
        Timestamp: moment.utc().format('YYYY-MM-DDTHH:mm:ss'),
    };
}

function call_api(method, path, payload, body) {
    return new Promise(resolve => {
        var url = `${URL}${path}?${payload}`;
        if (method == 'GET') {
            http.get(url, {
            }).then(data => {
                let json = JSON.parse(data);
                // console.log("call_api 66",json);
                if (json.code == '200') {
                    resolve(json.data);
                } else if (json.status == 'ok') {
                    resolve(json.data);
                } else {
                    // console.log('调用错误', json);
                    resolve(json);
                }
            }).catch(ex => {
                resolve(null);
            });
        }else if (method == 'POST') {
            http.post(url, body, {
            }).then(data => {
                let json = JSON.parse(data);
                // console.log("79",json);
                if (json.code == '200') {
                    resolve(json.data);
                } else if (json.status == 'ok') {
                    resolve(json.data);
                } else {
                    resolve(json);
                }
            }).catch(ex => {
                resolve(null);
            });
        }
    });
}
module.exports = {
    getAllTickers: async () => {
        try {
            let apiEndpoint = "/market/tickers"
            let completeURL = baseURL + apiEndpoint
            let tickers = await requestPromise(`${completeURL}`);
            if (tickers) {
                // tickers = tickers.body
                // console.log(10,  JSON.parse(tickers), 10)
                return tickers.body
            }
        }
        catch (e) {
            console.log(e.message, 15)
        }

    },
    get_account: function (apiKey, secretkey) {
        var path = `/v1/account/accounts`;
        var body = get_body(apiKey);
        var payload = sign_sha('GET', HOST, path, body, secretkey);
        return call_api('GET', path, payload, body);
    },
    get_balance: function (account_id, apiKey, secretkey) {
        var path = `/v1/account/accounts/${account_id}/balance`;
        var body = get_body(apiKey);
        var payload = sign_sha('GET', HOST, path, body, secretkey);
        return call_api('GET', path, payload, body);
    },
    depositAddress: function (asset,apiKey,secretkey) {
        var path = '/v2/account/deposit/address';
        var body = get_body(apiKey);
        body.currency = asset.toLowerCase();
        var payload = sign_sha('GET', HOST, path, body, secretkey);
        return call_api('GET', path, payload, body);
    },
    get_trade_fee: function (secretkey, symbols,apiKey) {
        var path = `/v2/reference/transact-fee-rate`;
        var body = get_body(apiKey);
        body.symbols = symbols
        var payload = sign_sha('GET', HOST, path, body, secretkey);
        return call_api('GET', path, payload, body);
    },
    getRefCurrency: function (secretkey) {
        var path = `/v2/reference/currencies`;
        var body = get_body();
        var payload = sign_sha('GET', HOST, path, body,secretkey);
        return call_api('GET', path, payload, body);
    },
    createOrder: async function (params,apiKey,secretkey){
        // {
        //     "account-id": "100009",
        //     "amount": "10.1",
        //     "price": "100.1",
        //     "source": "api",
        //     "symbol": "ethusdt",
        //     "type": "buy-limit",
        //     "client-order-id": "a0001"
        // }
        var path = '/v1/order/orders/place';
        var body = get_body(apiKey);
        body["account-id"] = params["account-id"];
        body["symbol"] = params.symbol;
        body["type"] = params.type;
        body["amount"] = params.amount;
        body["price"] = params.price;
        body["source"] = params.source;
        body["client-order-id"] = params.clientId
        var payload = sign_sha('POST', HOST, path, body, secretkey);
        return call_api('POST', path, payload, body);
    },
    get_order: function (apiKey, secretkey, order_id) {
        var path = `/v1/order/orders/${order_id}`;
        var body = get_body(apiKey);
        var payload = sign_sha('GET', HOST, path, body, secretkey);
        return call_api('GET', path, payload, body);
    },
    withdraw_request: function (params, apiKey, secretKey) {
        var path = `/v1/dw/withdraw/api/create`;
        var body = get_body(apiKey);
        body.address = params.address;
        body.currency = params.currency;
        body.amount = params.amount;
        body.fee = params.fee;
        var payload = sign_sha('POST', HOST, path, body, secretKey);
        // console.log(body, payload)
        return call_api('POST', path, payload, body);
    },
    withdraw_history: function(type, apiKey, secretKey){
        var path = `/v1/query/deposit-withdraw`;
        var body = get_body(apiKey);
        body.type = type
        var payload = sign_sha('GET', HOST, path, body, secretKey);
        return call_api('GET', path, payload, body);
    },
    direct: async function direct(all_tickers) {
        var BNB_list = []
        var BTC_list = []
        var USDT_list = []
        var ETH_list = []
        var BUSD_list = []
        var token_list = {}
        let list = all_tickers;
        if (list) {
            for (let [sym] of Object.entries(list)) {
                if (sym.endsWith('BNB')) {
                    let token = sym.replace('BNB', "")
                    BNB_list.push(token)
                } else if (sym.endsWith('BTC')) {
                    let token = sym.replace('BTC', "")
                    BTC_list.push(token)
                } else if (sym.endsWith('USDT')) {
                    let token = sym.replace('USDT', "")
                    USDT_list.push(token)
                } else if (sym.endsWith('ETH')) {
                    let token = sym.replace('ETH', "")
                    ETH_list.push(token)
                } else if (sym.endsWith('BUSD')) {
                    let token = sym.replace('BUSD', "")
                    BUSD_list.push(token)
                }
            }
            token_list.BNB = BNB_list;
            token_list.BTC = BTC_list;
            token_list.USDT = USDT_list;
            token_list.ETH = ETH_list;
            token_list.BUSD = BUSD_list;
            return token_list
        }
    },
    intraPriceHuobi: async function intraPriceHuobi(data, primary) {
        var prepared = {}
        for (let ticker of Object.keys(data)) {  //BTCUSDT
            let pair = ticker //BTCUSDT
            let ask = parseFloat(data[ticker].price) //ask
            for (let token in primary) {
                if (pair.startsWith(primary[token])) { //BTCUSDT ends with USDT/BTC/BNB
                    let secondary = pair.replace(primary[token], '')
                    if (secondary != 'BTC' && secondary != 'ETH' && secondary != 'USDT') {
                        // console.log(secondary, 228)
                        secondary = secondary.replace('I','');
                        // console.log(secondary, 231)
                    }
                    if (ask > 0) {
                        if (!prepared[primary[token]])
                            prepared[primary[token]] = {} //USDT:{}
                        prepared[primary[token]][secondary] = [ask, pair] //{USDT:{BTC:1/ask}}
                    }
                }
            }
        }
        // console.log(prepared, 238)
        return prepared
    },
    getPriceHuobi_update: async function getPriceHuobi_update(all_tickers) {
        let primary = ['USDT', 'BTC','BUSD', 'ETH']
        var coinremove = ['BNB', 'XRP', 'LUNA', 'TFUEL', 'XLM', 'IOST', 'KAVA', 'XEM', 'HBAR', 'MDX']
        let data = await all_tickers;
        if (data) {
            var prepared = {}
            for (let ticker of Object.keys(data)) {  //BTCUSDT
                let pair = ticker; 
                var lastPrice=data[ticker].price;
                for (let token in primary) {
                    let base = pair.replace(primary[token],'');
                    if (pair.endsWith(primary[token]) && !coinremove.includes(base)) { //BTCUSDT ends with USDT/BTC/BNB       
                        let secondary = pair.replace(primary[token], '')
                                if (lastPrice > 0) {
                                    if (!prepared[primary[token]])
                                        prepared[primary[token]] = {} //USDT:{}
                                    if (!prepared[secondary])
                                        prepared[secondary] = {} //BTC:{}
                                    prepared[primary[token]][secondary] = [1/lastPrice, pair] //{USDT:{BTC:1/ask}}
                                    prepared[secondary][primary[token]] = [lastPrice, pair] //{BTC:{USDT:bid}}
                                }
                    }
                }
            }
            //console.log('amount',amounts)
            return prepared
        }
    },
    getRefSymbols: function (secretkey) {
        var path = `/v1/common/symbols`;
        var body = get_body();
        var payload = sign_sha('GET', HOST, path, body,secretkey);
        return call_api('GET', path, payload, body);
    },
    cancelOrder: async function (orderId,apiKey,secretkey){
        //reponse
        // { status: 'ok', data: '477443224710944' }
        var path = `/v1/order/orders/${orderId}/submitcancel`;
        var body = get_body(apiKey);
        var payload = sign_sha('POST', HOST, path, body, secretkey);
        return call_api('POST', path, payload, body);
    },
        
}
