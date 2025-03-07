export const HEADER_KEY = {
  FILE_ID: "X-File-Id",
  FILE_NAME: "X-File-Name",
  FILE_SIZE: "X-File-Size",
  FILE_TOTAL: "X-File-Total",
};

export const MESSAGE_TYPE = {
  INIT_CHANNEL: "INIT_CHANNEL",
  TRANSFER_START: "TRANSFER_START",
  TRANSFER_CLOSE: "TRANSFER_CLOSE",
} as const;

export type MessageTypeMap = {
  [MESSAGE_TYPE.INIT_CHANNEL]: Record<string, never>;
  [MESSAGE_TYPE.TRANSFER_START]: { id: string; readable: ReadableStream<Uint8Array> };
  [MESSAGE_TYPE.TRANSFER_CLOSE]: { id: string };
};

import type { Object } from "./type";
type _Spread<T extends Object.Key, M extends Record<Object.Key, unknown>> = {
  [P in T]: unknown extends M[P] ? never : M[P] & { key: P };
};
export type Spread<M extends Object.Unknown> = Object.Values<_Spread<Object.Keys<M>, M>>;

export type MessageType = Spread<MessageTypeMap>;