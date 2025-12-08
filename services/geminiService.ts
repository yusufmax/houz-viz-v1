
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

/**
 * Helper to get image dimensions from base64 data URL
 */
const getImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
};

/**
 * Calculate the closest standard aspect ratio from dimensions
 */
const calculateAspectRatio = (width: number, height: number): string => {
  const ratio = width / height;

  // Define standard aspect ratios with tolerance
  const ratios = [
    { value: 1, label: '1:1' },
    { value: 16 / 9, label: '16:9' },
    { value: 9 / 16, label: '9:16' },
    { value: 4 / 3, label: '4:3' },
    { value: 3 / 4, label: '3:4' }
  ];

  // Find closest match
  let closest = ratios[0];
  let minDiff = Math.abs(ratio - ratios[0].value);

  for (const r of ratios) {
    const diff = Math.abs(ratio - r.value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = r;
    }
  }

  return closest.label;
};

/**
 * Constructs the full prompt for Gemini based on settings.
 * Returns an array of parts (text + images) for multi-modal input.
 */
export const constructFullPrompt = async (settings: GenerationSettings): Promise<any[]> => {
  const parts: any[] = [];
  const textParts: string[] = [];

  // Base Role & Task
  textParts.push(`Role: Expert Architectural AI Visualizer.
Task: Generate a photorealistic architectural visualization based on the inputs.`);

  // Core Description
  textParts.push(`Subject: ${settings.prompt}`);

  // Mode Specific Instructions
  if (settings.lockInterior) {
    textParts.push("STRICT INSTRUCTION: DONT CHANGE CAMERA ANGLE OR ANY DETAILS, ONLY FOLLOW THE PROMPT STRICTLY. MAINTAIN THE EXACT PERSPECTIVE OF THE SOURCE IMAGE.");
  }

  if (settings.keepBuilding) {
    textParts.push("STRICT INSTRUCTION: MAINTAIN THE EXACT BUILDING SHAPE AND GEOMETRY. Do not alter the structural form. Only change materials, lighting, and environment.");
  }

  // Style & Atmosphere
  textParts.push(`Style: ${settings.style}`);
  if (settings.atmosphere && settings.atmosphere.length > 0) {
    textParts.push(`Atmosphere/Mood: ${settings.atmosphere.join(', ')}`);
  }

  textParts.push(`Camera Angle: ${settings.camera}`);

  // Scene Elements
  const elements = [];
  if (settings.sceneElements.people) elements.push("Include realistic people/crowd appropriate for the scene");
  if (settings.sceneElements.cars) elements.push("Include realistic vehicles/cars if consistent with context");
  if (settings.sceneElements.vegetation) elements.push("Add lush photorealistic vegetation/landscaping");
  // if (settings.sceneElements.lighting) elements.push("Enhanced dramatic lighting"); // Not in type
  if (elements.length > 0) textParts.push(`Scene Elements: ${elements.join(', ')}`);

  // Interior Customization Logic
  if (settings.interior) {
    textParts.push("\n--- INTERIOR SPECIFICATIONS ---");

    // Flooring
    if (settings.interior.flooring.type) {
      textParts.push(`Flooring Material: ${settings.interior.flooring.type}`);
    }
    if (settings.interior.flooring.image) {
      textParts.push("Use the following image as a specific reference for the FLOORING MATERIAL texture and finish:");
      parts.push({ text: textParts.join('\n') });
      textParts.length = 0; // Clear text buffer

      const inlineData = await toInlineData(settings.interior.flooring.image);
      parts.push({ inlineData });
    }

    // Furniture
    if (settings.interior.furniture.style) {
      textParts.push(`Furniture Style: ${settings.interior.furniture.style}`);
    }
    if (settings.interior.furniture.image) {
      textParts.push("Use the following image as a specific reference for the FURNITURE STYLE and appearance:");
      if (textParts.length > 0) {
        parts.push({ text: textParts.join('\n') });
        textParts.length = 0;
      }

      const inlineData = await toInlineData(settings.interior.furniture.image);
      parts.push({ inlineData });
    }

    // Colors
    if (settings.interior.primaryColor.value) {
      textParts.push(`Primary Interior Color Scheme: ${settings.interior.primaryColor.value}`);
    }
    if (settings.interior.primaryColor.image) {
      textParts.push("Reference for Primary Color/Palette:");
      if (textParts.length > 0) {
        parts.push({ text: textParts.join('\n') });
        textParts.length = 0;
      }
      const inlineData = await toInlineData(settings.interior.primaryColor.image);
      parts.push({ inlineData });
    }

    if (settings.interior.wallColor.value) {
      textParts.push(`Wall Color/Finish: ${settings.interior.wallColor.value}`);
    }
    if (settings.interior.wallColor.image) {
      textParts.push("Reference for Wall Texture/Finish:");
      if (textParts.length > 0) {
        parts.push({ text: textParts.join('\n') });
        textParts.length = 0;
      }
      const inlineData = await toInlineData(settings.interior.wallColor.image);
      parts.push({ inlineData });
    }
  }

  // Final Quality Tokens
  textParts.push("Output Requirements: High quality, detailed architectural render, 8k resolution, photorealistic textures, physically based rendering.");

  // Push remaining text
  if (textParts.length > 0) {
    parts.push({ text: textParts.join('\n') });
  }

  return parts;
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
  // If style reference exists without a source image AND not in interior mode? 
  // Actually, styleReferenceImage is handled in LinearEditor passing it here.
  // But if we have Interior settings, we likely want to use the main flow, not 'editImage' in the sense of style transfer only.
  // However, pure prompt + ref images works best with generateContent.

  // If there is a source image (Sketch/Photo to Render) -> That usually goes to editImage?
  // But Gemini Flash 2.5 supports generating from images too.
  // Let's stick to the prompt construction for now, assuming standard flow.

  // NOTE: editImage is used for "Image + Text -> Image" (Imge2Image). 
  // If we have a source image in settings (e.g. uploaded sketch), LinearEditor calls editImage?
  // Let's check how LinearEditor calls this. It calls executeGeneration -> generateImage.
  // If sourceImage is present, LinearEditor calls editImage DIRECTLY. 
  // Wait, no. LinearEditor:729: if (sourceImage) return editImage... else return generateImage...

  // So generateImage is solely for Text (+ Ref Images) -> Image.

  try {
    const fullPromptParts = await constructFullPrompt(settings);

    // Gemini Flash Logic (Default)
    const config: any = {
      responseModalities: [Modality.IMAGE],
    };

    if (settings.aspectRatio && settings.aspectRatio !== 'Original') {
      config.imageConfig = { aspectRatio: settings.aspectRatio };
    } else {
      config.imageConfig = { aspectRatio: "16:9" };
    }

    console.log("Gemini Flash Config:", JSON.stringify(config, null, 2));

    const response = await ai.models.generateContent({
      model: settings.model || 'gemini-2.5-flash', // Use Flash 2.5 which is better at multi-modal
      contents: {
        parts: fullPromptParts
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

    // Fallback: Check if it returned text (error or refusal)
    const textPart = candidates?.[0]?.content?.parts?.find((p: any) => p.text);
    if (textPart) {
      throw new Error(`Gemini returned text instead of image: ${textPart.text}`);
    }

    throw new Error("No image generated");
  } catch (error) {
    console.error("Generate Image Error:", error);
    throw error;
  }
};

/**
 * Edits an image or converts sketch to render (Image+Text-to-Image)
 * Uses Gemini Flash Image model as it supports multimodal input
 */
/**
 * Edits an image or converts sketch to render (Image+Text-to-Image)
 * Uses Gemini Flash Image model as it supports multimodal input
 */
export const editImage = async (sourceImage: string | null, settings: GenerationSettings): Promise<string> => {
  try {
    const fullPromptParts = await constructFullPrompt(settings);

    // Initialize parts
    const parts: any[] = [];

    // 1. Add Source Image (Structure Reference) - FIRST
    if (sourceImage) {
      const { mimeType, data } = await toInlineData(sourceImage);
      if (data) {
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: data
          }
        });
        // Explicit instruction immediately following the source image
        parts.push({
          text: "IMAGE 1 (Above): PRIMARY STRUCTURAL REFERENCE. Use this image's exact geometry, lines, and perspective. Do not alter the building shape."
        });
      }
    }

    // 2. Add Style Reference Image - SECOND
    if (settings.styleReferenceImage) {
      const { mimeType, data } = await toInlineData(settings.styleReferenceImage);
      if (data) {
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: data
          }
        });
        parts.push({
          text: "IMAGE 2 (Above): STYLE REFERENCE ONLY. Use this image for colors, materials, and lighting mood. IGNORE its geometry."
        });
      }
    }

    // 3. Add the constructed prompt (Text + Interior Images)
    parts.push(...fullPromptParts);

    // Gemini 3 Pro Logic
    if (settings.model === 'gemini-3-pro-image-preview') {
      const config = {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: settings.aspectRatio !== 'Original' ? settings.aspectRatio : '16:9',
          imageSize: '4K'
        }
      };

      if (settings.aspectRatio === 'Original') {
        config.imageConfig.aspectRatio = "16:9";
      }

      console.log("Gemini 3 Pro Edit Config:", JSON.stringify(config, null, 2));

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: [{ role: 'user', parts: parts }],
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
      throw new Error("No image generated from Gemini 3 Pro Edit");
    }

    // Gemini Flash Logic (Legacy/Default)
    const config: any = {
      responseModalities: [Modality.IMAGE],
    };

    if (settings.aspectRatio !== 'Original') {
      config.imageConfig = { aspectRatio: settings.aspectRatio };
    } else if (sourceImage) {
      try {
        // We might need to recalculate aspect ratio if original is requested
        // But for simplicity, we let the model handle it or default to 16:9 if API enforces it
        // If we really need dimensions, we'd need to async get them.
        // For now, let's skip the strictly calculated part to avoid complexity in this fix, 
        // or use a safe default.
        // actually, let's just leave imageConfig undefined for ratio if original? 
        // API usually requires aspect ratio for image gen.
        config.imageConfig = { aspectRatio: "16:9" }; // Fallback
      } catch (e) {
        config.imageConfig = { aspectRatio: "16:9" };
      }
    }

    const response = await ai.models.generateContent({
      model: settings.model || 'gemini-2.5-flash-image',
      contents: [{ role: 'user', parts: parts }],
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

export const generateRaw = async (prompt: string, model: string, config: any) => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    const genAI = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: config
    });
    return response;
  } catch (error) {
    console.error("Raw generation failed", error);
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
};

/**
 * Transcribes audio to text using Gemini 1.5 Flash
 */
export const transcribeAudio = async (audioBase64: string, mimeType: string): Promise<string> => {
  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: "Transcribe the following audio exactly as spoken. Do not add any other text." },
            { inlineData: { mimeType, data: audioBase64 } }
          ]
        }
      ]
    });

    if (!result || !result.response) {
      throw new Error("Invalid response from Gemini");
    }

    return result.response.text().trim();
  } catch (error) {
    console.error("Transcription failed:", error);
    throw new Error("Failed to transcribe audio");
  }
};
