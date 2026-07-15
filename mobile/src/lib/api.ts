import { anyApi } from "convex/server";

// Convex codegen already runs in the web project. The runtime function references
// are path-based, so the mobile client can use the generic API proxy directly.
export const api = anyApi as any;
