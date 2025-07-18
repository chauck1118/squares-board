import { Server as SocketIOServer } from 'socket.io'

// Global socket instance that will be set during server initialization
let socketInstance: SocketIOServer | null = null

export function setSocketInstance(io: SocketIOServer): void {
  socketInstance = io
}

export function getSocketInstance(): SocketIOServer | null {
  return socketInstance
}