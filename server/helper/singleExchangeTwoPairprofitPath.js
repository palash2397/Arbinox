import exchangeModel from '../models/exchange';
import { find_paths, execute_paths, } from './singleEchangeTwoPairHelper';
module.exports = {
    singleExchangeTwoPairProfitPath: async (exchange, startToken, amount) => {
        let exchangeData = await exchangeModel.findOne({ exchangeName: exchange });
        if (exchangeData) {
            let tickers = exchangeData['_doc']['tickers'];
            let fee = exchangeData['_doc']['tradeFee'];
            let quantity;
            let data;
            let primary = tradingPairs[exchange].primary;
            startToken = tradingPairs[exchange].startTokens;
            try {
                quantity = get_quantity(tickers, startToken, amount);
                data = await getPrices(primary, tickers, fee)
                    .then((value) => find_paths(value, startToken, quantity, exchange, fee)
                        .then((paths) => execute_paths(paths, exchange, tickers, amount, quantity)));
                return data;
            } catch (error) {
                console.log('singleExchangeTwoPairProfitPath function catch 18 ==>', error)
            }
        }
    },
}
const get_quantity = (tickers, start_tokens, quantity) => {
    let list = {};
    // console.log(start_tokens, 61)
    for (let token of start_tokens) {
        switch (token) {
            case 'USD':
                list[token] = quantity;
                break;
            case 'USDT':
                list[token] = quantity;
                break;
            default:
                if (tickers[token + 'USDT']) {
                    list[token] = quantity / tickers[token + 'USDT']['price']
                } else if (tickers[token + 'USD']) {
                    list[token] = quantity / tickers[token + 'USD']['price']
                }
                break;
        }
    }
    return list;
}
async function getPrices(primary, data, fee) {
    if (data) {
        var prepared = {}
        for (let ticker in data) {
            let pair = data[ticker].tradingPair
            // let ask = parseFloat(data[ticker].price)
            // let bid = parseFloat(data[ticker].price)
            let ask = Number(toFixedNoRounding(fee[pair].basePrecision, data[ticker].price))
            let bid = Number(toFixedNoRounding(fee[pair].basePrecision, data[ticker].price))
            for (let token in primary) {
                const split_pair = [data[ticker].base, data[ticker].quote]
                if (split_pair[1] == primary[token]) {
                    let secondary = split_pair[0]
                    if (ask > 0 && fee[pair]) {
                        let volume = 0;
                        if (!prepared[primary[token]]) {
                            prepared[primary[token]] = {}
                        }
                        if (!prepared[secondary]) {
                            prepared[secondary] = {}
                        }
                        volume = parseFloat(data[pair]['volume']);
                        prepared[primary[token]][secondary] = [1 / ask, pair, fee[pair].tradefee, volume, ask]
                        prepared[secondary][primary[token]] = [bid, pair, fee[pair].tradefee, volume, bid]
                    }
                }
            }
        }
        return prepared;
    }
}
const tradingPairs = {
    "Binance": {
        startTokens: ['ETH', 'USDT', 'BTC',],
        primary: ['ETH', 'USDT', 'BTC',]
    },
    "Coinbase": {
        startTokens: ['ETH', 'USDT', 'BTC',],
        primary: ['ETH', 'USDT', 'BTC',]
    },
    "Huobi": {
        startTokens: ['ETH', 'USDT', 'BTC',],
        primary: ['ETH', 'USDT', 'BTC',]
    },
    "Kraken": {
        startTokens: ['ETH', 'USDT', 'BTC',],
        primary: ['ETH', 'USDT', 'BTC',]
    },
    "Mexc": {
        startTokens: ['ETH', 'USDT', 'BTC',],
        primary: ['ETH', 'USDT', 'BTC',]
    },
    "Bitmart": {
        startTokens: ['ETH', 'USDT', 'BTC',],
        primary: ['ETH', 'USDT', 'BTC',]
    },
    "Gateio": {
        startTokens: ['ETH', 'USDT', 'BTC',],
        primary: ['ETH', 'USDT', 'BTC',]
    },
    "HitBTC": {
        startTokens: ['ETH', 'USDT', 'BTC',],
        primary: ['ETH', 'USDT', 'BTC',]
    },

}

function toFixedNoRounding(n, quantity) {
    const reg = new RegExp("^-?\\d+(?:\\.\\d{0," + n + "})?", "g")
    const a = quantity.toString().match(reg)[0];
    // console.log(a, a.indexOf("."),296)
    const dot = a.indexOf(".");
    if (dot === -1) { // integer, insert decimal dot and pad up zeros
        return a + "." + "0".repeat(n)
            ;
    }
    const b = n - (a.length - dot) + 1;
    return b > 0 ? (a + "0".repeat(b)) : a;
}