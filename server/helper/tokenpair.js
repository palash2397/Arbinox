module.exports = {
    get_token: (exchange, base, pair) => {
        let token;
        switch (exchange) {
            case 'Binance':
                return token = base + pair;
                break;
            case 'Coinbase':
                return token = base + '-' + pair;
                break;
            case 'Huobi':
                return token = base + pair;
            case 'Kraken':
                return token = base + pair;
            case 'Mexc':
                return token = base + pair;
            case 'Bitmart':
                return token = base + '_' + pair;
                break;
            case 'Gateio':
                return token = base + '_' + pair;
                break;
            case 'HitBTC':
                return token = base + pair;
                break;
        }
    },
    split_token: (exchange, token) => {
        switch (exchange) {
            case 'Binance':
                return token.split('');
                break;
            case 'Coinbase':
                return token.split('-');
                break;
            case 'Huobi':
                return token.split('');
                break;
            case 'Kraken':
                return token.split('');
                break;
            case 'Mexc':
                return token.split('');
                break;
            case 'Bitmart':
                return token.split('_');
                break;
            case 'Gateio':
                return token.split('_');
                break;
            case 'HitBTC':
                return token.split('');
                break;
        }
    },
}