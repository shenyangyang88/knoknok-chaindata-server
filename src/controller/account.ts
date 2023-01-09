import { Context } from "koa";
import { request, summary, description, query, body, responsesAll, tagsAll } from "koa-swagger-decorator";

import { NetworkFactory, networkValidator, addressValidator, privateKeyValidator, mnemonicValidator } from "../entity/network";
import { success } from "../entity/result";
import { ResultError } from "../entity/error";

@tagsAll(["Account"])
@responsesAll({ 200: { description: "success" } })
export default class AccountController {
  @request("post", "/accounts/new")
  @query({
    network: { type: "string", required: true, description: "区块链网络：(aptos|bsc|polygon)" },
  })
  @summary("创建账号")
  @description(`
  用途：
  根据区块链网络，创建新的账号。
  数据：
  {
    "code": 0,
    "resultMsg": "success",
    "data": {
      "address": "账号地址", //0x...
      "mnemonic": "助记词", //panda kingdom print velvet rice twenty half company steak evoke supply swamp
      "privateKey": "私钥" //0x...
    }
  }
  {
    "code": 1001,
    "resultMsg": "network is invalid"
  }
  {
    "code": 500,
    "resultMsg": "..."
  }
  注意：
  接口返回的数据，前端全部需要加密存储处理。
  `)
  public static async createAccount(ctx: Context): Promise<void> {
    const networkParam = (ctx.query.network as string);

    const ok = networkValidator(networkParam);
    if (!ok) {
      throw new ResultError(1001, "network is invalid");
    }

    const network = NetworkFactory.create(networkParam);
    const account = network.createAccount();

    ctx.status = 200;
    ctx.body = success(account);
  }

  @request("post", "/accounts/fromprivatekey")
  @body({
    network: { type: "string", required: true, description: "区块链网络：(aptos|bsc|polygon)" },
    privateKey: { type: "string", required: true, description: "私钥(hex)" }
  })
  @summary("导入私钥")
  @description(`
  用途：
  根据区块链网络，导入私钥创建的账号。
  数据：
  {
    "code": 0,
    "resultMsg": "success",
    "data": {
      "address": "账号地址" //0x...
    }
  }
  {
    "code": 1002,
    "resultMsg": "please check whether the request parameters are correct"
  }
  {
    "code": 500,
    "resultMsg": "..."
  }
  注意：
  接口返回的数据，前端全部需要加密存储处理。
  `)
  public static async fromPrivateKey(ctx: Context): Promise<void> {
    const networkParam = (ctx.request.body as any).network;
    const privateKeyParam = (ctx.request.body as any).privateKey;

    const ok = networkValidator(networkParam) && privateKeyValidator(privateKeyParam);
    if (!ok) {
      throw new ResultError(1002, "please check whether the request parameters are correct");
    }

    const network = NetworkFactory.create(networkParam);
    const account = network.fromPrivateKey(privateKeyParam);

    ctx.status = 200;
    ctx.body = success(account);
  }

  @request("post", "/accounts/frommnemonic")
  @body({
    network: { type: "string", required: true, description: "区块链网络：(aptos|bsc|polygon)" },
    mnemonic: { type: "string", required: true, description: "助记词" }
  })
  @summary("导入助记词")
  @description(`
  用途：
  根据区块链网络，导入助记词创建的账号。
  数据：
  {
    "code": 0,
    "resultMsg": "success",
    "data": {
      "address": "账号地址", //0x...
      "mnemonic": "助记词", //panda kingdom print velvet rice twenty half company steak evoke supply swamp
      "privateKey": "私钥" //0x...
    }
  }
  {
    "code": 1002,
    "resultMsg": "please check whether the request parameters are correct"
  }
  {
    "code": 500,
    "resultMsg": "..."
  }
  注意：
  接口返回的数据，前端全部需要加密存储处理。
  `)
  public static async fromMnemonic(ctx: Context): Promise<void> {
    const networkParam = (ctx.request.body as any).network;
    const mnemonicParam = (ctx.request.body as any).mnemonic;

    const ok = networkValidator(networkParam) && mnemonicValidator(mnemonicParam);
    if (!ok) {
      throw new ResultError(1002, "please check whether the request parameters are correct");
    }

    const network = NetworkFactory.create(networkParam);
    const account = network.fromMnemonic(mnemonicParam);

    ctx.status = 200;
    ctx.body = success(account);
  }
}