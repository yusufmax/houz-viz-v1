import type { Handler, HandlerEvent } from "@netlify/functions";

const handler: Handler = async (event: HandlerEvent) => {
    // Only allow POST requests
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method not allowed" }),
        };
    }

    const FREEPIK_API_KEY = process.env.VITE_FREEPIK_API_KEY;

    if (!FREEPIK_API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Freepik API key not configured" }),
        };
    }

    try {
        const { path, method = "POST", body } = JSON.parse(event.body || "{}");

        if (!path) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Path is required" }),
            };
        }

        // Forward request to Freepik API
        const response = await fetch(`https://api.freepik.com/v1${path}`, {
            method,
            headers: {
                "x-freepik-api-key": FREEPIK_API_KEY,
                "Content-Type": "application/json",
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        const data = await response.json();

        return {
            statusCode: response.status,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};

export { handler };
