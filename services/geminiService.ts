
import { GoogleGenAI, Modality } from "@google/genai";
import { GenerationSettings, RenderStyle, Atmosphere, CameraAngle } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

/**
 * Helper to extract MIME type and base64 data from a Data URL
 */
const parseDataUrl = (dataUrl: string) => {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return {
      mimeType: matches[1],
      data: matches[2]
    };
  }
  // Fallback for raw base64 or malformed strings
  const rawBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  return {
    mimeType: 'image/png', // Default fallback
    data: rawBase64
  };
};

/**
 * Detects if prompt is non-English and translates it.
 */
const translateIfNeeded = async (text: string): Promise<string> => {
  if (!text || text.length < 4) return text;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Detect the language of the following text. If it is not in English, translate it to English. If it is already English, return it exactly as is. Do not add any explanations. Text: "${text}"`,
    });
    return response.text?.trim() || text;
  } catch (e) {
    console.warn("Translation failed, using original text", e);
    return text;
  }
};

/**
 * Helper to convert a URL or Base64 string to Gemini InlineData
 */
const toInlineData = async (input: string) => {
  if (input.startsWith('http')) {
    try {
      const response = await fetch(input);
      const blob = await response.blob();
      return await new Promise<{ mimeType: string, data: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve({ mimeType: blob.type, data: base64 });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Failed to fetch image from URL:", input, e);
      throw new Error("Failed to load image for processing");
    }
  } else {
    return parseDataUrl(input);
  }
};

const constructFullPrompt = async (settings: GenerationSettings): Promise<string> => {
  const translatedPrompt = await translateIfNeeded(settings.prompt);

  // Base Instructions
  const parts = [
    translatedPrompt ? `Subject: ${translatedPrompt}` : "Subject: Modern Architectural Structure",
  ];

  // Scene Elements - strictly enforced
  const elements = [];
  if (settings.sceneElements.people) elements.push("include realistic walking people and pedestrians");
  if (settings.sceneElements.cars) elements.push("include moving cars on streets");
  if (settings.sceneElements.clouds) elements.push("detailed sky with realistic clouds");
  if (settings.sceneElements.vegetation) elements.push("lush vegetation, trees, and landscaping");
  if (settings.sceneElements.city) elements.push("expanding city view and urban background");
  if (settings.sceneElements.motionBlur) elements.push("cinematic motion blur");
  if (settings.sceneElements.enhanceFacade) elements.push("high definition facade materials and textures");

  if (elements.length > 0) {
    parts.push(`MANDATORY ELEMENTS: ${elements.join(', ')}.`);
  }

  // Style & Atmosphere
  if (settings.style !== RenderStyle.None) parts.push(`Art Style: ${settings.style}`);

  const validAtmospheres = settings.atmosphere.filter(a => a !== Atmosphere.None);
  if (validAtmospheres.length > 0) {
    parts.push(`Atmosphere/Lighting: ${validAtmospheres.join(', ')}`);
  }

  if (settings.camera !== CameraAngle.Default) parts.push(`Camera Angle: ${settings.camera}`);

  parts.push("High quality, detailed architectural render, 8k resolution, photorealistic textures, physically based rendering.");

  return parts.filter(Boolean).join('. ');
};

/**
 * Generates a better prompt using Gemini Text model
 */
export const enhancePrompt = async (currentPrompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Improve this architectural rendering prompt to be more descriptive and artistic, suitable for a high-end AI image generator. Keep it concise but vivid. Input: "${currentPrompt}"`,
    });
    return response.text || currentPrompt;
  } catch (error) {
    console.error("Error enhancing prompt:", error);
    return currentPrompt;
  }
};

/**
 * Generates an image from text (Text-to-Image)
 * Uses Gemini Flash Image model.
 */
export const generateImage = async (settings: GenerationSettings): Promise<string> => {
  // If style reference exists without a source image, treat it as edit/transfer
  if (settings.styleReferenceImage) {
    return editImage(null, settings);
  }

  try {
    const fullPrompt = await constructFullPrompt(settings);

    // Configure aspect ratio via imageConfig
    const config: any = {
      responseModalities: [Modality.IMAGE],
    };

    if (settings.aspectRatio && settings.aspectRatio !== 'Original') {
      config.imageConfig = { aspectRatio: settings.aspectRatio };
    } else {
      // Default to 16:9 for T2I if no preference is set, as 'Original' implies no specific constraint
      // but usually T2I needs a target.
      config.imageConfig = { aspectRatio: "16:9" };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: fullPrompt }]
      },
      config: config
    });

    const candidates = response.candidates;
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image generated from Flash");
  } catch (error) {
    console.error("Generation failed", error);
    throw error;
  }
};

/**
 * Edits an image or converts sketch to render (Image+Text-to-Image)
 * Uses Gemini Flash Image model as it supports multimodal input
 */
export const editImage = async (sourceImage: string | null, settings: GenerationSettings): Promise<string> => {
  try {
    const fullPrompt = await constructFullPrompt(settings);

    const parts: any[] = [
      { text: `Generate a high-quality architectural render. ${fullPrompt}` }
    ];

    // Add Source Image (Structure Reference)
    if (sourceImage) {
      const { mimeType, data } = await toInlineData(sourceImage);
      if (data) {
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: data
          }
        });
        parts[0].text += " Use the first image as the main structural reference/sketch.";
      }
    }

    // Add Style Reference Image
    if (settings.styleReferenceImage) {
      const { mimeType, data } = await toInlineData(settings.styleReferenceImage);
      if (data) {
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: data
          }
        });
        const refIndex = sourceImage ? "second" : "first";
        parts[0].text += ` Use the ${refIndex} image as a strict Style Reference for colors, lighting, and material mood.`;
      }
    }

    // Configure aspect ratio via imageConfig
    const config: any = {
      responseModalities: [Modality.IMAGE],
    };

    if (settings.aspectRatio !== 'Original') {
      config.imageConfig = { aspectRatio: settings.aspectRatio };
    } else if (sourceImage) {
      // If Original and Source exists, we ideally don't set aspectRatio to let it follow the input,
      // but we add text guidance to be safe.
      parts[0].text += " Strictly maintain the exact aspect ratio and composition of the source image (first image).";
      if (settings.styleReferenceImage) {
        parts[0].text += " Do NOT change the aspect ratio to match the style reference image. The first image dictates the dimensions.";
      }
    }

    const response = await ai.models.generateContent({
      model: settings.model || 'gemini-2.5-flash-image',
      contents: { parts },
      config: config
    });

    const candidates = response.candidates;
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("No image generated from edit");
  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};

export const upscaleImage = async (image: string): Promise<string> => {
  // Simulating upscale by refining with a "High Resolution" prompt pass
  const settings: GenerationSettings = {
    prompt: "Enhance details, sharpen image, 4k resolution, photorealistic",
    style: RenderStyle.Photorealistic,
    atmosphere: [Atmosphere.None],
    camera: CameraAngle.Default,
    aspectRatio: 'Original',
    sceneElements: { people: false, cars: false, clouds: false, vegetation: false, city: false, motionBlur: false, enhanceFacade: true }
  };
  return await editImage(image, settings);
}
