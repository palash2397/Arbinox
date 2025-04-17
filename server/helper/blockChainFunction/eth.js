let blockChainFunctionController = require('../../api/v1/controllers/cronjob/blockChainFunctionController')
const bip39 = require('bip39');
const {
    hdkey
} = require('ethereumjs-wallet');
const ethers = require('ethers');
import Web3 from "web3"
const web3 = new Web3(blockChainFunctionController.bscRPC);
const web3t = new Web3(blockChainFunctionController.bscRPCT);
const EthereumTx = require("ethereumjs-tx").Transaction;
const common = require("ethereumjs-common");
import axios from "axios"
module.exports = {

    async isValidForBenefit(ipAddressCheckRes) {
        try {
            const myContract = new web3.eth.Contract(blockChainFunctionController.DSCStakeABI, blockChainFunctionController.DSCStakeContractAddress);
            // console.log(myContract,ipAddressCheckRes)
            let result = await myContract.methods.isUserExists(ipAddressCheckRes).call()
            // console.log("result ==  >>isValidForBenefit", result)
            let obj = {  status:result }
            return obj
        } catch (error) {
            console.log("error ==  >>isValidForBenefit", error)
            let obj = {  status: false }
            return obj
        }
    },

    async getTransactionDetailForUsdBuySubscription(txHash,coin) {
        try {
            console.log("=dfkdskfkdsfkdsjfkdsjfkjdskfdsf",txHash)
            await new Promise(resolve => setTimeout(resolve, 1500))
            const receipt = await web3t.eth.getTransactionReceipt(txHash);
            const transaction = await web3t.eth.getTransaction(txHash)
            const block = await web3t.eth.getBlock(receipt.blockNumber);
            if (transaction) {
                const toAddress = transaction.to.toLowerCase();
                if (toAddress === blockChainFunctionController.MultiSigWalletContractAddress.toLowerCase()) {
                    const input = transaction.input;
                    const methodId = input.slice(0, 10);
                    console.log("methodId",methodId)
                    let methodCode ='0xe7c80f17'
                    if(coin=="DSC"){
                        methodCode="0x6215be77"
                    }
                    if (methodId === methodCode) {
                        const recipient = '0x' + input.slice(34, 74);
                        const recipientAddress = await web3t.utils.toChecksumAddress(recipient);
                        const encodedValue = input.slice(10);
                        const valueHex = '0x' + encodedValue;
                        const value = await web3t.utils.toBN(valueHex);
                        const tokenDecimals = 18;
                        const amount = (value.div(await web3t.utils.toBN(10).pow(await web3t.utils.toBN(tokenDecimals)))).toString();
                        return {
                            amount: amount,
                            status: receipt.status,
                            to: receipt.to,
                            from: receipt.from,
                            timestamp: block.timestamp,
                            recipientAddress: recipientAddress.toString()
                        }
                    }
                } else {
                    console.log('This transaction is not a token transfer.');
                    return { status: false }
                }
            }
        } catch (error) {
            console.log("=================>>>>>error",error)
            return { status: false }
        }
    },
    

}