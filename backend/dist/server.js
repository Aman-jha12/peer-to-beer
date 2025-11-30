"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const path_1 = __importDefault(require("path"));
// 1. Load the Protocol Buffer
const PROTO_PATH = path_1.default.join(__dirname, 'proto', 'signaling.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const signalingProto = grpc.loadPackageDefinition(packageDefinition).signaling;
// 2. In-Memory Storage for Active Streams
// Maps userId -> The generic gRPC stream object to write back to that user
const activeUsers = new Map();
// 3. Define the Service Handlers
const server = new grpc.Server();
server.addService(signalingProto.SignalingService.service, {
    // Handler: JoinCall (Server Streaming)
    // Client calls this and keeps the connection open. We save their stream.
    JoinCall: (call) => {
        const userId = call.request.userId;
        console.log(`[User Joined] ${userId}`);
        // Save the stream so we can push messages to this user later
        activeUsers.set(userId, call);
        // Handle client disconnect
        call.on('cancelled', () => {
            console.log(`[User Disconnected] ${userId}`);
            activeUsers.delete(userId);
        });
        // Optional: Send a welcome message or ready status
        // call.write({ type: 'welcome', message: 'You are connected to signaling' });
    },
    // Handler: SendOffer
    // User A sends Offer -> Server -> Finds User B -> Writes to User B's stream
    SendOffer: (call, callback) => {
        const { fromUserId, toUserId, sdp } = call.request;
        console.log(`[Offer] From ${fromUserId} to ${toUserId}`);
        const targetStream = activeUsers.get(toUserId);
        if (targetStream) {
            targetStream.write({
                type: 'offer',
                fromUserId: fromUserId,
                data: sdp
            });
            callback(null, { success: true, message: 'Offer sent' });
        }
        else {
            console.warn(`[Fail] User ${toUserId} not found`);
            callback(null, { success: false, message: 'User not online' });
        }
    },
    // Handler: SendAnswer
    SendAnswer: (call, callback) => {
        const { fromUserId, toUserId, sdp } = call.request;
        console.log(`[Answer] From ${fromUserId} to ${toUserId}`);
        const targetStream = activeUsers.get(toUserId);
        if (targetStream) {
            targetStream.write({
                type: 'answer',
                fromUserId: fromUserId,
                data: sdp
            });
            callback(null, { success: true, message: 'Answer sent' });
        }
        else {
            callback(null, { success: false, message: 'User not online' });
        }
    },
    // Handler: SendIceCandidate
    SendIceCandidate: (call, callback) => {
        const { fromUserId, toUserId, candidate, sdpMid, sdpMLineIndex } = call.request;
        console.log(`[ICE] From ${fromUserId} to ${toUserId}`);
        const targetStream = activeUsers.get(toUserId);
        if (targetStream) {
            targetStream.write({
                type: 'candidate',
                fromUserId: fromUserId,
                data: candidate,
                sdpMid: sdpMid,
                sdpMLineIndex: sdpMLineIndex
            });
            callback(null, { success: true, message: 'ICE Candidate sent' });
        }
        else {
            // ICE candidates often arrive before/after connections, silent fail is common but we'll log it
            callback(null, { success: false, message: 'User not online' });
        }
    },
    // Handler: EndCall
    EndCall: (call, callback) => {
        const { userId } = call.request; // Who is ending the call?
        // In a real app, we might store "who is talking to whom" to notify the other party.
        // For now, we assume the client knows who they are talking to and sends a specific "Bye" message 
        // via a similar routing mechanism, or simply closes the peer connection.
        console.log(`[EndCall] User ${userId} requested termination`);
        // Logic depends on your requirements: 
        // Do we disconnect them from signaling? Or just notify peers?
        // We will just remove them from active map for safety.
        activeUsers.delete(userId);
        callback(null, { success: true, message: 'Call ended' });
    }
});
// 4. Bind and Start the Server
const PORT = '0.0.0.0:50051';
server.bindAsync(PORT, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(`🍺 Peer-to-Beer Signaling running on ${PORT}`);
    server.start();
});
