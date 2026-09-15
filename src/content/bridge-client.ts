import {
  BRIDGE_MSG_SOURCE_CONTENT,
  BRIDGE_MSG_SOURCE_PAGE,
  BridgeCommand,
  BridgeResponse,
  CurrentLineInfo,
  SelectionRange,
} from '../messaging/types';

class BridgeClient {
  private pending = new Map<
    string,
    { resolve: (val: any) => void; reject: (err: any) => void; timer: ReturnType<typeof setTimeout> }
  >();
  private isReady = false;
  private readyCallbacks: Array<() => void> = [];

  constructor() {
    window.addEventListener('message', (event) => {
      if (event.source !== window || event.data?.source !== BRIDGE_MSG_SOURCE_PAGE) {
        return;
      }

      const { id, response } = event.data;

      if (id === 'initial_ready' || response?.type === 'PONG') {
        if (response?.ready) {
          this.isReady = true;
          this.readyCallbacks.forEach((cb) => cb());
          this.readyCallbacks = [];
        }
      }

      if (id && this.pending.has(id)) {
        const handler = this.pending.get(id)!;
        clearTimeout(handler.timer);
        this.pending.delete(id);
        handler.resolve(response);
      }
    });

    // Check liveness initially
    this.ping();
  }

  public async ping(): Promise<boolean> {
    try {
      const res = await this.sendCommand<BridgeResponse>({ type: 'PING' }, 1000);
      if (res?.type === 'PONG' && res.ready) {
        this.isReady = true;
        return true;
      }
    } catch {
      // Not yet ready
    }
    return false;
  }

  public async waitForEditor(timeoutMs = 15000): Promise<boolean> {
    if (this.isReady) return true;

    // Try immediate ping
    const readyNow = await this.ping();
    if (readyNow) return true;

    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        resolve(false);
      }, timeoutMs);

      this.readyCallbacks.push(() => {
        clearTimeout(timer);
        resolve(true);
      });
    });
  }

  public async getSelection(): Promise<SelectionRange | null> {
    const res = await this.sendCommand<BridgeResponse>({ type: 'GET_SELECTION' });
    if (res.type === 'SELECTION_RESULT') {
      return res.payload;
    }
    return null;
  }

  public async getContent(): Promise<string | null> {
    const res = await this.sendCommand<BridgeResponse>({ type: 'GET_CONTENT' });
    if (res.type === 'CONTENT_RESULT') {
      return res.payload;
    }
    return null;
  }

  public async getCurrentLine(): Promise<CurrentLineInfo | null> {
    const res = await this.sendCommand<BridgeResponse>({ type: 'GET_CURRENT_LINE' });
    if (res.type === 'CURRENT_LINE_RESULT') {
      return res.payload;
    }
    return null;
  }

  public async replaceSelection(replacement: string): Promise<boolean> {
    const res = await this.sendCommand<BridgeResponse>({
      type: 'REPLACE_SELECTION',
      payload: { replacement },
    });
    if (res.type === 'MUTATION_RESULT') {
      return res.success;
    }
    return false;
  }

  public async replaceRange(from: number, to: number, replacement: string): Promise<boolean> {
    const res = await this.sendCommand<BridgeResponse>({
      type: 'REPLACE_RANGE',
      payload: { from, to, replacement },
    });
    if (res.type === 'MUTATION_RESULT') {
      return res.success;
    }
    return false;
  }

  public async insertAtCursor(text: string): Promise<boolean> {
    const res = await this.sendCommand<BridgeResponse>({
      type: 'INSERT_AT_CURSOR',
      payload: { text },
    });
    if (res.type === 'MUTATION_RESULT') {
      return res.success;
    }
    return false;
  }

  private sendCommand<T = any>(command: BridgeCommand, timeoutMs = 4000): Promise<T> {
    const id = `wt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Bridge timeout waiting for command: ${command.type}`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer });

      window.postMessage(
        {
          source: BRIDGE_MSG_SOURCE_CONTENT,
          id,
          command,
        },
        '*'
      );
    });
  }
}

export const bridgeClient = new BridgeClient();
