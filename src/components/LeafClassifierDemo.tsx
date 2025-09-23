import React from "react";
import { classifyLeafImage, type LeafClassifyResponse } from "../lib/leafClassifier";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function LeafClassifierDemo() {
	const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
	const [result, setResult] = React.useState<LeafClassifyResponse | null>(null);
	const [isLoading, setIsLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] ?? null;
		setSelectedFile(file);
		setResult(null);
		setError(null);
	};

	const onSubmit = async () => {
		if (!selectedFile) return;
		setIsLoading(true);
		setError(null);
		try {
			const resp = await classifyLeafImage(selectedFile);
			setResult(resp);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Leaf Health Classifier</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<input type="file" accept="image/*" onChange={onFileChange} />
				<Button onClick={onSubmit} disabled={!selectedFile || isLoading}>
					{isLoading ? "Classifying..." : "Classify"}
				</Button>
				{error && <div className="text-red-600 text-sm">{error}</div>}
				{result && (
					<div className="text-sm">
						<div>
							<strong>Class:</strong> {result.class}
						</div>
						<div>
							<strong>Confidence:</strong> {(result.confidence * 100).toFixed(1)}%
						</div>
						<pre className="bg-muted p-2 rounded mt-2 overflow-auto">
							{JSON.stringify(result.metrics, null, 2)}
						</pre>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export default LeafClassifierDemo;


