module.exports = {
    orderkeyA: (exchange) => {
        let activity = {};
        switch (exchange) {
            case 'Binance':
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                activity.isStatus = true
                break;
            case 'Huobi':
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                activity.isStatus = true
                break;
            case 'Coinbase':
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                activity.isStatus = true
                break;
            case 'Kraken':
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                activity.isStatus = true
                break;
            case 'Mexc':
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                activity.isStatus = true
                break;
            case 'Bitmart':
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                activity.isStatus = true
                break;
            case 'Gateio':
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                activity.isStatus = true
                break;
            case 'HitBTC':
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                activity.isStatus = true
                break;
        }
        return activity;
    },
    orderkeyB: (exchange) => {
        let activity = {};
        switch (exchange) {
            case 'Binance':
                activity.isAddress = false
                activity.isTransfer = false
                activity.isDeposit = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isStatus = false
                break;
            case 'Huobi':
                activity.isAddress = false
                activity.isDeposit = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isStatus = false
                break;
            case 'Coinbase':
                activity.isAddress = false
                activity.isDeposit = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isStatus = false
                break;
            case 'Kraken':
                activity.isAddress = false
                activity.isDeposit = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isStatus = false
                break;
            case 'Mexc':
                activity.isAddress = false
                activity.isTransfer = false
                activity.isDeposit = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isStatus = false
                break;
            case 'Bitmart':
                activity.isAddress = false
                activity.isTransfer = false
                activity.isDeposit = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isStatus = false
                break;
            case 'Gateio':
                activity.isAddress = false
                activity.isTransfer = false
                activity.isDeposit = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isStatus = false
                break;
            case 'HitBTC':
                activity.isAddress = false
                activity.isTransfer = false
                activity.isDeposit = false
                activity.isWithdraw = false
                activity.isWithdrawActive = false
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isStatus = false
                break;
        }
        return activity;
    },
    orderkeyC: (exchange) => {
        let activity = {};
        switch (exchange) {
            case 'Binance':
                activity.isAddress = false
                activity.isDeposit = false
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isStatus = false
                break;
            case 'Huobi':
                activity.isAddress = false
                activity.isDeposit = false
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isStatus = false
                break;
            case 'Coinbase':
                activity.isAddress = false
                activity.isDeposit = false
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isStatus = false
                break;
            case 'Kraken':
                activity.isAddress = false
                activity.isDeposit = false
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isStatus = false
                break;
            case 'Mexc':
                activity.isAddress = false
                activity.isDeposit = false
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isStatus = false
                break;
            case 'Bitmart':
                activity.isAddress = false
                activity.isTransfer = false
                activity.isDeposit = false
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isStatus = false
                break;
            case 'Gateio':
                activity.isAddress = false
                activity.isDeposit = false
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isStatus = false
                break;
            case 'HitBTC':
                activity.isAddress = false
                activity.isDeposit = false
                activity.isTrade = false
                activity.isTradeActive = false
                activity.isStatus = false
                break;
        }
        return activity;
    },
}