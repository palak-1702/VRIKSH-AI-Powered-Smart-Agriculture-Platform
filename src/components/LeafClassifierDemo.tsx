import React from "react";
import { classifyLeafImage, type LeafClassifyResponse } from "../lib/leafClassifier";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { CloudUpload, Wand2, Leaf, Camera } from "lucide-react";

export function LeafClassifierDemo() {
	const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
	const [result, setResult] = React.useState<LeafClassifyResponse | null>(null);
	const [isLoading, setIsLoading] = React.useState(false);
	const [progress, setProgress] = React.useState(0);
	const [error, setError] = React.useState<string | null>(null);

	function tipFor(label?: "healthy" | "moderate" | "unhealthy") {
		switch (label) {
			case "healthy":
				return "Looks healthy! Keep watering regularly 🌱";
			case "moderate":
				return "Mild stress detected. Monitor and consider micronutrients.";
			case "unhealthy":
				return "High stress. Inspect for pests/disease and treat promptly.";
			default:
				return "Upload a clear leaf photo to begin.";
		}
	}

	const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] ?? null;
		setSelectedFile(file);
		setResult(null);
		setError(null);
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		if (file) setPreviewUrl(URL.createObjectURL(file));
	};

	const onSubmit = async () => {
		if (!selectedFile) return;
		setIsLoading(true);
		setProgress(10);
		setError(null);
		try {
			// Simulate small staged progress for UX
			setProgress(35);
			const resp = await classifyLeafImage(selectedFile);
			setResult(resp);
			setProgress(100);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setIsLoading(false);
		}
	};

	const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setError(null);
		const file = e.dataTransfer.files?.[0];
		if (file) {
			setSelectedFile(file);
			if (previewUrl) URL.revokeObjectURL(previewUrl);
			setPreviewUrl(URL.createObjectURL(file));
			setResult(null);
		}
	};

	const badgeClass = result
		? result.class === "healthy"
			? "bg-green-100 text-green-700 border-green-200"
			: result.class === "moderate"
				? "bg-yellow-100 text-yellow-800 border-yellow-200"
				: "bg-red-100 text-red-700 border-red-200"
		: "";

	return (
		<Card className="relative overflow-hidden border-2 border-green-100 bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50">
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span className="flex items-center gap-3 group">
						<Leaf className="text-green-600" />
						<span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-700 to-emerald-600 group-hover:to-green-500 transition-colors">
							Leaf Health Classifier
						</span>
					</span>
					{result && (
						<span className={`px-3 py-1 rounded-full text-sm font-semibold border shadow-sm transition ${badgeClass}`}>
							{result.class.toUpperCase()} · {(result.confidence * 100).toFixed(0)}%
						</span>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="text-center space-y-2">
					<div className="inline-flex items-center gap-2 text-green-700 font-semibold">
						<Camera size={18} />
						<span>Upload Leaf Image for Analysis</span>
					</div>
					<p className="text-sm text-gray-600">Get instant health analysis of your plant leaves using AI</p>
				</div>
				<div
					onDragOver={(e) => e.preventDefault()}
					onDrop={onDrop}
					className={`relative grid md:grid-cols-2 gap-5 rounded-2xl border-2 ${previewUrl ? 'border-green-200' : 'border-dashed border-green-300'} bg-white/80 p-5 transition-shadow hover:shadow-lg`}
				>
					<div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-video flex items-center justify-center">
						{previewUrl ? (
							<img src={previewUrl} alt="Preview" className="w-full h-full object-cover animate-[fadeIn_400ms_ease]" />
						) : (
							<div className="text-center text-gray-600 text-sm">
								<div className="flex justify-center mb-2">
									<div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
										<CloudUpload className="text-green-600" />
									</div>
								</div>
								<div className="font-medium">Drag & Drop or Browse File</div>
								<div className="mt-2">
									<input type="file" accept="image/*" onChange={onFileChange} />
								</div>
							</div>
						)}
					</div>
					<div className="flex flex-col justify-between">
						<div className="space-y-3">
							<p className="text-sm text-gray-600">Upload a clear photo of a leaf. Good lighting improves accuracy.</p>
							<div className="h-2">
								{isLoading && <Progress value={progress} />}
							</div>
						</div>
						<div className="flex items-center gap-3">
							<Button onClick={onSubmit} disabled={!selectedFile || isLoading} className="shadow-md bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 active:scale-[0.98] transition-transform">
								{isLoading ? (
									<span className="flex items-center gap-2">
										<span className="w-3 h-3 rounded-full bg-green-500 animate-ping"></span>
										<span>Classifying...</span>
									</span>
								) : (
									<span className="flex items-center gap-2">
										<Wand2 size={18} />
										<span>Classify</span>
									</span>
								)}
							</Button>
							{selectedFile && !isLoading && (
								<Button variant="secondary" onClick={() => { setSelectedFile(null); setPreviewUrl(null); setResult(null); }}>
									Clear
								</Button>
							)}
						</div>
					</div>
				</div>

				{error && <div className="text-red-600 text-sm">{error}</div>}
				{result && (
					<div className="space-y-4 animate-[fadeIn_300ms_ease]">
						<div className="rounded-2xl border bg-white/80 p-4 shadow-sm">
							<div className="flex items-center justify-between">
								<div className="text-sm text-gray-700">Confidence</div>
								<div className="text-sm font-semibold">{(result.confidence * 100).toFixed(1)}%</div>
							</div>
							<div className="mt-2"><Progress value={Math.max(1, Math.min(100, Math.round(result.confidence * 100)))} /></div>
						</div>
						<div className="grid md:grid-cols-3 gap-3">
							<div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 p-3 border border-green-200">
								<div className="text-xs text-gray-600">Green ratio</div>
								<div className="text-lg font-semibold text-green-700">{(result.metrics.green_ratio * 100).toFixed(1)}%</div>
							</div>
							<div className="rounded-xl bg-gradient-to-br from-yellow-50 to-amber-50 p-3 border border-yellow-200">
								<div className="text-xs text-gray-600">Stress ratio</div>
								<div className="text-lg font-semibold text-yellow-700">{(result.metrics.stress_ratio * 100).toFixed(1)}%</div>
							</div>
							<div className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-3 border border-gray-200">
								<div className="text-xs text-gray-600">Pixels</div>
								<div className="text-lg font-semibold text-gray-800">{result.metrics.pixels}</div>
							</div>
						</div>
						<div className="rounded-2xl border bg-white/80 p-4 shadow-sm text-sm text-gray-700">
							{tipFor(result.class)}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export default LeafClassifierDemo;


