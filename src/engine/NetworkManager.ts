import { Peer, type DataConnection } from 'peerjs';

export class NetworkManager {
    peer: Peer;
    conn: DataConnection | null = null;
    onData: (data: any) => void = () => { };
    onConnect: () => void = () => { };
    onDisconnect: () => void = () => { };

    // For Host: ID of this peer
    myId: string = '';

    constructor() {
        this.peer = new Peer();
        this.peer.on('error', (err) => {
            console.error('Peer error:', err);
        });
    }

    host(onId: (id: string) => void) {
        this.peer.on('open', (id) => {
            this.myId = id;
            onId(id);
        });

        this.peer.on('connection', (conn) => {
            if (this.conn) {
                // Already connected, reject?
                conn.close();
                return;
            }
            this.conn = conn;
            this.setupConnection();
        });
    }

    join(hostId: string, onOpen: () => void) {
        // Wait for peer to be ready before connecting
        if (this.peer.open) {
            this.doJoin(hostId, onOpen);
        } else {
            this.peer.on('open', () => {
                this.doJoin(hostId, onOpen);
            });
        }
    }

    private doJoin(hostId: string, onOpen: () => void) {
        this.conn = this.peer.connect(hostId);
        this.conn.on('open', () => {
            this.setupConnection();
            onOpen();
        });
        // If connection fails immediately
        this.conn.on('error', (err) => console.error("Conn error:", err));
    }

    setupConnection() {
        if (!this.conn) return;

        this.conn.on('data', (data) => {
            this.onData(data);
        });

        this.conn.on('close', () => {
            this.conn = null;
            this.onDisconnect();
        });

        this.onConnect();
    }

    send(data: any) {
        if (this.conn && this.conn.open) { // Check if open
            this.conn.send(data);
        }
    }

    destroy() {
        if (this.conn) this.conn.close();
        this.peer.destroy();
    }
}
