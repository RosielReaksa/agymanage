import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Observable } from 'rxjs';
import { HttpStatus } from '@nestjs/common';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

const state = vi.hoisted(() => ({
  directory: '',
}));

vi.mock('better-sqlite3', async () => {
  const { createRequire } = await import('node:module');
  return { default: createRequire(import.meta.url)('better-sqlite3') };
});

vi.mock('@/shared/platform/paths', () => ({
  getCloudAccountsDbPath: () => path.join(state.directory, 'cloud_accounts.db'),
}));

vi.mock('@/server/server-config', () => ({
  getServerConfig: () => ({ api_key: 'master-admin-key' }),
}));

import { saasService } from '@/modules/saas/services/saas.service';
import { OpenAIOperations } from '@/modules/proxy-gateway/server/modules/openai/openai-operations.service';
import {
  GeminiClient,
  BROWSER_EMULATION_HEADERS,
} from '@/modules/proxy-gateway/server/modules/gemini/gemini-client.service';
import { Upstream4xxCaptureService } from '@/modules/proxy-gateway/server/common/upstream-4xx-capture.service';
import type { OpenAIChatRequest } from '@/modules/proxy-gateway/server/common/interfaces/request-interfaces';

interface RawReply extends EventEmitter {
  end: ReturnType<typeof vi.fn>;
  writableEnded: boolean;
  write: ReturnType<typeof vi.fn>;
  writeHead: ReturnType<typeof vi.fn>;
}

function createRawReply() {
  const raw = new EventEmitter() as RawReply;
  raw.writableEnded = false;
  raw.writeHead = vi.fn();
  raw.write = vi.fn(() => true);
  raw.end = vi.fn(() => {
    raw.writableEnded = true;
  });
  const reply: any = {
    raw,
    header: vi.fn(),
    hijack: vi.fn(),
    send: vi.fn(),
    status: vi.fn(),
  };
  reply.status.mockReturnValue(reply);
  reply.send.mockReturnValue(reply);
  return reply;
}

function createRequest(saasContext?: any) {
  const req: any = {
    raw: new EventEmitter(),
    headers: {},
    url: '/v1/chat/completions',
  };
  if (saasContext) {
    req.saasContext = saasContext;
    req.raw.saasContext = saasContext;
  }
  return req;
}

describe('SaaS Live Token Metering & Browser Emulation', () => {
  beforeEach(() => {
    state.directory = fs.mkdtempSync(path.join(os.tmpdir(), 'agm-metering-test-'));
  });

  afterEach(() => {
    if (state.directory && fs.existsSync(state.directory)) {
      fs.rmSync(state.directory, { recursive: true, force: true });
    }
  });

  describe('Pre-Authorization & Balance Check', () => {
    it('rejects with HTTP 402 Payment Required when balance is zero or depleted', async () => {
      const user = saasService.getUser();
      // Deplete balance to 0
      saasService.recordUsage({
        userId: user.id,
        model: 'gemini-2.5-pro',
        promptTokens: 1000,
        completionTokens: 1000,
        costUsd: user.balanceUsd,
      });

      const key = saasService.generateApiKey('Test Key');
      const handleChatCompletions = vi.fn();
      const operations = new OpenAIOperations({ handleChatCompletions } as never);

      const reply = createRawReply();
      const req = createRequest({
        user: { id: user.id, balanceUsd: 0 },
        apiKey: { id: key.id },
      });

      const body: OpenAIChatRequest = {
        model: 'gemini-2.5-flash',
        messages: [{ role: 'user', content: 'Tell me a joke' }],
      };

      await operations.chatCompletions(body, reply, req);

      expect(reply.status).toHaveBeenCalledWith(HttpStatus.PAYMENT_REQUIRED);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'insufficient_quota',
            type: 'billing_error',
          }),
        }),
      );
      expect(handleChatCompletions).not.toHaveBeenCalled();
    });
  });

  describe('Non-Streaming Completion Metering', () => {
    it('accurately deducts usage cost on non-streaming completions', async () => {
      const user = saasService.getUser();
      const initialBalance = user.balanceUsd;
      const key = saasService.generateApiKey('Metering Key');

      const mockResponse = {
        id: 'chatcmpl-nonstream-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gemini-2.5-flash',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Here is your completed response.' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 120,
          completion_tokens: 80,
          total_tokens: 200,
        },
      };

      const handleChatCompletions = vi.fn().mockResolvedValue(mockResponse);
      const operations = new OpenAIOperations({ handleChatCompletions } as never);

      const reply = createRawReply();
      const req = createRequest({
        user: { id: user.id, balanceUsd: initialBalance },
        apiKey: { id: key.id },
      });

      const body: OpenAIChatRequest = {
        model: 'gemini-2.5-flash',
        messages: [{ role: 'user', content: 'Hello assistant!' }],
      };

      await operations.chatCompletions(body, reply, req);

      expect(reply.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(reply.send).toHaveBeenCalledWith(mockResponse);

      // Verify balance deduction
      const expectedCost = saasService.calculateCost('gemini-2.5-flash', 120, 80);
      expect(expectedCost).toBeGreaterThan(0);

      const updatedUser = saasService.getUser(user.id);
      expect(updatedUser.balanceUsd).toBeCloseTo(initialBalance - expectedCost, 6);

      // Verify usage log record
      const logs = saasService.getUsageLogs(10, user.id);
      expect(logs.length).toBe(1);
      expect(logs[0].model).toBe('gemini-2.5-flash');
      expect(logs[0].promptTokens).toBe(120);
      expect(logs[0].completionTokens).toBe(80);
      expect(logs[0].totalTokens).toBe(200);
      expect(logs[0].costUsd).toBeCloseTo(expectedCost, 6);
    });
  });

  describe('Streaming SSE Completion Metering', () => {
    it('accurately deducts usage cost upon SSE stream completion', async () => {
      const user = saasService.getUser();
      const initialBalance = user.balanceUsd;
      const key = saasService.generateApiKey('Stream Metering Key');

      const streamObservable = new Observable<string>((subscriber) => {
        subscriber.next(
          `data: ${JSON.stringify({
            id: 'chatcmpl-stream-456',
            choices: [{ index: 0, delta: { content: 'Hello' } }],
          })}\n\n`,
        );
        subscriber.next(
          `data: ${JSON.stringify({
            id: 'chatcmpl-stream-456',
            choices: [{ index: 0, delta: { content: ' World!' } }],
          })}\n\n`,
        );
        subscriber.next(
          `data: ${JSON.stringify({
            id: 'chatcmpl-stream-456',
            choices: [],
            usage: {
              prompt_tokens: 50,
              completion_tokens: 25,
              total_tokens: 75,
            },
          })}\n\n`,
        );
        subscriber.next('data: [DONE]\n\n');
        subscriber.complete();
      });

      const handleChatCompletions = vi.fn().mockResolvedValue(streamObservable);
      const operations = new OpenAIOperations({ handleChatCompletions } as never);

      const reply = createRawReply();
      const req = createRequest({
        user: { id: user.id, balanceUsd: initialBalance },
        apiKey: { id: key.id },
      });

      const body: OpenAIChatRequest = {
        model: 'gemini-2.5-flash',
        stream: true,
        messages: [{ role: 'user', content: 'Say hello world' }],
      };

      await operations.chatCompletions(body, reply, req);

      const expectedCost = saasService.calculateCost('gemini-2.5-flash', 50, 25);
      expect(expectedCost).toBeGreaterThan(0);

      const updatedUser = saasService.getUser(user.id);
      expect(updatedUser.balanceUsd).toBeCloseTo(initialBalance - expectedCost, 6);

      const logs = saasService.getUsageLogs(10, user.id);
      expect(logs.length).toBe(1);
      expect(logs[0].promptTokens).toBe(50);
      expect(logs[0].completionTokens).toBe(25);
      expect(logs[0].totalTokens).toBe(75);
      expect(logs[0].costUsd).toBeCloseTo(expectedCost, 6);
    });
  });

  describe('Outbound Egress & Browser Emulation', () => {
    it('defines and provides Chrome desktop browser emulation headers', () => {
      expect(BROWSER_EMULATION_HEADERS).toEqual({
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
      });
    });

    it('resolves HttpsProxyAgent for account-specific HTTP/HTTPS proxy URLs', () => {
      const client = new GeminiClient(new Upstream4xxCaptureService());
      const proxyUrl = 'http://residential-node.proxy.net:8888';

      const agent = client.resolveUpstreamProxyAgent(proxyUrl);
      expect(agent).toBeDefined();
      expect(agent).toBeInstanceOf(HttpsProxyAgent);

      const axiosProxy = client.resolveUpstreamAxiosProxy(proxyUrl);
      expect(axiosProxy).toEqual({
        protocol: 'http',
        host: 'residential-node.proxy.net',
        port: 8888,
      });
    });

    it('resolves SocksProxyAgent for account-specific SOCKS5 proxy URLs', () => {
      const client = new GeminiClient(new Upstream4xxCaptureService());
      const socksUrl = 'socks5://user:pass@socks-node.proxy.net:1080';

      const agent = client.resolveUpstreamProxyAgent(socksUrl);
      expect(agent).toBeDefined();
      expect(agent).toBeInstanceOf(SocksProxyAgent);

      const axiosProxy = client.resolveUpstreamAxiosProxy(socksUrl);
      // Axios native proxy does not support SOCKS; must be false to let SocksProxyAgent handle transport
      expect(axiosProxy).toBe(false);
    });
  });
});
