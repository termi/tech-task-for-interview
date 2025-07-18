'use strict';

import { createRouteWithQuery } from "../utils/path";
import { mainProcessAbortController } from "../logic/mainProcessAbortController";
import { mainProcessJTWStorage } from "../logic/mainProcessJTWStorage";
import { SSEClient } from "./SSEClient";
import { roundsSSEUpdate } from "./routers";
import { getDefaultBaseURI } from "./methods";

let defaultBaseURI: string | undefined;

export class SSEChannels {
    readonly defaultBaseURI: string | undefined;
    private readonly getJWTToken: (() => string) | undefined;
    private readonly _outerSignal: AbortSignal | undefined;

    constructor(options?: SSEChannels.Options) {
        this.defaultBaseURI = options?.baseURI;
        this.getJWTToken = options?.getJWTToken || (() => '');
        this._outerSignal = options?.signal ?? mainProcessAbortController.signal;
    }

    get baseURI() {
        return this.defaultBaseURI ?? getDefaultBaseURI();
    }

    roundsSSEUpdate(options?: SSEChannels.Options) {
        const getJWTToken = options?.getJWTToken || this.getJWTToken || mainProcessJTWStorage.getAccessToken;

        const sseClient = new SSEClient({
            url: createRouteWithQuery(options?.baseURI ?? this.baseURI, roundsSSEUpdate.url, {
                forceDelays: String(options?.forceDelays ?? ''),
            }),
            getJWTToken,
            signal: options?.signal || this._outerSignal,
        });

        if (getJWTToken === mainProcessJTWStorage.getAccessToken) {
            mainProcessJTWStorage.on('tokens', () => {
                if (mainProcessJTWStorage.hasTokens()) {
                    sseClient.resume();
                }
                else {
                    sseClient.pause();
                }
            });
        }

        return sseClient;
    }

    static setDefaultBaseURI(newDefaultBaseURI: string | undefined) {
        defaultBaseURI = newDefaultBaseURI;
    }

    static getDefaultBaseURI() {
        return defaultBaseURI;
    }
}

export namespace SSEChannels {
    export type Options = {
        baseURI?: string,
        getJWTToken?: () => string,
        signal?: AbortSignal,
        /**
         * Useful for tests to prevent avoidance of production delays in server router handler
         */
        forceDelays?: boolean,
    };
}

const sseChannels = new SSEChannels();

export default sseChannels;
