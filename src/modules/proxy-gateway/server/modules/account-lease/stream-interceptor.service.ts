import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ConcurrencyPoolService } from './concurrency-pool.service';

export interface UpstreamAccount {
  id: string;
  email?: string;
  accessToken?: string;
  proxyUrl?: string;
  maxConcurrency?: number;
}

export interface StreamInterceptorOptions {
  upstreamUrl?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface StreamClientResponse {
  setHeader(name: string, value: string): void;
  write(chunk: unknown): boolean;
  end(): void;
  on(event: string, listener: (...args: unknown[]) => void): this;
}

@Injectable()
export class StreamInterceptorService {
  private readonly logger = new Logger(StreamInterceptorService.name);

  constructor(private readonly poolService: ConcurrencyPoolService) {}

  /**
   * Proxies chat completions with upstream token leasing, retry, and SSE streaming.
   * Handles pre-stream transparent retry when upstream rejects with 429/403/5xx.
   */
  async handleChatStream(
    payload: unknown,
    accountPool: UpstreamAccount[],
    clientRes: StreamClientResponse,
    maxRetries = 3,
    options?: StreamInterceptorOptions,
  ): Promise<void> {
    let attempts = 0;
    const attemptedAccountIds = new Set<string>();
    const upstreamUrl =
      options?.upstreamUrl ??
      'https://generativelanguage.googleapis.com/v1beta/chat/completions';
    const timeout = options?.timeoutMs ?? 15000;

    while (attempts < maxRetries) {
      // Filter out accounts already attempted in this request cycle
      const viableAccounts = accountPool.filter((a) => !attemptedAccountIds.has(a.id));
      const account = await this.poolService.acquireLease(viableAccounts);

      if (!account) {
        throw new HttpException(
          'All upstream worker accounts are currently saturated. Please try again shortly.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      attemptedAccountIds.add(account.id);
      attempts++;

      try {
        const agent = account.proxyUrl ? new HttpsProxyAgent(account.proxyUrl) : undefined;

        // Perform initial upstream request
        const upstreamRes: AxiosResponse = await axios.post(upstreamUrl, payload, {
          headers: {
            Authorization: `Bearer ${account.accessToken ?? ''}`,
            'Content-Type': 'application/json',
            ...(options?.headers ?? {}),
          },
          httpsAgent: agent,
          responseType: 'stream',
          timeout, // handshake timeout
        });

        // Success - Set headers and pipe the Server-Sent Events stream
        clientRes.setHeader('Content-Type', 'text/event-stream');
        clientRes.setHeader('Cache-Control', 'no-cache');
        clientRes.setHeader('Connection', 'keep-alive');

        const stream = upstreamRes.data;

        // Cleanup hooks
        let released = false;
        const cleanup = () => {
          if (!released) {
            released = true;
            void this.poolService.releaseLease(account.id);
          }
        };

        stream.on('data', (chunk: Buffer) => {
          clientRes.write(chunk);
        });

        stream.on('end', () => {
          cleanup();
          clientRes.end();
        });

        stream.on('error', (err: Error) => {
          this.logger.error(`Stream interrupted on account ${account.id}: ${err.message}`);
          cleanup();
          clientRes.end();
        });

        clientRes.on('close', () => {
          cleanup();
          if (typeof stream.destroy === 'function') {
            stream.destroy();
          }
        });

        return; // Successfully handed off stream
      } catch (error: unknown) {
        const err = error as { response?: { status?: number }; message?: string };
        const status = err.response?.status;

        // Handle upstream rate limiting or auth invalidation before stream flush
        if (status === 429 || status === 403 || (typeof status === 'number' && status >= 500)) {
          await this.poolService.flagRateLimited(account.id, 60);
        } else {
          await this.poolService.releaseLease(account.id);
        }

        this.logger.warn(
          `Attempt ${attempts} failed on account ${account.id}. Status: ${status ?? err.message ?? 'unknown'}`,
        );

        // If retries exhausted, send error to client
        if (attempts >= maxRetries) {
          throw new HttpException(
            'Failed to establish upstream connection after multiple failover attempts.',
            HttpStatus.BAD_GATEWAY,
          );
        }
      }
    }
  }
}
