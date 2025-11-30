import * as jspb from 'google-protobuf'



export class UserRequest extends jspb.Message {
  getUserid(): string;
  setUserid(value: string): UserRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UserRequest.AsObject;
  static toObject(includeInstance: boolean, msg: UserRequest): UserRequest.AsObject;
  static serializeBinaryToWriter(message: UserRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UserRequest;
  static deserializeBinaryFromReader(message: UserRequest, reader: jspb.BinaryReader): UserRequest;
}

export namespace UserRequest {
  export type AsObject = {
    userid: string,
  }
}

export class OfferRequest extends jspb.Message {
  getFromuserid(): string;
  setFromuserid(value: string): OfferRequest;

  getTouserid(): string;
  setTouserid(value: string): OfferRequest;

  getSdp(): string;
  setSdp(value: string): OfferRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): OfferRequest.AsObject;
  static toObject(includeInstance: boolean, msg: OfferRequest): OfferRequest.AsObject;
  static serializeBinaryToWriter(message: OfferRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): OfferRequest;
  static deserializeBinaryFromReader(message: OfferRequest, reader: jspb.BinaryReader): OfferRequest;
}

export namespace OfferRequest {
  export type AsObject = {
    fromuserid: string,
    touserid: string,
    sdp: string,
  }
}

export class AnswerRequest extends jspb.Message {
  getFromuserid(): string;
  setFromuserid(value: string): AnswerRequest;

  getTouserid(): string;
  setTouserid(value: string): AnswerRequest;

  getSdp(): string;
  setSdp(value: string): AnswerRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AnswerRequest.AsObject;
  static toObject(includeInstance: boolean, msg: AnswerRequest): AnswerRequest.AsObject;
  static serializeBinaryToWriter(message: AnswerRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AnswerRequest;
  static deserializeBinaryFromReader(message: AnswerRequest, reader: jspb.BinaryReader): AnswerRequest;
}

export namespace AnswerRequest {
  export type AsObject = {
    fromuserid: string,
    touserid: string,
    sdp: string,
  }
}

export class IceCandidateRequest extends jspb.Message {
  getFromuserid(): string;
  setFromuserid(value: string): IceCandidateRequest;

  getTouserid(): string;
  setTouserid(value: string): IceCandidateRequest;

  getCandidate(): string;
  setCandidate(value: string): IceCandidateRequest;

  getSdpmid(): string;
  setSdpmid(value: string): IceCandidateRequest;

  getSdpmlineindex(): number;
  setSdpmlineindex(value: number): IceCandidateRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): IceCandidateRequest.AsObject;
  static toObject(includeInstance: boolean, msg: IceCandidateRequest): IceCandidateRequest.AsObject;
  static serializeBinaryToWriter(message: IceCandidateRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): IceCandidateRequest;
  static deserializeBinaryFromReader(message: IceCandidateRequest, reader: jspb.BinaryReader): IceCandidateRequest;
}

export namespace IceCandidateRequest {
  export type AsObject = {
    fromuserid: string,
    touserid: string,
    candidate: string,
    sdpmid: string,
    sdpmlineindex: number,
  }
}

export class SuccessResponse extends jspb.Message {
  getSuccess(): boolean;
  setSuccess(value: boolean): SuccessResponse;

  getMessage(): string;
  setMessage(value: string): SuccessResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SuccessResponse.AsObject;
  static toObject(includeInstance: boolean, msg: SuccessResponse): SuccessResponse.AsObject;
  static serializeBinaryToWriter(message: SuccessResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SuccessResponse;
  static deserializeBinaryFromReader(message: SuccessResponse, reader: jspb.BinaryReader): SuccessResponse;
}

export namespace SuccessResponse {
  export type AsObject = {
    success: boolean,
    message: string,
  }
}

export class SignalingMessage extends jspb.Message {
  getType(): string;
  setType(value: string): SignalingMessage;

  getFromuserid(): string;
  setFromuserid(value: string): SignalingMessage;

  getData(): string;
  setData(value: string): SignalingMessage;

  getSdpmid(): string;
  setSdpmid(value: string): SignalingMessage;

  getSdpmlineindex(): number;
  setSdpmlineindex(value: number): SignalingMessage;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SignalingMessage.AsObject;
  static toObject(includeInstance: boolean, msg: SignalingMessage): SignalingMessage.AsObject;
  static serializeBinaryToWriter(message: SignalingMessage, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SignalingMessage;
  static deserializeBinaryFromReader(message: SignalingMessage, reader: jspb.BinaryReader): SignalingMessage;
}

export namespace SignalingMessage {
  export type AsObject = {
    type: string,
    fromuserid: string,
    data: string,
    sdpmid: string,
    sdpmlineindex: number,
  }
}

