/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as comments_index from "../comments/index.js";
import type * as deviceAuthorization from "../deviceAuthorization.js";
import type * as email from "../email.js";
import type * as http from "../http.js";
import type * as migrations from "../migrations.js";
import type * as model_emails_templates_baseEmail from "../model/emails/templates/baseEmail.js";
import type * as model_emails_templates_emailTemplates from "../model/emails/templates/emailTemplates.js";
import type * as model_emails_validateEmail from "../model/emails/validateEmail.js";
import type * as model_organizations_index from "../model/organizations/index.js";
import type * as model_posts_index from "../model/posts/index.js";
import type * as organizations_invitations_queries from "../organizations/invitations/queries.js";
import type * as organizations_members_mutations from "../organizations/members/mutations.js";
import type * as organizations_mutations from "../organizations/mutations.js";
import type * as organizations_queries from "../organizations/queries.js";
import type * as payments_model from "../payments/model.js";
import type * as payments_mutations from "../payments/mutations.js";
import type * as payments_queries from "../payments/queries.js";
import type * as posts_mutations from "../posts/mutations.js";
import type * as posts_queries from "../posts/queries.js";
import type * as r2 from "../r2.js";
import type * as rag from "../rag.js";
import type * as services_mutations from "../services/mutations.js";
import type * as storage from "../storage.js";
import type * as url from "../url.js";
import type * as users_actions from "../users/actions.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users_queries from "../users/queries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  "comments/index": typeof comments_index;
  deviceAuthorization: typeof deviceAuthorization;
  email: typeof email;
  http: typeof http;
  migrations: typeof migrations;
  "model/emails/templates/baseEmail": typeof model_emails_templates_baseEmail;
  "model/emails/templates/emailTemplates": typeof model_emails_templates_emailTemplates;
  "model/emails/validateEmail": typeof model_emails_validateEmail;
  "model/organizations/index": typeof model_organizations_index;
  "model/posts/index": typeof model_posts_index;
  "organizations/invitations/queries": typeof organizations_invitations_queries;
  "organizations/members/mutations": typeof organizations_members_mutations;
  "organizations/mutations": typeof organizations_mutations;
  "organizations/queries": typeof organizations_queries;
  "payments/model": typeof payments_model;
  "payments/mutations": typeof payments_mutations;
  "payments/queries": typeof payments_queries;
  "posts/mutations": typeof posts_mutations;
  "posts/queries": typeof posts_queries;
  r2: typeof r2;
  rag: typeof rag;
  "services/mutations": typeof services_mutations;
  storage: typeof storage;
  url: typeof url;
  "users/actions": typeof users_actions;
  "users/mutations": typeof users_mutations;
  "users/queries": typeof users_queries;
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

export declare const components: {
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
  comments: import("@hamzasaleemorg/convex-comments/_generated/component.js").ComponentApi<"comments">;
  rag: import("@convex-dev/rag/_generated/component.js").ComponentApi<"rag">;
  r2: import("@convex-dev/r2/_generated/component.js").ComponentApi<"r2">;
};
