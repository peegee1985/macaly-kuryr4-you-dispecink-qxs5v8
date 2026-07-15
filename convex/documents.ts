import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import type { Id } from "./_generated/dataModel"

// Generate upload URL for PDF/document upload (dispatcher only)
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nemáte oprávnění")
    return await ctx.storage.generateUploadUrl()
  },
})

// Save document metadata after upload (dispatcher only)
export const saveCustomerDocument = mutation({
  args: {
    customerId: v.id("users"),
    storageId: v.id("_storage"),
    filename: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id("customerDocuments"),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const docId = await ctx.db.insert("customerDocuments", {
      customerId: args.customerId,
      uploadedBy: user._id,
      storageId: args.storageId,
      filename: args.filename,
      uploadedAt: Date.now(),
      description: args.description,
    })
    console.log(`Document saved for customer ${args.customerId}: ${args.filename}`)
    return docId
  },
})

// Delete document (dispatcher only)
export const deleteCustomerDocument = mutation({
  args: { documentId: v.id("customerDocuments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) throw new Error("Nejste přihlášeni")
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") throw new Error("Nemáte oprávnění")

    const doc = await ctx.db.get(args.documentId)
    if (!doc) throw new Error("Dokument nenalezen")

    // Delete from storage
    await ctx.storage.delete(doc.storageId)
    await ctx.db.delete(args.documentId)
    return null
  },
})

// Customer: get my documents
export const getMyDocuments = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("customerDocuments"),
    _creationTime: v.number(),
    customerId: v.id("users"),
    uploadedBy: v.id("users"),
    storageId: v.id("_storage"),
    filename: v.string(),
    uploadedAt: v.number(),
    description: v.optional(v.string()),
    url: v.union(v.string(), v.null()),
  })),
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "customer") return []

    const docs = await ctx.db
      .query("customerDocuments")
      .withIndex("by_customer", (q) => q.eq("customerId", user._id))
      .order("desc")
      .take(100)

    return await Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        url: await ctx.storage.getUrl(doc.storageId),
      }))
    )
  },
})

// Dispatcher: get documents for a specific customer
export const getCustomerDocuments = query({
  args: { customerId: v.id("users") },
  returns: v.array(v.object({
    _id: v.id("customerDocuments"),
    _creationTime: v.number(),
    customerId: v.id("users"),
    uploadedBy: v.id("users"),
    storageId: v.id("_storage"),
    filename: v.string(),
    uploadedAt: v.number(),
    description: v.optional(v.string()),
    url: v.union(v.string(), v.null()),
  })),
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx)
    if (!authId) return []
    const user = await ctx.db.get(authId as Id<"users">)
    if (!user || user.role !== "dispatcher") return []

    const docs = await ctx.db
      .query("customerDocuments")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .order("desc")
      .take(100)

    return await Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        url: await ctx.storage.getUrl(doc.storageId),
      }))
    )
  },
})
