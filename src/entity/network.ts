import BigNumber from "bignumber.js";
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "bip39";
import { hdkey } from "ethereumjs-wallet";
import { bufferToHex, pubToAddress, toChecksumAddress } from "ethereumjs-util";
import Web3 from "web3";
import { AptosAccount, AptosClient, CoinClient, TxnBuilderTypes, MaybeHexString, OptionalTransactionArgs, getAddressFromAccountOrAddress } from "aptos";

import { config } from "../config";
import { Account } from "./account";
import { DataSource } from "./datasource";
import { Assets, USDTAssets, KKCAssets } from "./wallet";
import { ResultError } from "./error";

const EVM_CONTRACT_ABI = require("../evm_contract_abi.json");

export const APTOS = "aptos";
export const BSC = "bsc";
export const POLYGON = "polygon";

export const APT_COIN = "0x1::aptos_coin::AptosCoin";
export const APT_DECIMAL = "100000000";
export const APT_KKC_DECIMAL = "1000000";

const datasource = new DataSource();

export abstract class Network {
  abstract createAccount(): Account;
  abstract fromPrivateKey(privateKey: string): Account;
  abstract fromMnemonic(mnemonic: string): Account;

  abstract getAssets(address: string): Promise<Assets>;
  abstract getKKCAssets(): Promise<KKCAssets>;
  abstract getUSDTAssetsList(addressList: string[]): Promise<USDTAssets[]>;

  abstract toDepositKKC(fromPrivateKey: string, amount: string): Promise<string>;
  abstract toWithdrawKKC(toAddress: string, amount: string): Promise<string>;

  abstract toTransfer(fromPrivateKey: string, toAddress: string, amount: string): Promise<string>;
  abstract toTransferKKC(fromPrivateKey: string, toAddress: string, amount: string): Promise<string>;
}

export class Aptos extends Network {
  derivationPath = "m/44'/637'/0'/0'/0'";

  aptosClient: AptosClient;
  coinClient: MyCoinClient;

  contractAddress: string;

  constructor() {
    super();

    this.aptosClient = new AptosClient(config.aptosRPCUrl);
    this.coinClient = new MyCoinClient(this.aptosClient);

    this.contractAddress = config.aptosContractAddress;
  }

  createAccount(): Account {
    return this.fromMnemonic(generateMnemonic());
  }

  fromPrivateKey(privateKey: string): Account {
    const aptosAccountObj = AptosAccount.fromAptosAccountObject({
      privateKeyHex: privateKey
    }).toPrivateKeyObject();
    const account = new Account();
    account.address = aptosAccountObj.address;
    return account;
  }

  fromMnemonic(mnemonic: string): Account {
    const aptosAccountObj = AptosAccount.fromDerivePath(this.derivationPath, mnemonic).toPrivateKeyObject();
    const account = new Account();
    account.address = aptosAccountObj.address;
    account.mnemonic = mnemonic;
    account.privateKey = aptosAccountObj.privateKeyHex;
    return account;
  }

  async getAssets(address: string): Promise<Assets> {
    const { AccountAddress } = TxnBuilderTypes;
    AccountAddress.fromHex(address);

    let kkc = "0";
    let governanceToken = "0";

    try {
      const typeTag = `0x1::coin::CoinStore<${APT_COIN}>`;
      const kkcTypeTag = `0x1::coin::CoinStore<${this.contractAddress}>`;

      const resources = await this.aptosClient.getAccountResources(address);

      const accountAPTResource = resources.find((r) => r.type === typeTag);
      if (accountAPTResource && accountAPTResource.data) {
        const aptBalance = (accountAPTResource.data as any).coin.value;
        governanceToken = this.fromBigInt(aptBalance, APT_DECIMAL);
      }

      const accountKKCResource = resources.find((r) => r.type === kkcTypeTag);
      if (accountKKCResource && accountKKCResource.data) {
        const kkcBalance = (accountKKCResource.data as any).coin.value;
        kkc = this.fromBigInt(kkcBalance, APT_KKC_DECIMAL);
      }
    } catch (_) {
      //
    }

    const assets = new Assets();
    assets.kkc = kkc;
    assets.governanceToken = governanceToken;
    return assets;
  }

  async getKKCAssets(): Promise<KKCAssets> {
    return datasource.getKKCAssets(config.bscChainID, config.bscContractAddress);
  }

  async getUSDTAssetsList(addressList: string[]): Promise<USDTAssets[]> {
    const list: USDTAssets[] = [];
    for (let i = 0; i < addressList.length; i++) {
      const assets = new USDTAssets();
      assets.address = addressList[i];
      assets.usdt = "0";
      list.push(assets);
    }
    return list;
  }

  toBigInt(apt: string, decimal: string): string {
    let a = "0";
    const bApt = BigNumber(apt);
    if (bApt.isNaN()) {
      throw new ResultError(1005, "invalid number");
    } else {
      if (!bApt.isZero()) {
        a = bApt.multipliedBy(decimal).toFixed();
      }
    }
    return a;
  }

  fromBigInt(bigInt: string, decimal: string): string {
    let b = "0";
    const bBigInt = BigNumber(bigInt);
    if (bBigInt.isNaN()) {
      throw new ResultError(1005, "invalid number");
    } else {
      if (!bBigInt.isZero()) {
        b = bBigInt.div(decimal).toFixed();
      }
    }
    return b;
  }

  async checkTransaction(fromAddress: string, amount?: string): Promise<void> {
    const apt = await this.coinClient.checkBalance(fromAddress);
    const bApt = BigNumber(apt.toString());
    if (amount) {
      if (bApt.isZero() || bApt.isLessThan(amount)) {
        throw new ResultError(4001, "insufficient balance, unable to complete the transaction");
      }
    } else {
      if (bApt.isZero()) {
        throw new ResultError(4001, "insufficient balance, unable to complete the transaction");
      }
    }
  }

  async wrappedWaitForTransaction(txHash: string): Promise<void> {
    try {
      await this.aptosClient.waitForTransaction(txHash, { checkSuccess: true });
    } catch (error) {
    }
  }

  async toDepositKKC(fromPrivateKey: string, amount: string): Promise<string> {
    return this.toTransfer(fromPrivateKey, config.aptosPlatformAddress, amount);
  }

  async toWithdrawKKC(toAddress: string, amount: string): Promise<string> {
    return this.toTransferKKC(config.aptosPlatformPrivateKey, toAddress, amount);
  }

  async toTransfer(fromPrivateKey: string, toAddress: string, amount: string): Promise<string> {
    const { AccountAddress } = TxnBuilderTypes;
    AccountAddress.fromHex(toAddress);

    const aptAmount = this.toBigInt(amount, APT_DECIMAL);

    const fromAccount = AptosAccount.fromAptosAccountObject({
      privateKeyHex: fromPrivateKey
    });
    await this.checkTransaction(fromAccount.address().hex(), aptAmount);

    const txHash = await this.coinClient.transfer(fromAccount, toAddress, BigInt(aptAmount), { createReceiverIfMissing: true });
    this.wrappedWaitForTransaction(txHash);
    return txHash;
  }

  async toTransferKKC(fromPrivateKey: string, toAddress: string, amount: string): Promise<string> {
    const { AccountAddress } = TxnBuilderTypes;
    AccountAddress.fromHex(toAddress);

    const kkcAmount = this.toBigInt(amount, APT_KKC_DECIMAL);

    const fromAccount = AptosAccount.fromAptosAccountObject({
      privateKeyHex: fromPrivateKey
    });
    await this.checkTransaction(fromAccount.address().hex());

    const txHash = await this.coinClient.transfer(fromAccount, toAddress, BigInt(kkcAmount), { coinType: this.contractAddress });
    // const txHash = await this.coinClient.transferCoin(fromAccount, toAddress, BigInt(kkcAmount), this.contractAddress);
    this.wrappedWaitForTransaction(txHash);
    return txHash;
  }
}

export class EVM extends Network {
  derivationPath = "m/44'/60'/0'/0/0";

  web3: Web3;

  network: string;
  contractAddress: string;

  constructor(network: string) {
    super();

    switch (network) {
      case BSC:
        this.web3 = new Web3(config.bscRPCUrl);

        this.contractAddress = config.bscContractAddress;
        break;
      case POLYGON:
        this.web3 = new Web3(config.polygonRPCUrl);

        this.contractAddress = config.polygonContractAddress;
        break;
    }

    this.network = network;
  }

  createAccount(): Account {
    return this.fromMnemonic(generateMnemonic());
  }

  fromPrivateKey(privateKey: string): Account {
    const ethAccount = this.web3.eth.accounts.privateKeyToAccount(privateKey);
    const account = new Account();
    account.address = ethAccount.address;
    return account;
  }

  fromMnemonic(mnemonic: string): Account {
    const hdWallet = hdkey.fromMasterSeed(mnemonicToSeedSync(mnemonic)).derivePath(this.derivationPath).getWallet();
    const account = new Account();
    account.address = toChecksumAddress(bufferToHex(pubToAddress(hdWallet.getPublicKey(), true)));
    account.mnemonic = mnemonic;
    account.privateKey = bufferToHex(hdWallet.getPrivateKey());
    return account;
  }

  async getAssets(address: string): Promise<Assets> {
    if (!this.web3.utils.isAddress(address)) {
      throw new ResultError(1003, "invalid address");
    }

    let governanceToken = "0";
    let kkc = "0";


    try {
      const ethBalance = await this.web3.eth.getBalance(address);
      governanceToken = this.fromWei(ethBalance);
    } catch (_) {
      //
    }

    try {
      const contract = new this.web3.eth.Contract(EVM_CONTRACT_ABI, this.contractAddress);
      const kkcBalance = await contract.methods.balanceOf(address).call();
      kkc = this.fromWei(kkcBalance);
    } catch (_) {
      //
    }

    const assets = new Assets();
    assets.kkc = kkc;
    assets.governanceToken = governanceToken;
    return assets;
  }

  async getKKCAssets(): Promise<KKCAssets> {
    return datasource.getKKCAssets(config.bscChainID, config.bscContractAddress);
  }

  async getUSDTAssetsList(addressList: string[]): Promise<USDTAssets[]> {
    if (!addressList.length) {
      return [];
    }

    for (let i = 0; i < addressList.length; i++) {
      if (!this.web3.utils.isAddress(addressList[i])) {
        throw new ResultError(1003, "invalid address");
      }
    }

    let chainId = "";
    switch (this.network) {
      case BSC:
        chainId = config.bscChainID;
        break;
      case POLYGON:
        chainId = config.polygonChainID;
        break;
    }

    return await datasource.getUSDTAssetsList(chainId, addressList);
  }

  toWei(eth: string): string {
    let wei = "0";
    const bEth = BigNumber(eth);
    if (bEth.isNaN()) {
      throw new ResultError(1005, "invalid number");
    } else {
      if (!bEth.isZero()) {
        wei = this.web3.utils.toWei(bEth.toFixed());
      }
    }
    return wei;
  }

  fromWei(wei: string): string {
    let eth = "0";
    const bWei = BigNumber(wei);
    if (bWei.isNaN()) {
      throw new ResultError(1005, "invalid number");
    } else {
      if (!bWei.isZero()) {
        eth = this.web3.utils.fromWei(bWei.toFixed());
      }
    }
    return eth;
  }

  async checkTransaction(fromAddress: string, amount?: string): Promise<void> {
    const gas = await this.web3.eth.getGasPrice();
    const eth = await this.web3.eth.getBalance(fromAddress);
    const bEth = BigNumber(eth);
    if (amount) {
      if (bEth.isZero() || bEth.isLessThan(BigNumber(gas).plus(amount))) {
        throw new ResultError(4001, "insufficient balance, unable to complete the transaction");
      }
    } else {
      if (bEth.isZero() || bEth.isLessThan(gas)) {
        throw new ResultError(4001, "insufficient balance, unable to complete the transaction");
      }
    }
  }

  async wrappedSendSignedTransaction(rawTransaction: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.web3.eth.sendSignedTransaction(rawTransaction, (error, hash) => {
        if (!error) {
          resolve(hash);
        } else {
          reject(error);
        }
      })
        .on("receipt", function (receipt) {
          console.log(receipt);
        });
    });
  }

  async toDepositKKC(fromPrivateKey: string, amount: string): Promise<string> {
    let platformAddress = "";
    switch (this.network) {
      case BSC:
        platformAddress = config.bscPlatformAddress;
        break;
      case POLYGON:
        platformAddress = config.polygonPlatformAddress;
        break;
    }

    return this.toTransferKKC(fromPrivateKey, platformAddress, amount);
  }

  async toWithdrawKKC(toAddress: string, amount: string): Promise<string> {
    let platformPrivateKey = "";
    switch (this.network) {
      case BSC:
        platformPrivateKey = config.bscPlatformPrivateKey;
        break;
      case POLYGON:
        platformPrivateKey = config.polygonPlatformPrivateKey;
        break;
    }

    return this.toTransferKKC(platformPrivateKey, toAddress, amount);
  }

  async toTransfer(fromPrivateKey: string, toAddress: string, amount: string): Promise<string> {
    if (!this.web3.utils.isAddress(toAddress)) {
      throw new ResultError(1003, "invalid address");
    }

    const ethAmount = this.toWei(amount);

    const ethAccount = this.web3.eth.accounts.privateKeyToAccount(fromPrivateKey);
    await this.checkTransaction(ethAccount.address, ethAmount);

    const txParams = {
      "to": toAddress,
      "value": this.web3.utils.toHex(ethAmount),
      "gasLimit": this.web3.utils.toHex(30000),
    };
    const tx = await ethAccount.signTransaction(txParams);
    if (tx && tx.rawTransaction) {
      return this.wrappedSendSignedTransaction(tx.rawTransaction);
    }

    throw new ResultError(1004, "invalid sign");
  }

  async toTransferKKC(fromPrivateKey: string, toAddress: string, amount: string): Promise<string> {
    if (!this.web3.utils.isAddress(toAddress)) {
      throw new ResultError(1003, "invalid address");
    }

    const kkcAmount = this.toWei(amount);

    const ethAccount = this.web3.eth.accounts.privateKeyToAccount(fromPrivateKey);
    await this.checkTransaction(ethAccount.address);

    const contract = new this.web3.eth.Contract(EVM_CONTRACT_ABI, this.contractAddress);

    const txParams = {
      "to": this.contractAddress,
      "value": "0x00",
      "data": contract.methods.transfer(toAddress, kkcAmount).encodeABI(),
      "gasLimit": this.web3.utils.toHex(3000000),
    };
    const tx = await ethAccount.signTransaction(txParams);
    if (tx && tx.rawTransaction) {
      return this.wrappedSendSignedTransaction(tx.rawTransaction);
    }

    throw new ResultError(1004, "invalid sign");
  }
}

export class NetworkFactory {
  public static create(network: string): Network {
    switch (network) {
      case APTOS:
        return new Aptos();
      case BSC:
      case POLYGON:
        return new EVM(network);
    }
  }
}

export const networkValidator = (network: string): boolean => {
  switch (network) {
    case APTOS:
    case BSC:
    case POLYGON:
      return true;
  }
  return false;
};

export const addressValidator = (address: string): boolean => {
  return !!address;
};

export const mnemonicValidator = (mnemonic: string): boolean => {
  return validateMnemonic(mnemonic);
};

export const privateKeyValidator = (privateKey: string): boolean => {
  return !!privateKey;
};

class MyCoinClient extends CoinClient {
  constructor(aptosClient: AptosClient) {
    super(aptosClient);
  }

  async transferCoin(
    from: AptosAccount,
    to: AptosAccount | MaybeHexString,
    amount: number | bigint,
    coinType: string,
  ): Promise<string> {
    const func = "0x1::aptos_account::transfer_coins";

    const typeArgs = [coinType];

    // Get the receiver address from the AptosAccount or MaybeHexString.
    const toAddress = getAddressFromAccountOrAddress(to);

    const rawTxn = await this.aptosClient.generateTransaction(from.address(), {
      function: func,
      type_arguments: typeArgs,
      arguments: [toAddress, amount],
    });

    const bcsTxn = await this.aptosClient.signTransaction(from, rawTxn);
    const pendingTxn = await this.aptosClient.submitTransaction(bcsTxn);
    return pendingTxn.hash;
  }
}