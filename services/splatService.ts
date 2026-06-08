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
  console.log("[SplatService] Requesting Trellis 3D generation for:", imageUrl);

  const response = await fetch('/api/replicate/models/firtoz/trellis/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: {
        images: [imageUrl],
        generate_model: true,
        texture_size: 1024, // Optimized for faster processing
        mesh_simplify: 0.95
      }
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || `Replicate API Error: ${response.status}`);
  }

  const prediction = await response.json();
  return {
    id: prediction.id,
    status: prediction.status,
    output: prediction.output,
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
  return {
    id: prediction.id,
    status: prediction.status,
    output: prediction.output,
    error: prediction.error
  };
};
