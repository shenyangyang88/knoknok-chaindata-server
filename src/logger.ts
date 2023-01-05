import { Context } from "koa";
import { transports, format } from "winston";
import * as path from "path";

import { config } from "./config";

const logger = (winstonInstance: any): any => {
    winstonInstance.configure({
        level: config.debugLogging ? "debug" : "info",
        transports: [
            //
            // - Write all logs error (and below) to `error.log`.
            new transports.File({ filename: path.resolve(__dirname, "../error.log"), level: "error" }),
            //
            // - Write to all logs with specified level to console.
            new transports.Console({
                format: format.combine(
                    format.colorize(),
                    format.simple()
                )
            })
        ]
    });

    return async (ctx: Context, next: () => Promise<any>): Promise<void> => {
        let errMsg = "";

        const startTime = new Date();
        try {
            await next();
        } catch (err) {
            ctx.status = err.status || 500;
            ctx.body = errMsg = err.message;
        }
        const stopTime = new Date();

        let logLevel: string;
        if (ctx.status >= 500) {
            logLevel = "error";
        } else if (ctx.status >= 400) {
            logLevel = "warn";
        } else {
            logLevel = "info";
        }

        let msg = "";
        if (errMsg) {
            msg = `http-transport ${stopTime.getTime() - startTime.getTime()}ms ${startTime.toLocaleString()}-${stopTime.toLocaleString()} ${ctx.method} ${ctx.originalUrl} ${ctx.status} ${errMsg}`;
        } else {
            msg = `http-transport ${stopTime.getTime() - startTime.getTime()}ms ${startTime.toLocaleString()}-${stopTime.toLocaleString()} ${ctx.method} ${ctx.originalUrl} ${ctx.status}`;
        }

        winstonInstance.log(logLevel, msg);
    };
};

export { logger };