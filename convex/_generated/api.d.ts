/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTP from "../ResendOTP.js";
import type * as aiAccess from "../aiAccess.js";
import type * as aiPricing from "../aiPricing.js";
import type * as apiKeys from "../apiKeys.js";
import type * as auth from "../auth.js";
import type * as availability from "../availability.js";
import type * as chat from "../chat.js";
import type * as crm from "../crm.js";
import type * as crons from "../crons.js";
import type * as documents from "../documents.js";
import type * as email from "../email.js";
import type * as fuel from "../fuel.js";
import type * as gps from "../gps.js";
import type * as guestCheckout from "../guestCheckout.js";
import type * as guestOrders from "../guestOrders.js";
import type * as hr from "../hr.js";
import type * as http from "../http.js";
import type * as invoices from "../invoices.js";
import type * as notifications from "../notifications.js";
import type * as presence from "../presence.js";
import type * as pushNotifications from "../pushNotifications.js";
import type * as pushNotificationsActions from "../pushNotificationsActions.js";
import type * as receipts from "../receipts.js";
import type * as rides from "../rides.js";
import type * as siteSettings from "../siteSettings.js";
import type * as stripe from "../stripe.js";
import type * as teams from "../teams.js";
import type * as templates from "../templates.js";
import type * as users from "../users.js";
import type * as vending from "../vending.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  aiAccess: typeof aiAccess;
  aiPricing: typeof aiPricing;
  apiKeys: typeof apiKeys;
  auth: typeof auth;
  availability: typeof availability;
  chat: typeof chat;
  crm: typeof crm;
  crons: typeof crons;
  documents: typeof documents;
  email: typeof email;
  fuel: typeof fuel;
  gps: typeof gps;
  guestCheckout: typeof guestCheckout;
  guestOrders: typeof guestOrders;
  hr: typeof hr;
  http: typeof http;
  invoices: typeof invoices;
  notifications: typeof notifications;
  presence: typeof presence;
  pushNotifications: typeof pushNotifications;
  pushNotificationsActions: typeof pushNotificationsActions;
  receipts: typeof receipts;
  rides: typeof rides;
  siteSettings: typeof siteSettings;
  stripe: typeof stripe;
  teams: typeof teams;
  templates: typeof templates;
  users: typeof users;
  vending: typeof vending;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
