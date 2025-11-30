import { useState, useRef } from "react";

// ---- Imports for gRPC-Web ----
import { SignalingServiceClient } from "./generated/SignalingServiceClientPb.js";
import "./generated/signaling_pb.js";
// @ts-ignore
const proto = window.exports;

// ---- gRPC Client ----
const client = new SignalingServiceClient("http://localhost:8080");

// ---- STUN Server ----
const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function App() {
  const [userId, setUserId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<string | null>(null);
  const [incomingOffer, setIncomingOffer] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(false);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(true);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<string[]>([]);
  const localStream = useRef<MediaStream | null>(null);

  const signalingStream = useRef<any>(null);

  const log = (text: string) => setLogs((prev) => [...prev.slice(-15), text]);

  // ---- Create PeerConnection ONLY when call starts ----
  const ensurePeerConnection = (remote: string) => {
    if (peerConnection.current) return peerConnection.current;

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const req = new proto.IceCandidateRequest();
      req.setFromuserid(userId);
      req.setTouserid(remote);
      req.setCandidate(JSON.stringify(event.candidate));
      client.sendIceCandidate(req, {}, () => {});
    };

    pc.ontrack = (event) => {
      log("Remote track received");
      if (event.streams && event.streams.length > 0) {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          remoteVideoRef.current.play().catch((err) => {
            log(`Play error: ${err.message}`);
          });
        }
      }
    };

    pc.onconnectionstatechange = () => {
      log(`Connection: ${pc.connectionState}`);
    };

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) =>
        pc.addTrack(track, localStream.current as MediaStream)
      );
    }

    peerConnection.current = pc;
    return pc;
  };

  // ---- Start Camera ----
  const startLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      stream.getAudioTracks().forEach((track) => (track.enabled = false));

      localStream.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
      log("Local media started");
    } catch (err) {
      log("Camera/mic access denied");
    }
  };

  // ---- Join Server ----
  const join = async () => {
    if (!userId) return alert("Enter your ID");

    const req = new proto.UserRequest();
    req.setUserid(userId);

    const stream = client.joinCall(req, {});
    signalingStream.current = stream;
    setIsConnected(true);

    await startLocalMedia();

    stream.on("data", async (msg: any) => {
      const sender = msg.getFromuserid();
      const type = msg.getType();
      const payload = msg.getData();

      if (type === "offer") {
        setIncomingCall(sender);
        setIncomingOffer(payload);
      } else if (type === "answer") {
        handleAnswer(payload);
      } else if (type === "candidate") {
        handleCandidate(payload);
      }
    });
  };

  // ---- Accept Incoming Call ----
  const acceptCall = async (sender: string) => {
    setIncomingCall(null);
    setTargetId(sender);
    setInCall(true);

    const pc = ensurePeerConnection(sender);

    if (incomingOffer) {
      try {
        await pc.setRemoteDescription(
          new RTCSessionDescription(JSON.parse(incomingOffer))
        );

        for (const c of pendingCandidates.current) {
          await pc.addIceCandidate(JSON.parse(c));
        }
        pendingCandidates.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        const req = new proto.AnswerRequest();
        req.setFromuserid(userId);
        req.setTouserid(sender);
        req.setSdp(JSON.stringify(answer));

        client.sendAnswer(req, {}, () => {});
        log("Answer sent");
      } catch (err: any) {
        log(`Error accepting call: ${err.message}`);
      }
    }
    setIncomingOffer(null);
  };

  // ---- Decline Incoming Call ----
  const declineCall = () => {
    setIncomingCall(null);
    setIncomingOffer(null);
  };

  // ---- Start Call ----
  const startCall = async () => {
    if (!targetId) return alert("Enter friend ID");

    setInCall(true);
    const pc = ensurePeerConnection(targetId);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const req = new proto.OfferRequest();
      req.setFromuserid(userId);
      req.setTouserid(targetId);
      req.setSdp(JSON.stringify(offer));

      client.sendOffer(req, {}, () => {});
      log("Offer sent");
    } catch (err: any) {
      log(`Error starting call: ${err.message}`);
    }
  };

  // ---- Handle Answer ----
  const handleAnswer = async (sdp: string) => {
    try {
      await peerConnection.current?.setRemoteDescription(
        new RTCSessionDescription(JSON.parse(sdp))
      );

      for (const c of pendingCandidates.current) {
        await peerConnection.current?.addIceCandidate(JSON.parse(c));
      }
      pendingCandidates.current = [];
      log("Answer received");
    } catch (err: any) {
      log(`Error handling answer: ${err.message}`);
    }
  };

  // ---- Handle ICE ----
  const handleCandidate = async (candidate: string) => {
    if (!peerConnection.current?.remoteDescription) {
      pendingCandidates.current.push(candidate);
      return;
    }

    try {
      await peerConnection.current.addIceCandidate(JSON.parse(candidate));
    } catch (err) {
      log("ICE error");
    }
  };

  // ---- Toggle Local Audio ----
  const toggleLocalAudio = () => {
    if (localStream.current) {
      const audioTracks = localStream.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setLocalAudioEnabled(!localAudioEnabled);
    }
  };

  // ---- Toggle Local Video ----
  const toggleLocalVideo = () => {
    if (localStream.current) {
      const videoTracks = localStream.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setLocalVideoEnabled(!localVideoEnabled);
    }
  };

  // ---- Toggle Remote Audio ----
  const toggleRemoteAudio = () => {
    if (remoteVideoRef.current?.srcObject) {
      const stream = remoteVideoRef.current.srcObject as MediaStream;
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setRemoteAudioEnabled(!remoteAudioEnabled);
    }
  };

  // ---- Toggle Remote Video ----
  const toggleRemoteVideo = () => {
    if (remoteVideoRef.current?.srcObject) {
      const stream = remoteVideoRef.current.srcObject as MediaStream;
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setRemoteVideoEnabled(!remoteVideoEnabled);
    }
  };

  // ---- End Call ----
  const endCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setInCall(false);
    setTargetId("");
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col">
      {/* Incoming Call Banner */}
      {incomingCall && (
        <div className="fixed top-0 left-0 right-0 bg-black/40 backdrop-blur-md border-b border-neutral-800 z-50">
          <div className="max-w-4xl mx-auto px-8 py-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-neutral-800 flex items-center justify-center text-blue-500 text-2xl">
                ☎️
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-300">Incoming call</p>
                <p className="text-lg font-semibold text-neutral-50">{incomingCall}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={declineCall}
                className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors flex items-center gap-2"
              >
                ✕
                Decline
              </button>
              <button
                onClick={() => acceptCall(incomingCall)}
                className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors flex items-center gap-2"
              >
                ✓
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {!isConnected ? (
          // ---- Join Section ----
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
              <div className="mb-12">
                <h1 className="text-3xl font-semibold text-neutral-50 mb-2">
                  Peer-to-Peer Calling
                </h1>
                <p className="text-sm text-neutral-400">
                  Enter your ID to get started
                </p>
              </div>

              <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-8 shadow-lg">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Your ID
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-50 placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                      placeholder="Enter your unique ID"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={join}
                    className="w-full px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                  >
                    Join Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : !inCall ? (
          // ---- Call Initiation Section ----
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
              <div className="mb-12">
                <h1 className="text-3xl font-semibold text-neutral-50 mb-2">
                  Make a Call
                </h1>
                <p className="text-sm text-neutral-400">
                  Connected as{" "}
                  <span className="text-neutral-200 font-medium">{userId}</span>
                </p>
              </div>

              <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-8 shadow-lg">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Recipient ID
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-50 placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                      placeholder="Enter recipient's ID"
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={startCall}
                    className="w-full px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                  >
                    Start Call
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // ---- In-Call Section ----
          <div className="flex-1 flex flex-col p-8">
            {/* Video Section */}
            <div className="flex-1 mb-8 relative">
              {/* Remote Video - Full Screen */}
              <div className="w-full h-full bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 shadow-lg relative">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 bg-neutral-900/80 backdrop-blur px-3 py-1.5 rounded-full">
                  <p className="text-sm font-medium text-neutral-50">{targetId}</p>
                </div>
              </div>

              {/* Local Video - Picture in Picture (Bottom Right) */}
              <div className="absolute bottom-6 right-6 w-64 h-48 bg-neutral-900 rounded-xl overflow-hidden border-2 border-neutral-700 shadow-lg hover:shadow-xl transition-shadow">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-neutral-900/80 backdrop-blur px-2.5 py-1 rounded-full">
                  <p className="text-xs font-medium text-neutral-50">You</p>
                </div>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-center gap-4">
              {/* Local Controls */}
              <div className="flex gap-3">
                <button
                  onClick={toggleLocalAudio}
                  className={`p-3 rounded-full transition-colors ${
                    localAudioEnabled
                      ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-50"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                  title={localAudioEnabled ? "Mute" : "Unmute"}
                >
                  {localAudioEnabled ? "🎤" : "🔇"}
                </button>
                <button
                  onClick={toggleLocalVideo}
                  className={`p-3 rounded-full transition-colors ${
                    localVideoEnabled
                      ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-50"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                  title={localVideoEnabled ? "Stop video" : "Start video"}
                >
                  {localVideoEnabled ? "📹" : "📷"}
                </button>
              </div>

              {/* End Call Button */}
              <button
                onClick={endCall}
                className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors text-xl"
                title="End call"
              >
                ☎️
              </button>

              {/* Remote Controls */}
              <div className="flex gap-3">
                <button
                  onClick={toggleRemoteAudio}
                  className={`p-3 rounded-full transition-colors ${
                    remoteAudioEnabled
                      ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-50"
                      : "bg-neutral-700 hover:bg-neutral-600 text-neutral-400"
                  }`}
                  title={remoteAudioEnabled ? "Mute remote" : "Unmute remote"}
                >
                  {remoteAudioEnabled ? "🔊" : "🔇"}
                </button>
                <button
                  onClick={toggleRemoteVideo}
                  className={`p-3 rounded-full transition-colors ${
                    remoteVideoEnabled
                      ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-50"
                      : "bg-neutral-700 hover:bg-neutral-600 text-neutral-400"
                  }`}
                  title={remoteVideoEnabled ? "Hide remote video" : "Show remote video"}
                >
                  {remoteVideoEnabled ? "📷" : "🚫"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
