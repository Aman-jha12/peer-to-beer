# Peer-to-Beer

Peer-to-Beer is a high-performance one-to-one real-time video communication platform built using WebRTC for peer-to-peer media streaming and gRPC for highly efficient signaling. The goal of this project is to demonstrate modern distributed communication patterns commonly used in production-grade real-time applications such as Zoom, Meet, Discord, and WhatsApp Calling.

Unlike traditional WebSocket-based signaling, Peer-to-Beer uses **gRPC + Protocol Buffers** for strongly typed communication, binary-level efficiency, and scalable messaging — while Envoy Proxy enables seamless Web compatibility through gRPC-Web translation.

---

## ⚙️ Technology Stack

### Communication Layer
- **WebRTC** (UDP/TCP, P2P Media Transport)
- **gRPC + Protocol Buffers** (Signaling)
- **gRPC-Web** (Browser compatibility)

### Backend
- **Node.js**
- **TypeScript**
- Libraries: `@grpc/grpc-js`, `@grpc/proto-loader`

### Infrastructure
- **Envoy Proxy** (HTTP/1.1 → HTTP/2 translation)
- **Google STUN Server:** `stun:stun.l.google.com:19302`

### Frontend
- **React (Vite)**
- **TypeScript**
- **Tailwind CSS**

---

## 🧩 Architecture Overview

Peer-to-Beer separates **signaling** from **media transfer**, ensuring high scalability and low bandwidth usage. Once the initial handshake completes, media flows directly between peers without involving the server.

```mermaid
graph LR
    subgraph Signaling Layer
    A[Client A] -- gRPC-Web --> E[Envoy Proxy] -- gRPC --> S[Node.js Signaling Server]
    B[Client B] -- gRPC-Web --> E -- gRPC --> S
    end

    subgraph Media Layer
    A -- WebRTC --> B
    end
📡 Signaling Protocol
The server uses server-side streaming to deliver real-time messages while keeping a persistent session open.

proto
Copy code
service SignalingService {
  rpc JoinCall (UserRequest) returns (stream SignalingMessage);
  rpc SendOffer (OfferRequest) returns (SuccessResponse);
  rpc SendAnswer (AnswerRequest) returns (SuccessResponse);
  rpc SendIceCandidate (IceCandidateRequest) returns (SuccessResponse);
}
🔁 Call Lifecycle
Stage	Description
Join	User registers and opens a streaming signaling connection
Offer	Caller sends SDP Offer
Answer	Callee responds with SDP Answer
ICE Exchange	Candidates are exchanged until a valid route is found
P2P Media Path	WebRTC establishes encrypted peer-to-peer streaming

🛠 Setup Instructions
Requirements
Node.js 18+

Docker

npm

1. Clone & Install
sh
Copy code
git clone https://github.com/your-username/peer-to-beer.git
cd peer-to-beer

cd peer-to-beer-backend && npm install
cd ../peer-to-beer-frontend && npm install
2. Generate gRPC Client Code
Run from project root:

sh
Copy code
docker build -t local-grpc-gen -f generator.Dockerfile .

docker run --rm -v ${PWD}:/workspace local-grpc-gen \
  -I=./peer-to-beer-backend/src/proto \
  --js_out=import_style=commonjs:./peer-to-beer-frontend/src/generated \
  --grpc-web_out=import_style=typescript,mode=grpcwebtext:./peer-to-beer-frontend/src/generated \
  signaling.proto
▶️ Running the System
Open three terminals:

Backend (gRPC Server)
sh
Copy code
cd peer-to-beer-backend
npm run dev
Envoy Proxy
sh
Copy code
docker run -d -v ${PWD}/envoy.yaml:/etc/envoy/envoy.yaml -p 8080:8080 -p 9901:9901 envoyproxy/envoy:v1.22.0
Frontend
sh
Copy code
cd peer-to-beer-frontend
npm run dev
🧪 How to Use
Open two browser tabs: http://localhost:5173

In tab A, enter ID: Alice → Join

In tab B, enter ID: Bob → Join

In tab A, enter Bob → Call

Once SDP and ICE exchange completes, both video streams become visible.

🔍 Troubleshooting
Issue	Cause	Fix
503 Service Unavailable	Envoy cannot reach backend	Update IP in envoy.yaml
require is not defined	Vite attempting to load CommonJS proto code	Ensure correct js_out config or vite-commonjs plugin
One-way video	ICE exchange incomplete	Validate PeerConnection creation timing
No RTP media	Privacy permissions or network restrictions	Ensure webcam/mic access + STUN availability

📄 License
This project is distributed under the MIT License, allowing commercial, academic, and personal use with attribution.

🤝 Contributing
Pull requests, discussions, and feature improvements are welcome. Planned extensions include TURN support, multi-participant calls, and UI enhancements.

📌 Project Status
🟢 In Development
Additional features and refinements are actively being implemented.
