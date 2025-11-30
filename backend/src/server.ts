import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

// 1. Load the Protocol Buffer
const PROTO_PATH = path.join(__dirname, 'proto', 'signaling.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const signalingProto = grpc.loadPackageDefinition(packageDefinition).signaling as any;

// 2. In-Memory Storage for Active Streams
// Maps userId -> The generic gRPC stream object to write back to that user
const activeUsers = new Map<string, grpc.ServerWritableStream<any, any>>();

// 3. Define the Service Handlers
const server = new grpc.Server();

server.addService(signalingProto.SignalingService.service, {
    
    // Handler: JoinCall (Server Streaming)
    JoinCall: (call: grpc.ServerWritableStream<any, any>) => {
        const userId = call.request.userId;
        console.log(`[User Joined] ${userId}`);

        // Save the stream so we can push messages to this user later
        activeUsers.set(userId, call);

        // Handle client disconnect
        call.on('cancelled', () => {
            console.log(`[User Disconnected] ${userId}`);
            activeUsers.delete(userId);
        });
        
        // --- CRITICAL FIX: Force-Flush the Stream ---
        // We send a dummy message immediately. This forces Envoy/Browser to 
        // acknowledge the connection is open. Without this, the browser might 
        // sit waiting for headers and miss the first real message (the Offer).
        call.write({
            type: 'system',
            fromUserId: 'server',
            data: 'Connected'
        });
    },

    // Handler: SendOffer
    SendOffer: (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) => {
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
        } else {
            console.warn(`[Fail] User ${toUserId} not found`);
            callback(null, { success: false, message: 'User not online' });
        }
    },

    // Handler: SendAnswer
    SendAnswer: (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) => {
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
        } else {
            callback(null, { success: false, message: 'User not online' });
        }
    },

    // Handler: SendIceCandidate
    SendIceCandidate: (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) => {
        const { fromUserId, toUserId, candidate } = call.request;
        console.log(`[ICE] From ${fromUserId} to ${toUserId}`);

        const targetStream = activeUsers.get(toUserId);

        if (targetStream) {
            targetStream.write({
                type: 'candidate',
                fromUserId: fromUserId,
                data: candidate
            });
            callback(null, { success: true, message: 'ICE Candidate sent' });
        } else {
            callback(null, { success: false, message: 'User not online' });
        }
    },

    // Handler: EndCall
    EndCall: (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) => {
        const { userId } = call.request;
        console.log(`[EndCall] User ${userId} requested termination`);
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