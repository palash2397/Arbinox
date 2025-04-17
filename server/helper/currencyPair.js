module.exports = {
    get_token: (exchange, base, pair) => {
        let token;
        switch (exchange) {
            case 'Binance':
                return token = base + pair;
                break;
            case 'Kucoin':
                return token = base + '-' + pair;
                break;
            case 'BitFinex':
                console.log('18 ==>', base, pair)
                return token = base + pair;
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
                return token.split('_');
                break;
            case 'Poloniex':
                return token.split('_');
                break;
            case 'Kucoin':
                return token.split('-');
                break;
            case 'Gateio':
                return token.split('_');
                break;
            case 'HitBTC':
                return token.split('_');
                break;
        }
    },

}