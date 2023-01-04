import { Context } from "koa";
import { request, summary, description, query, body, responsesAll, tagsAll } from "koa-swagger-decorator";
import { validate, ValidationError } from "class-validator";
import { validateMnemonic } from "bip39";

import { NetworkFactory } from "../entity/network";
import { success, failure } from "../entity/result";
import { validateNetwork } from "../utils/validator";

@tagsAll(["Account"])
@responsesAll({ 200: { description: "success" }, 400: { description: "bad request" }, 500: { description: "internal server error" } })
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
  注意：
  接口返回的数据全部需要存库。
  `)
  public static async createAccount(ctx: Context): Promise<void> {
    const isOK = validateNetwork((ctx.query.network as string));
    if (!isOK) {
      ctx.status = 400;
      ctx.body = "bad request";
      return;
    }

    const network = NetworkFactory.create((ctx.query.network as string));
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
  注意：
  接口返回的数据全部需要存库。
  `)
  public static async fromPrivateKey(ctx: Context): Promise<void> {
    const isOK = validateNetwork((ctx.request.body as any).network) && (ctx.request.body as any).privateKey;
    if (!isOK) {
      ctx.status = 400;
      ctx.body = "bad request";
      return;
    }

    const network = NetworkFactory.create((ctx.request.body as any).network);
    const account = network.fromPrivateKey((ctx.request.body as any).privateKey);

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
      "privateKey": "私钥" //0x...
    }
  }
  注意：
  接口返回的数据全部需要存库。
  `)
  public static async fromMnemonic(ctx: Context): Promise<void> {
    let isOK = validateNetwork((ctx.request.body as any).network) && (ctx.request.body as any).mnemonic;
    if (!isOK) {
      ctx.status = 400;
      ctx.body = "bad request";
      return;
    }

    isOK = validateMnemonic((ctx.request.body as any).mnemonic);
    if (!isOK) {
      ctx.status = 400;
      ctx.body = "bad request";
      return;
    }

    const network = NetworkFactory.create((ctx.request.body as any).network);
    const account = network.fromMnemonic((ctx.request.body as any).mnemonic);

    ctx.status = 200;
    ctx.body = success(account);
  }
}