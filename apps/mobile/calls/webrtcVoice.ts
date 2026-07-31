import type { DemoUserKey } from "../data/seed";
import type { WebRtcSignalPayload } from "../sync/protocol";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function isWebRtcVoiceSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof RTCPeerConnection !== "undefined"
  );
}

type SignalSend = (
  targetKey: DemoUserKey,
  payload: WebRtcSignalPayload,
) => void;

/**
 * Browser mesh voice: one RTCPeerConnection per remote participant.
 * Signaling is relayed by the sync server (opaque offer/answer/ICE).
 */
export class WebRtcVoiceSession {
  private localStream: MediaStream | null = null;
  private readonly peers = new Map<string, RTCPeerConnection>();
  private readonly pendingIce = new Map<string, RTCIceCandidateInit[]>();
  private readonly audioEls = new Map<string, HTMLAudioElement>();
  private readonly remoteSources = new Map<string, MediaStreamAudioSourceNode>();
  private readonly signalChain = new Map<string, Promise<void>>();
  private muted = false;
  private roomId: string;
  private selfKey: DemoUserKey;
  private sendSignal: SignalSend;
  private makingOffer = new Set<string>();
  private ignoreOffer = new Set<string>();
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private levelData: Uint8Array<ArrayBuffer> | null = null;
  private remoteTrackCount = 0;

  constructor(opts: {
    roomId: string;
    selfKey: DemoUserKey;
    sendSignal: SignalSend;
  }) {
    this.roomId = opts.roomId;
    this.selfKey = opts.selfKey;
    this.sendSignal = opts.sendSignal;
  }

  async start(): Promise<void> {
    if (!isWebRtcVoiceSupported()) {
      throw new Error("Voice requires a browser with WebRTC");
    }
    await this.ensureAudioContext();
    if (!this.localStream) {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      this.applyMute();
      this.attachLevelMeter(this.localStream);
    }
  }

  /** 0–1 mic input level (for UI). Local audio is never played back to you. */
  getMicLevel(): number {
    if (this.muted || !this.analyser || !this.levelData) return 0;
    this.analyser.getByteTimeDomainData(this.levelData);
    let sum = 0;
    for (let i = 0; i < this.levelData.length; i++) {
      const v = (this.levelData[i]! - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / this.levelData.length);
    return Math.min(1, rms * 4);
  }

  hasRemoteAudio(): boolean {
    return this.remoteTrackCount > 0;
  }

  private async ensureAudioContext() {
    if (this.audioContext) {
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume().catch(() => undefined);
      }
      return;
    }
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.audioContext = new Ctx();
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume().catch(() => undefined);
    }
  }

  private attachLevelMeter(stream: MediaStream) {
    try {
      if (!this.audioContext) return;
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.levelData = new Uint8Array(
        new ArrayBuffer(this.analyser.frequencyBinCount),
      );
      source.connect(this.analyser);
      // Do NOT connect analyser to destination — that would create sidetone/echo.
    } catch {
      // Level meter is optional.
    }
  }

  private async attachRemoteAudio(remoteKey: DemoUserKey, stream: MediaStream) {
    await this.ensureAudioContext();

    let el = this.audioEls.get(remoteKey);
    if (!el) {
      el = document.createElement("audio");
      el.autoplay = true;
      el.controls = false;
      el.muted = false;
      el.volume = 1;
      el.setAttribute("playsinline", "true");
      el.setAttribute("autoplay", "true");
      el.style.position = "fixed";
      el.style.width = "0";
      el.style.height = "0";
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
      document.body.appendChild(el);
      this.audioEls.set(remoteKey, el);
    }
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    el.muted = false;
    el.volume = 1;

    let played = false;
    try {
      await el.play();
      played = true;
    } catch {
      played = false;
    }

    // If autoplay is blocked, route via AudioContext (resumed on accept gesture).
    if (!played && this.audioContext) {
      try {
        const prev = this.remoteSources.get(remoteKey);
        if (prev) {
          try {
            prev.disconnect();
          } catch {
            // ignore
          }
        }
        const src = this.audioContext.createMediaStreamSource(stream);
        src.connect(this.audioContext.destination);
        this.remoteSources.set(remoteKey, src);
      } catch {
        // ignore
      }
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.applyMute();
  }

  private applyMute() {
    if (!this.localStream) return;
    for (const track of this.localStream.getAudioTracks()) {
      track.enabled = !this.muted;
    }
  }

  /** Perfect negotiation: lexicographically greater key is polite. */
  private isPolite(remoteKey: DemoUserKey): boolean {
    return this.selfKey > remoteKey;
  }

  private isInitiator(remoteKey: DemoUserKey): boolean {
    return this.selfKey < remoteKey;
  }

  async ensurePeer(remoteKey: DemoUserKey): Promise<void> {
    await this.start();
    if (this.peers.has(remoteKey)) return;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.peers.set(remoteKey, pc);

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    } else {
      pc.addTransceiver("audio", { direction: "sendrecv" });
    }

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      this.sendSignal(remoteKey, {
        kind: "ice",
        candidate: ev.candidate.candidate,
        sdpMid: ev.candidate.sdpMid,
        sdpMLineIndex: ev.candidate.sdpMLineIndex,
      });
    };

    pc.ontrack = (ev) => {
      const stream =
        ev.streams[0] ?? new MediaStream(ev.track ? [ev.track] : []);
      if (ev.track && !stream.getTracks().includes(ev.track)) {
        stream.addTrack(ev.track);
      }
      this.remoteTrackCount += 1;
      ev.track?.addEventListener("ended", () => {
        this.remoteTrackCount = Math.max(0, this.remoteTrackCount - 1);
      });
      void this.attachRemoteAudio(remoteKey, stream);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") {
        pc.restartIce();
      }
    };

    if (this.isInitiator(remoteKey)) {
      await this.createAndSendOffer(remoteKey, pc);
    }
  }

  private async createAndSendOffer(
    remoteKey: DemoUserKey,
    pc: RTCPeerConnection,
  ) {
    this.makingOffer.add(remoteKey);
    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      if (pc.localDescription?.sdp) {
        this.sendSignal(remoteKey, {
          kind: "offer",
          sdp: pc.localDescription.sdp,
        });
      }
    } finally {
      this.makingOffer.delete(remoteKey);
    }
  }

  async handleSignal(
    fromKey: DemoUserKey,
    payload: WebRtcSignalPayload,
  ): Promise<void> {
    const prev = this.signalChain.get(fromKey) ?? Promise.resolve();
    const next = prev
      .then(() => this.handleSignalSerial(fromKey, payload))
      .catch(() => undefined);
    this.signalChain.set(fromKey, next);
    await next;
  }

  private async handleSignalSerial(
    fromKey: DemoUserKey,
    payload: WebRtcSignalPayload,
  ): Promise<void> {
    await this.start();
    let pc = this.peers.get(fromKey);
    if (!pc) {
      await this.ensurePeer(fromKey);
      pc = this.peers.get(fromKey);
    }
    if (!pc) return;

    if (payload.kind === "offer") {
      if (!payload.sdp) return;
      const offerCollision =
        this.makingOffer.has(fromKey) || pc.signalingState !== "stable";
      const polite = this.isPolite(fromKey);
      if (offerCollision) {
        if (!polite) {
          this.ignoreOffer.add(fromKey);
          return;
        }
        // Polite peer rolls back local offer and accepts remote.
        try {
          await pc.setLocalDescription({ type: "rollback" });
        } catch {
          // Older browsers may not support rollback; continue best-effort.
        }
      }
      this.ignoreOffer.delete(fromKey);
      await pc.setRemoteDescription({ type: "offer", sdp: payload.sdp });
      await this.flushIce(fromKey, pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (pc.localDescription?.sdp) {
        this.sendSignal(fromKey, {
          kind: "answer",
          sdp: pc.localDescription.sdp,
        });
      }
      return;
    }

    if (payload.kind === "answer") {
      if (!payload.sdp) return;
      if (this.ignoreOffer.has(fromKey)) {
        this.ignoreOffer.delete(fromKey);
        return;
      }
      if (pc.signalingState !== "have-local-offer") {
        return;
      }
      await pc.setRemoteDescription({ type: "answer", sdp: payload.sdp });
      await this.flushIce(fromKey, pc);
      return;
    }

    if (payload.kind === "ice") {
      const candidate: RTCIceCandidateInit = {
        candidate: payload.candidate,
        sdpMid: payload.sdpMid ?? undefined,
        sdpMLineIndex: payload.sdpMLineIndex ?? undefined,
      };
      if (!pc.remoteDescription) {
        const queue = this.pendingIce.get(fromKey) ?? [];
        queue.push(candidate);
        this.pendingIce.set(fromKey, queue);
        return;
      }
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // Ignore late/failed ICE
      }
    }
  }

  private async flushIce(remoteKey: DemoUserKey, pc: RTCPeerConnection) {
    const queue = this.pendingIce.get(remoteKey);
    if (!queue?.length) return;
    this.pendingIce.delete(remoteKey);
    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // ignore
      }
    }
  }

  removePeer(remoteKey: DemoUserKey) {
    const pc = this.peers.get(remoteKey);
    if (pc) {
      pc.close();
      this.peers.delete(remoteKey);
    }
    this.pendingIce.delete(remoteKey);
    this.makingOffer.delete(remoteKey);
    this.ignoreOffer.delete(remoteKey);
    this.signalChain.delete(remoteKey);
    const src = this.remoteSources.get(remoteKey);
    if (src) {
      try {
        src.disconnect();
      } catch {
        // ignore
      }
      this.remoteSources.delete(remoteKey);
    }
    const el = this.audioEls.get(remoteKey);
    if (el) {
      el.srcObject = null;
      el.remove();
      this.audioEls.delete(remoteKey);
    }
  }

  hangUp() {
    for (const key of [...this.peers.keys()]) {
      this.removePeer(key as DemoUserKey);
    }
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
      this.localStream = null;
    }
    this.remoteTrackCount = 0;
    this.analyser = null;
    this.levelData = null;
    if (this.audioContext) {
      void this.audioContext.close().catch(() => undefined);
      this.audioContext = null;
    }
  }

  getRoomId(): string {
    return this.roomId;
  }
}
