import React from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { classifyLeafImage, type LeafClassifyResponse } from "../lib/leafClassifier";

interface Props {
	language: "en" | "hi";
}

export default function CameraCapture({ language }: Props) {
	const videoRef = React.useRef<HTMLVideoElement | null>(null);
	const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
	const [isCameraOn, setIsCameraOn] = React.useState(false);
	const [busy, setBusy] = React.useState(false);
	const [result, setResult] = React.useState<LeafClassifyResponse | null>(null);
	const [error, setError] = React.useState<string | null>(null);

	const [espUrl, setEspUrl] = React.useState("");
	const [espConnectedUrl, setEspConnectedUrl] = React.useState<string | null>(null);

	async function startCamera() {
		try {
			setError(null);
			setResult(null);
			const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				await videoRef.current.play();
				setIsCameraOn(true);
			}
		} catch (e) {
			setError((e as Error).message);
		}
	}

	function stopCamera() {
		const vid = videoRef.current;
		const stream = vid && (vid.srcObject as MediaStream | null);
		if (stream) stream.getTracks().forEach((t) => t.stop());
		if (vid) vid.srcObject = null;
		setIsCameraOn(false);
	}

	async function analyzeFromVideo() {
		if (!videoRef.current) return;
		try {
			setBusy(true);
			setError(null);
			setResult(null);
			const video = videoRef.current;
			const canvas = canvasRef.current || document.createElement("canvas");
			canvas.width = video.videoWidth || 640;
			canvas.height = video.videoHeight || 480;
			const ctx = canvas.getContext("2d");
			if (!ctx) throw new Error("Canvas not supported");
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
			const blob: Blob = await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.9));
			const file = new File([blob], "frame.jpg", { type: "image/jpeg" });
			const resp = await classifyLeafImage(file);
			setResult(resp);
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setBusy(false);
		}
	}

	async function analyzeFromEspSnapshot() {
		if (!espConnectedUrl) return;
		try {
			setBusy(true);
			setError(null);
			setResult(null);
			// Try to fetch a snapshot image from ESP32-CAM. Many firmwares expose /capture or /jpg or /snapshot
			const candidates = ["", "/capture", "/jpg", "/snapshot", "/cam-hi.jpg"]; // "" allows direct stream URL if it yields a frame
			let lastErr: Error | null = null;
			for (const p of candidates) {
				try {
					const url = espConnectedUrl.replace(/\/$/, "") + p;
					const r = await fetch(url, { cache: "no-store" });
					if (!r.ok) throw new Error(`${r.status}`);
					const ct = r.headers.get("content-type") || "";
					if (!ct.includes("image")) throw new Error("Not an image");
					const blob = await r.blob();
					const file = new File([blob], "esp32.jpg", { type: blob.type || "image/jpeg" });
					const resp = await classifyLeafImage(file);
					setResult(resp);
					lastErr = null;
					break;
				} catch (e) {
					lastErr = e as Error;
				}
			}
			if (lastErr) throw lastErr;
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setBusy(false);
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{language === "en" ? "Device/ESP32 Camera" : "डिवाइस/ESP32 कैमरा"}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="grid md:grid-cols-2 gap-4">
					<div>
						<div className="bg-black/80 rounded-lg overflow-hidden aspect-video">
							<video ref={videoRef} className="w-full h-full" playsInline muted />
						</div>
						<div className="flex gap-2 mt-2">
							<Button onClick={isCameraOn ? stopCamera : startCamera} variant="default">
								{isCameraOn ? (language === "en" ? "Stop Camera" : "कैमरा बंद करें") : (language === "en" ? "Start Camera" : "कैमरा शुरू करें")}
							</Button>
							<Button onClick={analyzeFromVideo} disabled={!isCameraOn || busy}>
								{busy ? (language === "en" ? "Analyzing…" : "विश्लेषण…") : (language === "en" ? "Analyze" : "विश्लेषण")}
							</Button>
						</div>
					</div>
					<div>
						<label className="block text-sm mb-1">{language === "en" ? "ESP32-CAM URL (e.g. http://ip:81/stream or http://ip)" : "ESP32-CAM URL"}</label>
						<div className="flex gap-2">
							<input className="flex-1 border rounded px-2 py-1" value={espUrl} onChange={(e) => setEspUrl(e.target.value)} placeholder="http://192.168.x.x:81/stream" />
							<Button onClick={() => setEspConnectedUrl(espUrl || null)}>{language === "en" ? "Connect" : "कनेक्ट"}</Button>
						</div>
						<div className="mt-2 bg-black/80 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
							{espConnectedUrl ? (
								<img src={espConnectedUrl} alt="ESP32-CAM" className="w-full h-full object-contain" />
							) : (
								<div className="text-gray-400 text-sm p-4">{language === "en" ? "Paste ESP32 URL to view stream" : "स्ट्रीम देखने के लिए URL चिपकाएँ"}</div>
							)}
						</div>
						<div className="flex gap-2 mt-2">
							<Button onClick={analyzeFromEspSnapshot} disabled={!espConnectedUrl || busy}>
								{busy ? (language === "en" ? "Analyzing…" : "विश्लेषण…") : (language === "en" ? "Analyze Snapshot" : "स्नैपशॉट विश्लेषण")}
							</Button>
						</div>
					</div>
				</div>

				{result && (
					<div className="text-sm">
						<span className={`font-semibold ${result.class === 'healthy' ? 'text-green-700' : result.class === 'moderate' ? 'text-yellow-700' : 'text-red-700'}`}>
							{result.class.toUpperCase()}
						</span>
						<span className="text-gray-600"> · {(result.confidence * 100).toFixed(0)}%</span>
					</div>
				)}
				{error && <div className="text-sm text-red-600">{error}</div>}
				<canvas ref={canvasRef} className="hidden" />
			</CardContent>
		</Card>
	);
}


