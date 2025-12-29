
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")
const ADMIN_CHAT_IDS = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID")?.split(",").map(id => id.trim()).filter(id => id) || []
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

serve(async (req) => {
    const url = new URL(req.url)

    // 0. Health Check (GET)
    if (req.method === "GET") {
        return new Response(JSON.stringify({
            status: "ok",
            message: "Bot Function is Live",
            admins_configured: ADMIN_CHAT_IDS.length,
            env: {
                has_token: !!BOT_TOKEN,
                has_admin: ADMIN_CHAT_IDS.length > 0,
                has_url: !!SUPABASE_URL,
                has_key: !!SUPABASE_SERVICE_ROLE_KEY
            }
        }), { headers: { "Content-Type": "application/json" } })
    }

    try {
        if (!BOT_TOKEN || ADMIN_CHAT_IDS.length === 0 || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error("Missing environment variables. Did you run 'supabase secrets set'?")
        }

        const body = await req.json()
        console.log("Incoming Payload:", JSON.stringify(body))

        // 1. Handle Telegram Webhook (Callback Queries)
        if (body.callback_query) {
            const { id: callbackId, data, message, from } = body.callback_query
            const [action, requestId] = data.split(":")

            console.log(`Action: ${action}, Request: ${requestId}`)

            // Start Processing
            await answerCallback(callbackId, `Processing ${action}...`)

            // --- Handler for Credit Requests ---
            if (action === "approve" || action === "decline") {
                // Fetch the request
                const { data: request, error: fetchError } = await supabase
                    .from("credit_requests")
                    .select("*")
                    .eq("id", requestId)
                    .single()

                if (fetchError || !request) {
                    await answerCallback(callbackId, "❌ Error: Request not found.")
                    return new Response("Not Found")
                }

                if (request.status !== "pending") {
                    await answerCallback(callbackId, "ℹ️ Already processed.")
                    return new Response("Already Processed")
                }

                // Update status
                const status = action === "approve" ? "approved" : "declined"
                const { error: updateError } = await supabase
                    .from("credit_requests")
                    .update({ status })
                    .eq("id", requestId)

                if (updateError) throw updateError

                if (action === "approve") {
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("generation_quota")
                        .eq("id", request.user_id)
                        .single()

                    const newQuota = (profile?.generation_quota || 0) + request.amount
                    await supabase.from("profiles").update({ generation_quota: newQuota }).eq("id", request.user_id)
                }

                // Update Message
                const statusText = action === "approve" ? "✅ APPROVED" : "❌ DECLINED"
                await editTelegramMessage(
                    message.chat.id.toString(),
                    message.message_id,
                    `Credit Request Update:\n\nUser: ${request.user_id}\nAmount: ${request.amount}\nStatus: ${statusText}\nProcessed by: ${from.first_name}`
                )
            }

            // --- Handler for User Approvals ---
            if (action === "user_approve" || action === "user_decline") {
                const isApproved = action === "user_approve"

                // Fetch current user to check if already approved
                const { data: profile, error: fetchError } = await supabase
                    .from("profiles")
                    .select("is_approved, full_name")
                    .eq("id", requestId)
                    .single()

                if (fetchError || !profile) {
                    await answerCallback(callbackId, "❌ Error: User not found.")
                    return new Response("Not Found")
                }

                // Update status
                const { error: updateError } = await supabase
                    .from("profiles")
                    .update({
                        is_approved: isApproved,
                        generation_quota: isApproved ? 200 : 0
                    })
                    .eq("id", requestId)

                if (updateError) throw updateError

                // Update Message
                const statusText = isApproved ? "✅ USER APPROVED (+200 credits)" : "❌ USER DECLINED"
                await editTelegramMessage(
                    message.chat.id.toString(),
                    message.message_id,
                    `User Approval Update:\n\nUser: ${profile.full_name || requestId}\nStatus: ${statusText}\nProcessed by: ${from.first_name}`
                )
            }

            return new Response("OK")
        }

        // 2. Handle Supabase Webhooks
        const { record, table, type } = body

        // A) New Credit Request
        if (table === "credit_requests" && type === "INSERT") {
            const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", record.user_id).single()
            const userName = profile?.full_name || record.user_id

            // Send notification to ALL configured admins
            for (const chatId of ADMIN_CHAT_IDS) {
                await sendTelegramMessage(chatId, {
                    text: `🚀 *New Credit Request*\n\nUser: ${userName}\nAmount: ${record.amount}\nTime: ${new Date(record.created_at).toLocaleString()}`,
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [[
                            { text: "✅ Approve", callback_data: `approve:${record.id}` },
                            { text: "❌ Decline", callback_data: `decline:${record.id}` }
                        ]]
                    }
                })
            }
        }

        // B) New User Registration
        if (table === "profiles" && type === "INSERT") {
            const userName = record.full_name || "New User"
            const userEmail = record.email || "No email"

            // Send notification to ALL configured admins
            for (const chatId of ADMIN_CHAT_IDS) {
                await sendTelegramMessage(chatId, {
                    text: `👤 *New User Registration*\n\nName: ${userName}\nEmail: ${userEmail}\nID: ${record.id}\n\nApprove this user to grant 200 credits and site access?`,
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [[
                            { text: "✅ Approve User", callback_data: `user_approve:${record.id}` },
                            { text: "❌ Decline", callback_data: `user_decline:${record.id}` }
                        ]]
                    }
                })
            }
        }

        return new Response("OK")

    } catch (err) {
        console.error("CRITICAL ERROR:", err)
        // Try to notify the main admin about the error if possible
        if (BOT_TOKEN && ADMIN_CHAT_IDS.length > 0) {
            await sendTelegramMessage(ADMIN_CHAT_IDS[0], { text: `⚠️ Bot Error: ${err.message}` })
        }
        return new Response(String(err), { status: 500 })
    }
})

async function sendTelegramMessage(chatId: string, options: any) {
    return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, ...options })
    }).then(r => r.json())
}

async function editTelegramMessage(chatId: string, messageId: number, text: string) {
    return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, text })
    }).then(r => r.json())
}

async function answerCallback(callbackQueryId: string, text: string) {
    return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text })
    })
}
