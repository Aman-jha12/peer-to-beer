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
// 1. Load the Proto
const PROTO_PATH = path_1.default.join(__dirname, 'proto', 'signaling.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const signalingProto = grpc.loadPackageDefinition(packageDefinition).signaling;
const SERVER_ADDR = 'localhost:50051';
// Helper to create a client for a specific user
function createClient(username) {
    const client = new signalingProto.SignalingService(SERVER_ADDR, grpc.credentials.createInsecure());
    // 2. Join the Call (Open the stream)
    console.log(`[${username}] Connecting...`);
    const stream = client.JoinCall({ userId: username });
    // 3. Listen for incoming messages
    stream.on('data', (message) => {
        console.log(`\n📬 [${username}] Received ${message.type} from ${message.fromUserId}`);
        console.log(`   Data: ${message.data.substring(0, 20)}...`); // Show brief data
        // Automate the response: If Bob gets an Offer, he sends an Answer
        if (username === 'Bob' && message.type === 'offer') {
            console.log(`   🤖 [Bob] Auto-replying with Answer...`);
            client.SendAnswer({
                fromUserId: 'Bob',
                toUserId: message.fromUserId,
                sdp: 'BOB_SDP_ANSWER_PAYLOAD'
            }, () => { });
        }
    });
    stream.on('error', (err) => console.error(`[${username}] Stream Error:`, err.message));
    return client;
}
// --- THE SIMULATION ---
// 1. Initialize Users
const alice = createClient('Alice');
const bob = createClient('Bob');
// 2. Wait a second for connections to establish, then Alice sends an Offer
setTimeout(() => {
    console.log('\n🚀 [Alice] Sending Offer to Bob...');
    alice.SendOffer({
        fromUserId: 'Alice',
        toUserId: 'Bob',
        sdp: 'ALICE_SDP_OFFER_PAYLOAD'
    }, (err, response) => {
        if (err)
            console.error('Offer Error:', err);
        else
            console.log('   ✅ [Alice] Offer Sent Ack:', response.message);
    });
}, 1500);
// 3. Keep script running
setInterval(() => { }, 10000);
