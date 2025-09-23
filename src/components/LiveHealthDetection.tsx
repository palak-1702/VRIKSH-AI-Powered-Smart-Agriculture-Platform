import React from "react";
import { classifyLeafImage, type LeafClassifyResponse } from "../lib/leafClassifier";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

interface Props {
	language: "en" | "hi";
}

export default function LiveHealthDetection({ language }: Props) {
	const videoRef = React.useRef<HTMLVideoElement | null>(null);
	const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
	const fileInputRef = React.useRef<HTMLInputElement | null>(null);

	const [busy, setBusy] = React.useState(false);
	const [cameraOn, setCameraOn] = React.useState(false);
	const [result, setResult] = React.useState<LeafClassifyResponse | null>(null);
	const [error, setError] = React.useState<string | null>(null);
	const [espUrl, setEspUrl] = React.useState("");

	function badgeColor(cls: string) {
		return cls === "healthy" ? "bg-green-100 text-green-700 border border-green-200" : cls === "moderate" ? "bg-yellow-100 text-yellow-800 border border-yellow-200" : "bg-red-100 text-red-700 border border-red-200";
	}

	async function startCamera() {
		try {
			setError(null);
			setResult(null);
			const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				await videoRef.current.play();
				setCameraOn(true);
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
		setCameraOn(false);
	}

	async function captureAndAnalyze() {
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
			const blob: Blob = await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.92));
			const file = new File([blob], "frame.jpg", { type: "image/jpeg" });
			const resp = await classifyLeafImage(file);
			setResult(resp);
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setBusy(false);
		}
	}

	async function analyzeFile(file: File) {
		try {
			setBusy(true);
			setError(null);
			setResult(null);
			const resp = await classifyLeafImage(file);
			setResult(resp);
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setBusy(false);
		}
	}

	async function analyzeEspSnapshot() {
		if (!espUrl) return;
		const bases = ["", "/capture", "/jpg", "/snapshot", "/cam-hi.jpg"];
		let last: Error | null = null;
		for (const p of bases) {
			try {
				const url = espUrl.replace(/\/$/, "") + p;
				const r = await fetch(url, { cache: "no-store" });
				if (!r.ok) throw new Error(`${r.status}`);
				const ct = r.headers.get("content-type") || "";
				if (!ct.includes("image")) throw new Error("Not an image");
				const blob = await r.blob();
				await analyzeFile(new File([blob], "esp32.jpg", { type: blob.type || "image/jpeg" }));
				last = null;
				break;
			} catch (e) {
				last = e as Error;
			}
		}
		if (last) setError(last.message);
	}

	return (
		<Card className="bg-white/90 border-2 border-green-100">
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span>{language === "en" ? "🌿 Live Plant Health Detection" : "🌿 लाइव पौध स्वास्थ्य पहचान"}</span>
					{result && (
						<span className={`px-3 py-1 rounded-full text-sm font-semibold ${badgeColor(result.class)}`}>
							{result.class.toUpperCase()} · {(result.confidence * 100).toFixed(0)}%
						</span>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid md:grid-cols-2 gap-6">
					<div className="space-y-3">
						<div className="relative rounded-2xl overflow-hidden border border-green-200 bg-black/80 aspect-video">
							<video ref={videoRef} className="w-full h-full" playsInline muted />
							{!cameraOn && (
								<div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">
									{language === "en" ? "Camera is off" : "कैमरा बंद है"}
								</div>
							)}
						</div>
						<div className="flex flex-wrap gap-2">
							<Button onClick={cameraOn ? stopCamera : startCamera}>
								{cameraOn ? (language === "en" ? "Stop Camera" : "कैमरा बंद करें") : (language === "en" ? "Start Camera" : "कैमरा शुरू करें")}
							</Button>
							<Button disabled={!cameraOn || busy} onClick={captureAndAnalyze}>
								{busy ? (language === "en" ? "Analyzing…" : "विश्लेषण…") : (language === "en" ? "Analyze" : "विश्लेषण")}
							</Button>
							<Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
								{language === "en" ? "Upload Photo" : "फोटो अपलोड करें"}
							</Button>
							<input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
								const f = e.target.files?.[0];
								if (f) analyzeFile(f);
							}} />
						</div>
					</div>
					<div className="space-y-3">
						<label className="block text-sm font-medium text-gray-700">{language === "en" ? "ESP32-CAM URL" : "ESP32-CAM URL"}</label>
						<div className="flex gap-2">
							<input className="flex-1 border rounded px-3 py-2" placeholder="http://192.168.x.x/capture" value={espUrl} onChange={(e) => setEspUrl(e.target.value)} />
							<Button onClick={analyzeEspSnapshot} disabled={!espUrl || busy}>{language === "en" ? "Analyze Snapshot" : "स्नैपशॉट विश्लेषण"}</Button>
						</div>
						{result && (
							<div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-3 text-sm">
								<div className="font-semibold mb-1">{language === "en" ? "Model Metrics" : "मॉडल मीट्रिक्स"}</div>
								<pre className="text-xs text-gray-700 overflow-auto">{JSON.stringify(result.metrics, null, 2)}</pre>
							</div>
						)}
					</div>
				</div>
				{error && <div className="text-sm text-red-600">{error}</div>}
				<canvas ref={canvasRef} className="hidden" />
			</CardContent>
		</Card>
	);
}


