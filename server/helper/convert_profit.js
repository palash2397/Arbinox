const { get_price } = require('./getPrice');
const axios = require('axios');

module.exports = {
    convert_profit: async (exchange, tickers, start_tokens, quantity) => {
        for (let token of start_tokens) {
            switch (exchange) {
                case 'Binance':
                    if (token != 'USDT') {
                        quantity = quantity * tickers[token + 'USDT']['price'];
                    }
                    return quantity;
                    break;
                case 'Huobi':
                    if (token != 'USDT') {
                        quantity = quantity * tickers[token + 'USDT']['price'];
                    }
                    return quantity;
                    break;
                case 'Coinbase':
                    if (token != 'USDT') {
                        quantity = quantity * tickers[token + '-USDT']['price'];
                    }
                    return quantity;
                    break;
                case 'Kraken':
                    if (token != 'USDT') {
                        quantity = quantity * tickers[token + 'USDT']['price'];
                    }
                    return quantity;
                    break;
                case 'Mexc':
                    if (token != 'USDT') {
                        // quantity = quantity * tickers[token + 'USDT']['price'];
                        quantity = Number(quantity) * Number(await convertProfitPriceForMexc(token + 'USDT'))
                    }
                    return quantity;
                    break;
                case 'Bitmart':
                    if (token != 'USDT') {
                        quantity = quantity * tickers[token + '_USDT']['price'];
                    }
                    return quantity;
                    break;
                case 'Gateio':
                    if (token != 'USDT') {
                        quantity = quantity * tickers[token + 'USDT']['price'];
                    }
                    return quantity;
                    break;
                case 'HitBTC':
                    if (token != 'USDT') {
                        quantity = quantity * tickers[token + 'USDT']['price'];
                    }
                    return quantity;
                    break;
            }
        }
    }
}

async function convertProfitPriceForMexc(symbol) {
    var config = {
        method: 'get',
        url: `https://api.mexc.com/api/v3/ticker/24hr?symbol=${symbol}`,
        headers: {}
    };
    let mexcTickers = await axios(config)
    if (mexcTickers.status == 200) {
        return mexcTickers.data.lastPrice
    }
}
