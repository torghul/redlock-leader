/// <reference types="node" />
import { EventEmitter } from "events";

declare class RedlockLeader extends EventEmitter {
  constructor(
    clients: any[],
    options?: {
      ttl?: number;
      wait?: number;
      key?: string;
    }
  );
  isLeader: boolean;
  start(): Promise<void>;
  stop(): Promise<void>;
  on(event: "elected" | "extended" | "revoked", cb: () => void): this;
  on(event: "error", cb: (error: Error) => void): this;
}

export default RedlockLeader
