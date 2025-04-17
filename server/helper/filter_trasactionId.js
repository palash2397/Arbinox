module.exports = {
    filter_txId: (exchange, data, withdrawId) => {
        let tx_id;
        switch (exchange) {
            case 'Binance':
                if (data) {
                    for (let tx of data) {
                        if (tx.id == withdrawId && tx.status == 6) {
                            tx_id = tx.txId;
                            console.log("txid", tx_id);
                            return tx_id;
                        }
                    }
                }
                break;
            case 'Coinbase':
                if (data) {
                    for (let tx of data) {
                        if (tx.id == withdrawId && tx.completed_at != null) {
                            tx_id = tx.details.crypto_transaction_hash;
                            // tx_id = tx.tx_id
                            console.log("txid", tx_id);
                            return tx_id;
                        }
                    }
                }
                break;
            case 'Huobi':
                if (data) {
                    for (let tx of data) {
                        if (tx.id == withdrawId && tx.state == 'confirmed') {
                            tx_id = tx['tx-hash'];
                            console.log("txid", tx_id);
                            return tx_id;
                        }
                    }
                }
            case 'Kraken':
                if (data) {
                    for (let tx of data) {
                        if (tx.refid == withdrawId && tx.status == 'Success') {
                            tx_id = tx['txid'];
                            console.log("txid", tx_id);
                            return tx_id;
                        }
                    }
                }
                break;
            case 'Mexc':
                if (data) {
                    for (let tx of data) {
                        if (tx.id == withdrawId && tx.status == 7) {
                            tx_id = tx.txId;
                            // tx_id = tx.id
                            console.log("txid", tx_id);
                            return tx_id;
                        }
                    }
                }
                break;
            case 'Bitmart':
                if (data) {
                    for (let tx of data) {
                        if (tx.withdraw_id == withdrawId && tx.status == 3) {
                            tx_id = tx.tx_id;
                            // tx_id = tx.tx_id
                            console.log("txid", tx_id);
                            return tx_id;
                        }
                    }
                }
                break;
            case 'Gateio':
                if (data) {
                    for (let tx of data) {
                        if (tx.txid == withdrawId && tx.status == "DONE") {
                            tx_id = tx.txid;
                            console.log("txid", tx_id);
                            return tx_id;
                        }
                    }
                }
                break;
            case 'HitBTC':
                if (data) {
                    for (let tx of data) {
                        if (tx.native.tx_id == withdrawId && tx.status == "SUCCESS") {
                            tx_id = tx.native.tx_id;
                            console.log("txid", tx_id);
                            return tx_id;
                        }
                    }
                }
                break;
        }
        // return tx_id;
    },
}
