module.exports = {
    is_key_buy: (exchange) => {
        let activity = {};
        switch (exchange) {
            case 'Binance':
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                break;
            case 'Coinbase':
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                break;
            case 'Huobi':
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                break;
            case 'Kraken':
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                break;
            case 'Mexc':
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                break;
            case 'Bitmart':
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                break;
            case 'Kucoin':
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isTransfer = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                break;
            case 'Gateio':
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                break;
            case 'HitBTC':
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                break;
        }
        return activity;
    },
    is_key_sell: (exchange) => {
        let activity = {};
        switch (exchange) {
            case 'Binance':
                activity.isAddress = false
                activity.isDeposit = false
                activity.isTrade = false
                activity.isTradeActive = false
                break;
            case 'Coinbase':
                activity.isAddress = false
                activity.isDeposit = false
                activity.isTrade = false
                activity.isTradeActive = false
                break;
            case 'Huobi':
                activity.isAddress = false
                activity.isDeposit = false
                activity.isTrade = false
                activity.isTradeActive = false
                break;
            case 'Kraken':
                activity.isAddress = false
                activity.isDeposit = false
                activity.isTrade = false
                activity.isTradeActive = false
                break;
            case 'Mexc':
                activity.isAddress = false
                activity.isDeposit = false
                activity.isTrade = false
                activity.isTradeActive = false
                break;
            case 'Bitmart':
                activity.isAddress = false
                activity.isDeposit = false
                activity.isTrade = false
                activity.isTradeActive = false
                break;
            case 'Kucoin':
                activity.isAddress = false
                activity.isTransfer = false
                activity.isDeposit = false
                activity.isTrade = false
                activity.isTradeActive = false
                break;
            case 'Gateio':
                activity.isAddress = false
                activity.isDeposit = false
                activity.isTrade = false
                activity.isTradeActive = false
                break;
            case 'HitBTC':
                activity.isAddress = false
                activity.isDeposit = false
                activity.isTrade = false
                activity.isTradeActive = false
                break;
        }
        return activity;
    },
}
