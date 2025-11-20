import { RenderStyle, Atmosphere, CameraAngle } from '../types';

/**
 * Tool definitions for Agentic Mode
 * These tools allow Gemini to control the UI
 */

export interface AgenticTool {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: Record<string, any>;
        required: string[];
    };
}

export const AGENTIC_TOOLS: AgenticTool[] = [
    {
        name: 'selectStyle',
        description: 'Select a rendering style for image generation',
        parameters: {
            type: 'object',
            properties: {
                style: {
                    type: 'string',
                    enum: Object.values(RenderStyle),
                    description: 'The rendering style to select'
                }
            },
            required: ['style']
        }
    },
    {
        name: 'setAtmosphere',
        description: 'Set the atmosphere/lighting for the render',
        parameters: {
            type: 'object',
            properties: {
                atmosphere: {
                    type: 'string',
                    enum: Object.values(Atmosphere),
                    description: 'The atmosphere to set'
                }
            },
            required: ['atmosphere']
        }
    },
    {
        name: 'setCameraAngle',
        description: 'Set the camera angle/perspective',
        parameters: {
            type: 'object',
            properties: {
                angle: {
                    type: 'string',
                    enum: Object.values(CameraAngle),
                    description: 'The camera angle to set'
                }
            },
            required: ['angle']
        }
    },
    {
        name: 'setModel',
        description: 'Select the AI model to use for generation',
        parameters: {
            type: 'object',
            properties: {
                model: {
                    type: 'string',
                    enum: ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview'],
                    description: 'The model to use'
                }
            },
            required: ['model']
        }
    },
    {
        name: 'setResolution',
        description: 'Set the output resolution',
        parameters: {
            type: 'object',
            properties: {
                resolution: {
                    type: 'string',
                    enum: ['1K', '2K', '4K'],
                    description: 'The resolution to set'
                }
            },
            required: ['resolution']
        }
    },
    {
        name: 'setAspectRatio',
        description: 'Set the aspect ratio for the output',
        parameters: {
            type: 'object',
            properties: {
                aspectRatio: {
                    type: 'string',
                    enum: ['1:1', '16:9', '9:16', '4:3', '3:4'],
                    description: 'The aspect ratio to set'
                }
            },
            required: ['aspectRatio']
        }
    },
    {
        name: 'toggleSceneElement',
        description: 'Toggle scene elements like people, cars, vegetation, etc.',
        parameters: {
            type: 'object',
            properties: {
                element: {
                    type: 'string',
                    enum: ['people', 'cars', 'clouds', 'vegetation', 'city', 'motionBlur', 'enhanceFacade'],
                    description: 'The scene element to toggle'
                },
                enabled: {
                    type: 'boolean',
                    description: 'Whether to enable or disable the element'
                }
            },
            required: ['element', 'enabled']
        }
    },
    {
        name: 'generateImage',
        description: 'Trigger image generation with a specific prompt',
        parameters: {
            type: 'object',
            properties: {
                prompt: {
                    type: 'string',
                    description: 'The prompt for image generation'
                }
            },
            required: ['prompt']
        }
    },
    {
        name: 'navigateToMode',
        description: 'Navigate to a different mode (Linear or Infinity)',
        parameters: {
            type: 'object',
            properties: {
                mode: {
                    type: 'string',
                    enum: ['linear', 'infinity'],
                    description: 'The mode to navigate to'
                }
            },
            required: ['mode']
        }
    }
];

/**
 * Tool execution handler type
 */
export type ToolExecutor = (toolName: string, args: any) => Promise<void> | void;
