import { IPC_CHANNELS } from '@/shared/constants';
import { createORPCClient } from '@orpc/client';
import { RPCLink as MessagePortRPCLink } from '@orpc/client/message-port';
import { RPCLink as FetchRPCLink } from '@orpc/client/fetch';
import type { RouterClient } from '@orpc/server';
import type { router } from './router';

type IPCClient = RouterClient<typeof router>;

class IPCManager {
  private readonly clientPort?: MessagePort;
  private readonly serverPort?: MessagePort;

  public readonly client: IPCClient;

  private initialized: boolean = false;

  constructor() {
    const isElectron =
      typeof window !== 'undefined' &&
      'electron' in window &&
      Boolean((window as unknown as { electron?: unknown }).electron);

    if (isElectron && typeof MessageChannel !== 'undefined') {
      const { port1, port2 } = new MessageChannel();
      this.clientPort = port1;
      this.serverPort = port2;

      this.client = createORPCClient<IPCClient>(
        new MessagePortRPCLink({
          port: this.clientPort,
        }),
      );
    } else {
      const baseUrl =
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : 'http://127.0.0.1:8045';

      this.client = createORPCClient<IPCClient>(
        new FetchRPCLink({
          url: `${baseUrl}/rpc`,
        }),
      );
    }
  }

  public initialize() {
    if (this.initialized) {
      return;
    }

    if (this.clientPort && this.serverPort) {
      this.clientPort.start();
      window.postMessage(IPC_CHANNELS.START_ORPC_SERVER, '*', [this.serverPort]);
    }
    this.initialized = true;
  }
}

export const ipc = new IPCManager();
ipc.initialize();
