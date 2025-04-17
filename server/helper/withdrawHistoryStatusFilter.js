module.exports = {
    filter_txIdForWithdraw: (exchange, data, withdrawId) => {
        let obj;
        switch (exchange) {
            case 'Binance':
                if (data) {
                    for (let tx of data) {
                        if (tx.id == withdrawId && tx.status == 6) {
                            obj = {
                                tx_id: tx.id,
                                amount: tx.amount,
                                transactionFee: tx.transactionFee,
                                address: tx.address,
                                withdrawStatus: "SUCCESS",
                            }
                            return obj;
                        }
                        if (tx.id == withdrawId && tx.status == 1) {
                            obj = {
                                tx_id: tx.id,
                                amount: tx.amount,
                                transactionFee: tx.transactionFee,
                                address: tx.address,
                                withdrawStatus: "CANCEL",
                            }
                            return obj;
                        }
                        if (tx.id == withdrawId && tx.status == 4) {
                            obj = {
                                tx_id: tx.id,
                                amount: tx.amount,
                                transactionFee: tx.transactionFee,
                                address: tx.address,
                                withdrawStatus: "PROCESSING",
                            }
                            return obj;
                        }
                        if (tx.id == withdrawId && tx.status == 5) {
                            obj = {
                                tx_id: tx.id,
                                amount: tx.amount,
                                transactionFee: tx.transactionFee,
                                address: tx.address,
                                withdrawStatus: "FAILED",
                            }
                            return obj;
                        }
                        if (tx.id == withdrawId && tx.status == 3) {
                            obj = {
                                tx_id: tx.id,
                                amount: tx.amount,
                                transactionFee: tx.transactionFee,
                                address: tx.address,
                                withdrawStatus: "REJECTED",
                            }
                            return obj;
                        }
                        if (tx.id == withdrawId && tx.status == 0) {
                            obj = {
                                tx_id: tx.id,
                                amount: tx.amount,
                                transactionFee: tx.transactionFee,
                                address: tx.address,
                                withdrawStatus: "APPLY",
                            }
                            return obj;
                        }
                    }
                }
                break;
            case 'Coinbase':
                if (data) {
                    for (let tx of data) {
                        if (tx.id == withdrawId && tx.completed_at != null) {
                            obj = {
                                tx_id: tx.details.crypto_transaction_hash,
                                amount: tx.amount,
                                transactionFee: tx.details.fee,
                                address: tx.details.sent_to_address,
                                withdrawStatus: "SUCCESS",
                            }
                            console.log("txid", obj);
                            return obj;
                        }
                        if (tx.id == withdrawId && tx.canceled_at != null) {
                            obj = {
                                tx_id: tx.details.crypto_transaction_hash,
                                amount: tx.amount,
                                transactionFee: tx.details.fee,
                                address: tx.details.sent_to_address,
                                withdrawStatus: "CANCEL",
                            }
                            console.log("txid", obj);
                            return obj;
                        }
                        if (tx.id == withdrawId && tx.processed_at != null) {
                            obj = {
                                tx_id: tx.details.crypto_transaction_hash,
                                amount: tx.amount,
                                transactionFee: tx.details.fee,
                                address: tx.details.sent_to_address,
                                withdrawStatus: "APPLY",
                            }
                            console.log("txid", obj);
                            return obj;
                        }
                    }
                }
                break;
            case 'Huobi':
                if (data) {
                    for (let tx of data) {
                        if (tx.id == withdrawId && tx.state == 'confirmed') {
                            let tx_id = tx['tx-hash'];
                            console.log("txid", tx_id);
                            return tx_id;
                        }
                    }
                }
                break;
            case 'Kraken':
                if (data) {
                    for (let tx of data) {
                        if (tx.refid == withdrawId && tx.status == 'Success') {
                            obj = {
                                tx_id: tx.txid,
                                amount: tx.amount,
                                transactionFee: tx.fee,
                                address: tx.info,
                                withdrawStatus: "SUCCESS",
                            }
                            console.log("txid", obj);
                            return obj;
                        }
                        if (tx.refid == withdrawId && tx.status == 'Failure') {
                            obj = {
                                tx_id: tx.txid,
                                amount: tx.amount,
                                transactionFee: tx.fee,
                                address: tx.info,
                                withdrawStatus: "FAILED",
                            }
                            console.log("txid", obj);
                            return obj;
                        }
                        if (tx.refid == withdrawId && tx.status == 'Pending') {
                            obj = {
                                tx_id: tx.txid,
                                amount: tx.amount,
                                transactionFee: tx.fee,
                                address: tx.info,
                                withdrawStatus: "APPLY",
                            }
                            console.log("txid", obj);
                            return obj;
                        }
                    }
                }
                break;
            case 'Mexc':
                if (data) {
                    for (let tx of data) {
                        if (tx.id == withdrawId && tx.status == 7) {
                            obj = {
                                tx_id: tx.txId,
                                amount: tx.amount,
                                transactionFee: tx.transactionFee,
                                address: tx.address,
                                withdrawStatus: "SUCCESS"
                            }
                            return obj;
                        }
                        if (tx.id == withdrawId && tx.status == 8) {
                            obj = {
                                tx_id: tx.txId,
                                amount: tx.amount,
                                transactionFee: tx.transactionFee,
                                address: tx.address,
                                withdrawStatus: "FAILED"
                            }
                            return obj;
                        }
                        if (tx.id == withdrawId && tx.status == 9) {
                            obj = {
                                tx_id: tx.txId,
                                amount: tx.amount,
                                transactionFee: tx.transactionFee,
                                address: tx.address,
                                withdrawStatus: "CANCEL"
                            }
                            return obj;
                        }
                        if (tx.id == withdrawId && tx.status == 10) {
                            obj = {
                                tx_id: tx.txId,
                                amount: tx.amount,
                                transactionFee: tx.transactionFee,
                                address: tx.address,
                                withdrawStatus: "MANUAL"
                            }
                            return obj;
                        }
                        if (tx.id == withdrawId && tx.status == 4) {
                            obj = {
                                tx_id: tx.txId,
                                amount: tx.amount,
                                transactionFee: tx.transactionFee,
                                address: tx.address,
                                withdrawStatus: "PROCESSING"
                            }
                            return obj;
                        }
                        if (tx.id == withdrawId && tx.status == 1) {
                            obj = {
                                tx_id: tx.txId,
                                amount: tx.amount,
                                transactionFee: tx.transactionFee,
                                address: tx.address,
                                withdrawStatus: "APPLY"
                            }
                            return obj;
                        }

                    }
                }
                break;
            case 'Bitmart':
                if (data) {
                    for (let tx of data) {
                        if (tx.withdraw_id == withdrawId && tx.status == 3) {
                            obj = {
                                tx_id: tx.tx_id,
                                amount: tx.arrival_amount,
                                transactionFee: tx.fee,
                                address: tx.address,
                                withdrawStatus: "SUCCESS",
                            }
                            return obj;
                        }
                        if (tx.withdraw_id == withdrawId && tx.status == 4) {
                            obj = {
                                tx_id: tx.tx_id,
                                amount: tx.arrival_amount,
                                transactionFee: tx.fee,
                                address: tx.address,
                                withdrawStatus: "CANCEL",
                            }
                            return obj;
                        }
                        if (tx.withdraw_id == withdrawId && tx.status == 0 || tx.status == 1 || tx.status == 2) {
                            obj = {
                                tx_id: tx.tx_id,
                                amount: tx.arrival_amount,
                                transactionFee: tx.fee,
                                address: tx.address,
                                withdrawStatus: "PROCESSING",
                            }
                            return obj;
                        }
                        if (tx.withdraw_id == withdrawId && tx.status == 5) {
                            obj = {
                                tx_id: tx.tx_id,
                                amount: tx.arrival_amount,
                                transactionFee: tx.fee,
                                address: tx.address,
                                withdrawStatus: "FAILED",
                            }
                            return obj;
                        }
                    }
                }
                break;
            case 'Gateio':
                if (data) {
                    for (let tx of data) {
                        if (tx.txid == withdrawId && tx.status == "DONE") {
                            obj = {
                                tx_id: tx.txid,
                                amount: tx.amount,
                                address: tx.address,
                                withdrawStatus: "SUCCESS"
                            }
                            return obj;
                        }
                        if (tx.txid == withdrawId && tx.status == "FAIL") {
                            obj = {
                                tx_id: tx.txid,
                                amount: tx.amount,
                                address: tx.address,
                                withdrawStatus: "FAILED"
                            }
                            return obj;
                        }
                        if (tx.txid == withdrawId && tx.status == "CANCEL") {
                            obj = {
                                tx_id: tx.txid,
                                amount: tx.amount,
                                address: tx.address,
                                withdrawStatus: "CANCEL"
                            }
                            return obj;
                        }
                        if (tx.txid == withdrawId && tx.status == "MANUAL") {
                            obj = {
                                tx_id: tx.txid,
                                amount: tx.amount,
                                address: tx.address,
                                withdrawStatus: "MANUAL"
                            }
                            return obj;
                        }
                        if (tx.txid == withdrawId && tx.status == "PROCES") {
                            obj = {
                                tx_id: tx.txid,
                                amount: tx.amount,
                                address: tx.address,
                                withdrawStatus: "PROCESSING"
                            }
                            return obj;
                        }
                        if (tx.txid == withdrawId && (tx.status == "PEND" || tx.status == "REQUEST" || tx.status == "EXTPEND" || tx.status == "VERIFY" || tx.status == "DMOVE" || tx.status == "SPLITPEND")) {
                            obj = {
                                tx_id: tx.txid,
                                amount: tx.amount,
                                address: tx.address,
                                withdrawStatus: "APPLY"
                            }
                            return obj;
                        }

                    }
                }
                break;
            case 'HitBTC':
                if (data) {
                    for (let tx of data) {
                        if (tx.native.tx_id == withdrawId && tx.status == "SUCCESS") {
                            obj = {
                                tx_id: tx.native.hash,
                                amount: tx.native.amount,
                                address: tx.native.address,
                                withdrawStatus: "SUCCESS"
                            }
                            return obj;
                        }
                        if (tx.native.tx_id == withdrawId && tx.status == "FAILED") {
                            obj = {
                                tx_id: tx.native.hash,
                                amount: tx.native.amount,
                                address: tx.native.address,
                                withdrawStatus: "FAILED"
                            }
                            return obj;
                        }
                        if (tx.native.tx_id == withdrawId && tx.status == "PENDING") {
                            obj = {
                                tx_id: tx.native.hash,
                                amount: tx.native.amount,
                                address: tx.native.address,
                                withdrawStatus: "PROCESSING"
                            }
                            return obj;
                        }
                        if (tx.native.tx_id == withdrawId && tx.status == "CREATED") {
                            obj = {
                                tx_id: tx.native.hash,
                                amount: tx.native.amount,
                                address: tx.native.address,
                                withdrawStatus: "APPLY"
                            }
                            return obj;
                        }

                    }
                }
                break;
        }
    },
}