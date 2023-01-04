import BigNumber from "bignumber.js";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import { hdkey } from "ethereumjs-wallet";
import { bufferToHex, pubToAddress, toChecksumAddress } from "ethereumjs-util";
import Web3 from "web3";
import { AptosAccount, AptosClient, CoinClient } from "aptos";

import { config } from "../config";
import { Account } from "./account";
import { Assets, USDTAssets } from "./wallet";
import { Result } from "../entity/result";

const EVM_ABI = require("../evm_abi.json");

export const APTOS = "aptos";
export const BSC = "bsc";
export const POLYGON = "polygon";

export const BSC_TEST_RPC_URL = "https://rpc.ankr.com/bsc";
export const POLYGON_TEST_RPC_URL = "https://polygon-rpc.com/";
export const APTOS_TEST_RPC_URL = "https://fullnode.testnet.aptoslabs.com";
export const BSC_RPC_URL = "https://rpc.ankr.com/bsc";
export const POLYGON_RPC_URL = "https://polygon-rpc.com/";
export const APTOS_RPC_URL = "https://fullnode.mainnet.aptoslabs.com";

export const APTOS_TEST_CONTRACT_ADDRESS = "0xf0faa1ba6a30096987258e36a668a0b942dd59542580590ccbaf84c99ba52d1::knoknok_coin::KnoknokCoin";
export const APTOS_CONTRACT_ADDRESS = "0xaa423d9c1a8029c1caa60ac4a4b1de3e323ddfa84ca5d74643624f8fd62ebe7b::knoknok_coin::KnoknokCoin";
export const BSC_TEST_CONTRACT_ADDRESS = "0x2e1a87C9a9b121c0A72aE64d99138f586ffb8929";
export const BSC_CONTRACT_ADDRESS = "0x2e1a87C9a9b121c0A72aE64d99138f586ffb8929";
export const POLYGON_TEST_CONTRACT_ADDRESS = "0xEB368ae8720eF0CCb6DC1927a7c322065e524dc3";
export const POLYGON_CONTRACT_ADDRESS = "0xEB368ae8720eF0CCb6DC1927a7c322065e524dc3";

export const BSC_PLATFORM_ADDRESS = "";
export const POLYGON_PLATFORM_ADDRESS = "";
export const APTOS_PLATFORM_ADDRESS = "";
export const APTOS_PLATFORM_PRIVATEKEY = "";

export const APT_DECIMAL = "100000000";
export const APT_KKC_DECIMAL = "1000000";

export abstract class Network {
  abstract createAccount(): Account;
  abstract fromPrivateKey(privateKey: string): Account;
  abstract fromMnemonic(mnemonic: string): Account;

  abstract getAssets(address: string): Promise<Assets>;
  abstract getKKCAssetsData(): Promise<>;
  abstract getUSDTAssetsList(addressList: string[]): Promise<USDTAssets[]>;

  abstract toDepositKKC(fromPrivateKey: string, amount: string): Promise<string>;
  abstract toWithdrawKKC(toAddress: string, amount: string): Promise<string>;

  abstract toTransfer(fromPrivateKey: string, toAddress: string, amount: string): Promise<string>;
  abstract toTransferKKC(fromPrivateKey: string, toAddress: string, amount: string): Promise<string>;
}

export class Aptos extends Network {
  derivationPath = "m/44'/637'/0'/0'/0'";

  aptosClient: AptosClient;
  coinClient: CoinClient;

  contractAddress: string;

  constructor() {
    super();
    if (config.isDevMode) {
      this.aptosClient = new AptosClient(APTOS_TEST_RPC_URL);
      this.contractAddress = APTOS_TEST_CONTRACT_ADDRESS;
    } else {
      this.aptosClient = new AptosClient(APTOS_RPC_URL);
      this.contractAddress = APTOS_CONTRACT_ADDRESS;
    }
    this.coinClient = new CoinClient(this.aptosClient);
  }

  createAccount(): Account {
    const mnemonic = generateMnemonic();
    const aptosAccount = AptosAccount.fromDerivePath(this.derivationPath, mnemonic).toPrivateKeyObject();
    const account = new Account();
    account.address = aptosAccount.address;
    account.mnemonic = mnemonic;
    account.privateKey = aptosAccount.privateKeyHex;
    return account;
  }

  fromPrivateKey(privateKey: string): Account {
    const aptosAccount = AptosAccount.fromAptosAccountObject({
      privateKeyHex: privateKey
    }).toPrivateKeyObject();
    const account = new Account();
    account.address = aptosAccount.address;
    return account;
  }

  fromMnemonic(mnemonic: string): Account {
    const aptosAccount = AptosAccount.fromDerivePath(this.derivationPath, mnemonic).toPrivateKeyObject();
    const account = new Account();
    account.address = aptosAccount.address;
    account.privateKey = aptosAccount.privateKeyHex;
    return account;
  }

  async getAssets(address: string): Promise<Assets> {
    let apt = "0";
    try {
      const aptBalance = await this.coinClient.checkBalance(address);
      if (aptBalance) {
        apt = BigNumber(aptBalance.toString()).div(APT_DECIMAL).toString();
      }
    } catch (_) {
      //
    }

    let kkc = "0";
    try {
      const kkcBalance = await this.coinClient.checkBalance(address, { coinType: this.contractAddress });
      if (kkcBalance) {
        kkc = BigNumber(kkcBalance.toString()).div(APT_KKC_DECIMAL).toString();
      }
    } catch (_) {
      //
    }

    const assets = new Assets();
    assets.id = address;
    assets.kkc = kkc;
    assets.balance = apt;
    return assets;
  }

  async getUSDTAssetsList(addressList: string[]): Promise<USDTAssets[]> {
    const list: USDTAssets[] = [];
    for (let i = 0; i < addressList.length; i++) {
      const assets = new USDTAssets();
      assets.id = addressList[i];
      assets.usdt = "0";
      list.push(assets);
    }
    return list;
  }

  async toDepositKKC(fromPrivateKey: string, amount: string): Promise<string> {
    let kkcAmount = 0n;
    if (Number(amount)) {
      kkcAmount = BigInt(BigNumber(amount).multipliedBy(APT_KKC_DECIMAL).toString());
    } else {
      return "";
    }

    const fromAccount = AptosAccount.fromAptosAccountObject({
      privateKeyHex: fromPrivateKey
    });

    const txHash = await this.coinClient.transfer(fromAccount, APTOS_PLATFORM_ADDRESS, kkcAmount, { coinType: this.contractAddress });
    this.aptosClient.waitForTransaction(txHash, { checkSuccess: true });

    return txHash;
  }

  async toWithdrawKKC(toAddress: string, amount: string): Promise<string> {
    let kkcAmount = 0n;
    if (Number(amount)) {
      kkcAmount = BigInt(BigNumber(amount).multipliedBy(APT_KKC_DECIMAL).toString());
    } else {
      return "";
    }

    const fromAccount = AptosAccount.fromAptosAccountObject({
      privateKeyHex: APTOS_PLATFORM_PRIVATEKEY
    });

    const txHash = await this.coinClient.transfer(fromAccount, toAddress, kkcAmount, { coinType: this.contractAddress });
    this.aptosClient.waitForTransaction(txHash, { checkSuccess: true });

    return txHash;
  }

  async toTransfer(fromPrivateKey: string, toAddress: string, amount: string): Promise<string> {
    let aptAmount = 0n;
    if (Number(amount)) {
      aptAmount = BigInt(BigNumber(amount).multipliedBy(APT_DECIMAL).toString());
    } else {
      return "";
    }

    const fromAccount = AptosAccount.fromAptosAccountObject({
      privateKeyHex: fromPrivateKey
    });

    return this.coinClient.transfer(fromAccount, toAddress, aptAmount);
  }

  async toTransferKKC(fromPrivateKey: string, toAddress: string, amount: string): Promise<string> {
    let kkcAmount = 0n;
    if (Number(amount)) {
      kkcAmount = BigInt(BigNumber(amount).multipliedBy(APT_KKC_DECIMAL).toString());
    } else {
      return "";
    }

    const fromAccount = AptosAccount.fromAptosAccountObject({
      privateKeyHex: fromPrivateKey
    });

    return this.coinClient.transfer(fromAccount, toAddress, kkcAmount, { coinType: this.contractAddress });
  }
}

export class EVM extends Network {
  derivationPath = "m/44'/60'/0'/0/0";

  web3: Web3;

  contractAddress: string;

  constructor(network: string) {
    super();
    if (config.isDevMode) {
      switch (network) {
        case BSC:
          this.web3 = new Web3(BSC_TEST_RPC_URL);
          this.contractAddress = BSC_TEST_CONTRACT_ADDRESS;
          break;
        case POLYGON:
          this.web3 = new Web3(POLYGON_TEST_RPC_URL);
          this.contractAddress = POLYGON_TEST_CONTRACT_ADDRESS;
          break;
        default:
          throw new Error("network not found.");
      }
    } else {
      switch (network) {
        case BSC:
          this.web3 = new Web3(BSC_RPC_URL);
          this.contractAddress = BSC_CONTRACT_ADDRESS;
          break;
        case POLYGON:
          this.web3 = new Web3(POLYGON_RPC_URL);
          this.contractAddress = POLYGON_CONTRACT_ADDRESS;
          break;
        default:
          throw new Error("network not found.");
      }
    }
  }

  createAccount(): Account {
    const mnemonic = generateMnemonic();
    const hdWallet = hdkey.fromMasterSeed(mnemonicToSeedSync(mnemonic)).derivePath(this.derivationPath).getWallet();
    const account = new Account();
    account.address = toChecksumAddress(bufferToHex(pubToAddress(hdWallet.getPublicKey(), true)));
    account.mnemonic = mnemonic;
    account.privateKey = bufferToHex(hdWallet.getPrivateKey());
    return account;
  }

  fromPrivateKey(privateKey: string): Account {
    const wallet = this.web3.eth.accounts.privateKeyToAccount(privateKey);
    const account = new Account();
    account.address = wallet.address;
    return account;
  }

  fromMnemonic(mnemonic: string): Account {
    const hdWallet = hdkey.fromMasterSeed(mnemonicToSeedSync(mnemonic)).derivePath(this.derivationPath).getWallet();
    const account = new Account();
    account.address = toChecksumAddress(bufferToHex(pubToAddress(hdWallet.getPublicKey(), true)));
    account.privateKey = bufferToHex(hdWallet.getPrivateKey());
    return account;
  }

  async getAssets(address: string): Promise<Assets> {
    let balance = "0";
    try {
      const ethBalance = await this.web3.eth.getBalance(address);
      if (Number(ethBalance)) {
        balance = this.web3.utils.fromWei(ethBalance);
      }
    } catch (_) {
      //
    }

    let kkc = "0";
    try {
      const contract = new this.web3.eth.Contract(EVM_ABI, this.contractAddress);
      const kkcBalance = await contract.methods.balanceOf(address).call();
      if (Number(kkcBalance)) {
        kkc = this.web3.utils.fromWei(kkcBalance);
      }
    } catch (_) {
      //
    }

    const assets = new Assets();
    assets.id = address;
    assets.kkc = kkc;
    assets.balance = balance;
    return assets;
  }

  async getUSDTAssetsList(addressList: string[]): Promise<USDTAssets[]> {
    const list: USDTAssets[] = [];
    for (let i = 0; i < addressList.length; i++) {
      const assets = new USDTAssets();
      assets.id = addressList[i];
      assets.usdt = "0";
      list.push(assets);
    }
    return list;
  }

  async toDepositKKC(fromAddress: string, amount: string): Promise<Result> {
    const result = new Result();
    result.code = "0";
    result.resultMsg = "success";
    return result;
  }

  async toWithdrawKKC(toAddress: string, amount: string): Promise<Result> {
    const result = new Result();
    result.code = "0";
    result.resultMsg = "success";
    return result;
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

    throw new Error("network not found.");
  }
}

export const validateNetwork = (network: string): boolean => {
  switch (network) {
    case APTOS:
    case BSC:
    case POLYGON:
      return true;
  }
  return false;
};
