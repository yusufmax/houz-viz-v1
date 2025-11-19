import type { Handler, HandlerEvent } from "@netlify/functions";

const handler: Handler = async (event: HandlerEvent) => {
    // Only allow POST requests
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method not allowed" }),
        };
    }

    const REPLICATE_API_TOKEN = process.env.VITE_REPLICATE_API_TOKEN;

    if (!REPLICATE_API_TOKEN) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Replicate API token not configured" }),
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

        // Forward request to Replicate API
        const response = await fetch(`https://api.replicate.com/v1${path}`, {
            method,
            headers: {
                Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
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
