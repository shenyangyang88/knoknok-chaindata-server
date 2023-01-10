import axios, { AxiosInstance } from "axios";

import { config } from "../config";

export class TxCallBack {
  api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: config.txCallBackUrl,
    });
  }

  txCallBack(txStatus: boolean, txHash: string, txType: string) {
    this.api.post("/knoknok/blockchain-rest/transfer-blockchain-callback", {
      hashCode: txHash,
      success: txStatus ? 1 : 0,
      transferType: txType,
    });
  }
}
