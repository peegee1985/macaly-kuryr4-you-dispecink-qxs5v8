import { internalAction } from "./_generated/server"
import { v } from "convex/values"

// Internal action: send email via Macaly built-in email API
export const sendEmail = internalAction({
  args: {
    toEmail: v.string(),
    subject: v.string(),
    message: v.string(),
  },
  handler: async (_ctx, args) => {
    const endpoint = process.env.EMAIL_NOTIFICATION_ENDPOINT
    const chatId = process.env.CHAT_ID
    const appName = process.env.APP_NAME
    const secretKey = process.env.SECRET_KEY

    if (!endpoint || !chatId || !appName || !secretKey) {
      console.log("Email env vars not configured, skipping email to:", args.toEmail)
      return
    }

    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: args.toEmail,
          subject: args.subject,
          message: args.message,
          chatId,
          appName,
          secretKey,
        }),
      })
      if (!resp.ok) {
        const body = await resp.text()
        console.error(`Email failed (${resp.status}):`, body)
      } else {
        console.log(`Email sent to ${args.toEmail}: ${args.subject}`)
      }
    } catch (e) {
      console.error("Email send error:", e)
    }
  },
})
