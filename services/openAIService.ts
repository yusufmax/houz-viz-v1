import OpenAI from 'openai';
import { GenerationSettings } from '../types';

const getOpenAIClient = () => {
  return new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
    dangerouslyAllowBrowser: true,
  });
};

const dataURLtoFile = (dataurl: string, filename: string): File => {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr.length > 1 ? arr[1] : arr[0]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

const buildPrompt = (settings: GenerationSettings): string => {
  const parts = [];
  parts.push(`Subject: ${settings.prompt}`);
  parts.push(`Style: ${settings.style}`);
  if (settings.atmosphere && settings.atmosphere.length > 0) {
    parts.push(`Atmosphere/Mood: ${settings.atmosphere.join(', ')}`);
  }
  parts.push(`Camera Angle: ${settings.camera}`);
  return parts.join('\n');
};

export const generateOpenAIImage = async (settings: GenerationSettings): Promise<string> => {
  const openai = getOpenAIClient();
  const prompt = buildPrompt(settings);

  const options: any = {
    model: settings.model || 'gpt-image-2',
    prompt,
  };
  if (settings.resolution) {
    options.size = settings.resolution.replace(' ', 'x');
  }

  const result = await openai.images.generate(options);

  if (result.data && result.data[0] && result.data[0].b64_json) {
    return `data:image/png;base64,${result.data[0].b64_json}`;
  }

  // Fallback if URL is returned instead
  if (result.data && result.data[0] && result.data[0].url) {
    return result.data[0].url;
  }

  throw new Error('Failed to generate image via OpenAI');
};

export const editOpenAIImage = async (sourceImage: string | null, settings: GenerationSettings): Promise<string> => {
  const openai = getOpenAIClient();
  const prompt = buildPrompt(settings);

  const imagesToSend: File[] = [];

  if (sourceImage) {
    imagesToSend.push(dataURLtoFile(sourceImage, 'source.png'));
  }
  if (settings.styleReferenceImage) {
    imagesToSend.push(dataURLtoFile(settings.styleReferenceImage, 'style.png'));
  }
  if (settings.atmosphereReferenceImage) {
    imagesToSend.push(dataURLtoFile(settings.atmosphereReferenceImage, 'atmosphere.png'));
  }
  if (settings.architectureReferenceImage) {
    imagesToSend.push(dataURLtoFile(settings.architectureReferenceImage, 'architecture.png'));
  }

  if (imagesToSend.length === 0) {
    return generateOpenAIImage(settings);
  }

  const options: any = {
    model: settings.model || 'gpt-image-2',
    image: imagesToSend.length === 1 ? imagesToSend[0] : imagesToSend as any,
    prompt,
  };
  if (settings.resolution) {
    options.size = settings.resolution.replace(' ', 'x');
  }

  const result = await openai.images.edit(options);

  if (result.data && result.data[0] && result.data[0].b64_json) {
    return `data:image/png;base64,${result.data[0].b64_json}`;
  }

  if (result.data && result.data[0] && result.data[0].url) {
    return result.data[0].url;
  }

  throw new Error('Failed to edit image via OpenAI');
};
