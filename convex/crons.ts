import { cronJobs } from "convex/server"
import { internalMutation } from "./_generated/server"
import { internal } from "./_generated/api"

// Internal mutation: delete chat messages older than 90 days
export const purgeOldChatMessages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
    const old = await ctx.db
      .query("chatMessages")
      .order("asc")
      .take(500) // process in batches of 500
    const toDelete = old.filter(m => m._creationTime < cutoff)
    console.log(`Purging ${toDelete.length} chat messages older than 90 days`)
    for (const msg of toDelete) {
      if (msg.imageStorageId) {
        await ctx.storage.delete(msg.imageStorageId)
      }
      await ctx.db.delete(msg._id)
    }
  },
})

// Run daily at 3:00 AM
const crons = cronJobs()
crons.daily(
  "purge-old-chat-messages",
  { hourUTC: 3, minuteUTC: 0 },
  internal.crons.purgeOldChatMessages,
)

export default crons
