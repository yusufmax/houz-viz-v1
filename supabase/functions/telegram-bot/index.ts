
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")
const ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

serve(async (req) => {
    const url = new URL(req.url)

    try {
        // 1. Handle Telegram Webhook (Callback Queries)
        if (req.method === "POST" && url.pathname.endsWith("/telegram")) {
            const body = await req.json()

            if (body.callback_query) {
                const { data, message, from } = body.callback_query
                const [action, requestId] = data.split(":")

                // Fetch the request
                const { data: request, error: fetchError } = await supabase
                    .from("credit_requests")
                    .select("*, profiles(full_name)")
                    .eq("id", requestId)
                    .single()

                if (fetchError || !request) {
                    return new Response("Request not found", { status: 404 })
                }

                if (request.status !== "pending") {
                    await answerCallback(body.callback_query.id, "This request was already processed.")
                    return new Response("OK")
                }

                let status = action === "approve" ? "approved" : "declined"

                // Update request status
                const { error: updateError } = await supabase
                    .from("credit_requests")
                    .update({ status })
                    .eq("id", requestId)

                if (updateError) throw updateError

                if (action === "approve") {
                    // Increment quota
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("generation_quota")
                        .eq("id", request.user_id)
                        .single()

                    const newQuota = (profile?.generation_quota || 0) + request.amount

                    await supabase
                        .from("profiles")
                        .update({ generation_quota: newQuota })
                        .eq("id", request.user_id)
                }

                // Update Telegram Message
                const statusText = action === "approve" ? "✅ APPROVED" : "❌ DECLINED"
                await editTelegramMessage(
                    ADMIN_CHAT_ID!,
                    message.message_id,
                    `Credit Request Update:\n\nUser: ${request.profiles?.full_name || 'Unknown'}\nAmount: ${request.amount}\nStatus: ${statusText}\nProcessed by: ${from.first_name}`
                )

                await answerCallback(body.callback_query.id, `Request ${status}`)
            }

            return new Response("OK")
        }

        // 2. Handle Supabase Webhook (New Request Notification)
        const payload = await req.json()
        const { record, table, type } = payload

        if (table === "credit_requests" && type === "INSERT") {
            const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", record.user_id)
                .single()

            const userName = profile?.full_name || record.user_id

            await sendTelegramMessage(ADMIN_CHAT_ID!, {
                text: `🚀 *New Credit Request*\n\nUser: ${userName}\nAmount: ${record.amount}\nTime: ${new Date(record.created_at).toLocaleString()}`,
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ Approve", callback_data: `approve:${record.id}` },
                            { text: "❌ Decline", callback_data: `decline:${record.id}` }
                        ]
                    ]
                }
            })
        }

        return new Response("Notification Sent")
    } catch (err) {
        console.error(err)
        return new Response(String(err), { status: 500 })
    }
})

async function sendTelegramMessage(chatId: string, options: any) {
    const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, ...options })
    })
    return resp.json()
}

async function editTelegramMessage(chatId: string, messageId: number, text: string) {
    const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, text })
    })
    return resp.json()
}

async function answerCallback(callbackQueryId: string, text: string) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text })
    })
}
