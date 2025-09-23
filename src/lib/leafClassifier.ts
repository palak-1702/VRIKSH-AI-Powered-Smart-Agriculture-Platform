export type LeafHealthClass = "healthy" | "moderate" | "unhealthy";

export interface LeafClassifyMetrics {
	green_ratio: number;
	yellow_ratio: number;
	brown_ratio: number;
	stress_ratio: number;
	pixels: number;
}

export interface LeafClassifyResponse {
	class: LeafHealthClass;
	confidence: number;
	metrics: LeafClassifyMetrics;
}

/**
 * POST an image file to the backend Flask API and return the parsed result.
 */
export async function classifyLeafImage(
	file: File,
	options?: { baseUrl?: string; signal?: AbortSignal }
): Promise<LeafClassifyResponse> {
	const baseUrl = options?.baseUrl ?? ""; // same-origin when served by Flask
	const form = new FormData();
	form.append("image", file, file.name);

	const response = await fetch(`${baseUrl}/classify`, {
		method: "POST",
		body: form,
		headers: {
			// Let the browser set multipart boundaries
		},
		signal: options?.signal,
	});

	if (!response.ok) {
		const text = await response.text().catch(() => "");
		throw new Error(`Classification failed (${response.status}): ${text}`);
	}

	return (await response.json()) as LeafClassifyResponse;
}


