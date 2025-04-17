//////////////////////////////////////////////////////////////////////
import status from '../enums/status';
import exchangeModel from '../models/exchange';
import pairsModel from '../models/pairs'
import { find_paths, execute_paths, } from './triangularHelper';

const directTradingPairs = {
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


const get_quantity = (exchange, tickers, start_tokens, quantity) => {
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

//optimised
async function getPrices(primary, data, fee) {
    if (data) {
        var prepared = {}
        for (let ticker in data) {
            let pair = data[ticker].tradingPair
            let ask = parseFloat(data[ticker].price)
            let bid = parseFloat(data[ticker].price)
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
module.exports = {
    triangularProfitPaths: async (exchange, apiKey, secretKey, passphrase, startToken, depth, amount) => {
        let exchangeData = await exchangeModel.findOne({ exchangeName: exchange });
        if (exchangeData) {
            let tickers = exchangeData['_doc']['tickers'];
            let fee = exchangeData['_doc']['tradeFee'];
            let quantity;
            let data;
            let primary = directTradingPairs[exchange].primary;
            startToken = directTradingPairs[exchange].startTokens;
            try {
                quantity = get_quantity(exchange, tickers, startToken, amount);
                data = await getPrices(primary, tickers, fee)
                    .then((value) => find_paths(value, startToken, depth, quantity, exchange, fee)
                        .then((paths) => execute_paths(paths, exchange, tickers, amount, quantity)));
                return data;
            } catch (error) {
                console.log('triangularProfitPaths function catch 654 ==>', error)
            }
        }
    },
}