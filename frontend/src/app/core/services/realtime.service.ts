import { Injectable, inject, signal } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel
} from '@microsoft/signalr';
import { BOARD_HUB_URL } from '../api-config';
import { BoardHubEvents } from '../models/realtime.model';
import { AuthService } from './auth.service';

export type RealtimeStatus = 'offline' | 'connecting' | 'online' | 'reconnecting';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly auth = inject(AuthService);

  private connection: HubConnection | null = null;
  private starting: Promise<void> | null = null;

  /**
   * Los grupos del hub viven en la conexión: si se cae y vuelve, el servidor ya no sabe que
   * estábamos en ese tablero. Por eso se recuerdan aquí y se vuelven a pedir al reconectar.
   */
  private readonly joinedBoards = new Set<string>();

  readonly status = signal<RealtimeStatus>('offline');

  /** Se llama al entrar a una zona con sesión; es idempotente. */
  async connect(): Promise<void> {
    if (!this.auth.isAuthenticated()) return;

    const connection = this.ensureConnection();
    if (connection.state === HubConnectionState.Connected) return;

    // Varias pantallas pueden pedir conexión a la vez; se comparte el mismo arranque.
    this.starting ??= this.start(connection);
    await this.starting;
  }

  async disconnect(): Promise<void> {
    this.joinedBoards.clear();
    this.starting = null;

    const connection = this.connection;
    this.connection = null;
    this.status.set('offline');

    await connection?.stop();
  }

  /**
   * Suscribe un handler tipado a un evento del hub. Devuelve la función para darse de baja,
   * que es lo que se llama en el `ngOnDestroy` / `DestroyRef` del componente.
   */
  on<K extends keyof BoardHubEvents>(
    event: K,
    handler: (payload: BoardHubEvents[K]) => void
  ): () => void {
    const connection = this.ensureConnection();

    // El hub entrega argumentos sin tipar; el mapa BoardHubEvents es el que dice qué llega
    // en cada evento, y la conversión queda encerrada en esta línea.
    const listener = (...args: unknown[]): void => handler(args[0] as BoardHubEvents[K]);

    connection.on(event, listener);
    return () => connection.off(event, listener);
  }

  async joinBoard(boardId: string): Promise<void> {
    this.joinedBoards.add(boardId);
    await this.connect();

    if (this.connection?.state === HubConnectionState.Connected) {
      await this.connection.invoke('JoinBoard', boardId);
    }
  }

  async leaveBoard(boardId: string): Promise<void> {
    this.joinedBoards.delete(boardId);

    if (this.connection?.state === HubConnectionState.Connected) {
      await this.connection.invoke('LeaveBoard', boardId);
    }
  }

  private ensureConnection(): HubConnection {
    if (this.connection) return this.connection;

    const connection = new HubConnectionBuilder()
      .withUrl(BOARD_HUB_URL, {
        // El token va por query string porque el handshake de WebSockets no admite
        // cabeceras propias; el backend solo lo acepta en rutas /hubs.
        accessTokenFactory: () => this.auth.getToken() ?? ''
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    connection.onreconnecting(() => this.status.set('reconnecting'));
    connection.onclose(() => this.status.set('offline'));

    connection.onreconnected(async () => {
      this.status.set('online');
      await this.rejoinBoards();
    });

    this.connection = connection;
    return connection;
  }

  private async start(connection: HubConnection): Promise<void> {
    this.status.set('connecting');

    try {
      await connection.start();
      this.status.set('online');
      await this.rejoinBoards();
    } catch {
      // Sin tiempo real la app sigue siendo usable, solo deja de refrescarse sola; el
      // indicador de estado es el que se lo cuenta al usuario.
      this.status.set('offline');
    } finally {
      this.starting = null;
    }
  }

  private async rejoinBoards(): Promise<void> {
    if (this.connection?.state !== HubConnectionState.Connected) return;

    for (const boardId of this.joinedBoards) {
      await this.connection.invoke('JoinBoard', boardId);
    }
  }
}
