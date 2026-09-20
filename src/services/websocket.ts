type WebSocketEventListener = (data: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<WebSocketEventListener>> = new Map();
  private reconnectTimeout: any = null;
  private url: string;
  private isConnected = false;

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = 'localhost:8000';
    this.url = `${protocol}//${host}/ws/attendance`;
  }

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        console.log('[WebSocketService] Connected to live attendance stream');
        this.isConnected = true;
        this.emit('connection_change', { connected: true });
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const eventType = data.type || 'message';
          this.emit(eventType, data);
          this.emit('*', data);
        } catch (e) {
          console.warn('[WebSocketService] Non-JSON message received:', event.data);
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.emit('connection_change', { connected: false });
        this.scheduleReconnect();
      };

      this.socket.onerror = (err) => {
        console.warn('[WebSocketService] WebSocket error:', err);
        this.socket?.close();
      };
    } catch (err) {
      console.warn('[WebSocketService] Failed to establish connection:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 4000);
  }

  on(eventType: string, callback: WebSocketEventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Return unbind function
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  private emit(eventType: string, data: any) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`[WebSocketService] Listener error on ${eventType}:`, e);
        }
      });
    }
  }

  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const wsService = new WebSocketService();
