import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

// 1. Load the Proto
const PROTO_PATH = path.join(__dirname, 'proto', 'signaling.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const signalingProto = grpc.loadPackageDefinition(packageDefinition).signaling as any;

const SERVER_ADDR = 'localhost:50051';

// Helper to create a client for a specific user
function createClient(username: string) {
    const client = new signalingProto.SignalingService(
        SERVER_ADDR,
        grpc.credentials.createInsecure()
    );

    // 2. Join the Call (Open the stream)
    console.log(`[${username}] Connecting...`);
    const stream = client.JoinCall({ userId: username });

    // 3. Listen for incoming messages
    stream.on('data', (message: any) => {
        console.log(`\n📬 [${username}] Received ${message.type} from ${message.fromUserId}`);
        console.log(`   Data: ${message.data.substring(0, 20)}...`); // Show brief data

        // Automate the response: If Bob gets an Offer, he sends an Answer
        if (username === 'Bob' && message.type === 'offer') {
            console.log(`   🤖 [Bob] Auto-replying with Answer...`);
            client.SendAnswer({
                fromUserId: 'Bob',
                toUserId: message.fromUserId,
                sdp: 'BOB_SDP_ANSWER_PAYLOAD'
            }, () => {});
        }
    });

    stream.on('error', (err: any) => console.error(`[${username}] Stream Error:`, err.message));
    
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
    }, (err: any, response: any) => {
        if (err) console.error('Offer Error:', err);
        else console.log('   ✅ [Alice] Offer Sent Ack:', response.message);
    });

}, 1500);

// 3. Keep script running
setInterval(() => {}, 10000);