/**
 * Service to interact with Replicate API for Trellis 3D Gaussian Splat & Mesh generation.
 */

export interface TrellisResult {
  model_file?: string;      // GLB 3D model
  gaussian_ply?: string;    // Gaussian Point Cloud (.ply)
  color_video?: string;     // Preview orbit video
  normal_video?: string;    // Normal preview video
  combined_video?: string;  // Combined view video
}

export interface SplatPrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output: TrellisResult | null;
  error: string | null;
}

export const startTrellisPrediction = async (imageUrl: string): Promise<SplatPrediction> => {
  console.log("[SplatService] Requesting SHARP Gaussian Splat generation for:", imageUrl);

  const response = await fetch('/api/replicate/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      version: '2be5eda5c0ed5eee96e94f7391fe407d070be0d0aa567437fe7940133c789c21',
      input: {
        image: imageUrl
      }
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || `Replicate API Error: ${response.status}`);
  }

  const prediction = await response.json();
  
  let formattedOutput: TrellisResult | null = null;
  if (prediction.output) {
    const plyUrl = typeof prediction.output === 'string' ? prediction.output : (prediction.output[0] || null);
    if (plyUrl) {
      formattedOutput = { gaussian_ply: plyUrl };
    }
  }

  return {
    id: prediction.id,
    status: prediction.status,
    output: formattedOutput,
    error: prediction.error
  };
};

export const getTrellisPredictionStatus = async (predictionId: string): Promise<SplatPrediction> => {
  const pollUrl = `/api/replicate/predictions/${predictionId}`;
  
  const response = await fetch(pollUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch prediction status: ${response.status}`);
  }

  const prediction = await response.json();
  
  let formattedOutput: TrellisResult | null = null;
  if (prediction.output) {
    const plyUrl = typeof prediction.output === 'string' ? prediction.output : (prediction.output[0] || null);
    if (plyUrl) {
      formattedOutput = { gaussian_ply: plyUrl };
    }
  }

  return {
    id: prediction.id,
    status: prediction.status,
    output: formattedOutput,
    error: prediction.error
  };
};
