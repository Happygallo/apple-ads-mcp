import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppleAdsClient } from "../client/api-client.js";
import type { ApiListResponse, ApiResponse, Campaign, CampaignCreate, CampaignUpdate, Money } from "../types/apple-ads.js";
import type { ReportingRequest, ReportResponse } from "../types/reporting.js";
import { buildSelector } from "../utils/selectors.js";
import { formatCampaignSummary, formatMetrics } from "../utils/formatters.js";
import { handleToolError } from "../utils/error-handler.js";
import { validateDate } from "../utils/validators.js";

export function registerCampaignTools(server: McpServer, client: AppleAdsClient) {
  server.registerTool(
    "list_campaigns",
    {
      title: "List / Find Campaigns",
      description: "List or search campaigns in the account. Returns campaign ID, name, status, budgets, countries, and supply sources. Use without parameters for a quick overview. Add conditions to filter (e.g., status=ENABLED) or sortBy to rank results. This is typically the first tool to call when exploring an account.",
      inputSchema: {
        limit: z.number().optional().describe("Max campaigns to return (default 50)"),
        offset: z.number().optional().describe("Pagination offset"),
        sortBy: z.string().optional().describe("Field to sort by (e.g., 'id', 'name', 'status', 'budgetAmount')"),
        sortOrder: z.enum(["ASCENDING", "DESCENDING"]).optional(),
        conditions: z.array(z.object({
          field: z.string(),
          operator: z.enum(["EQUALS", "GREATER_THAN", "LESS_THAN", "IN", "LIKE", "STARTSWITH", "CONTAINS", "NOT_EQUALS"]),
          values: z.array(z.string()),
        })).optional().describe("Filter conditions (e.g., [{field:'status', operator:'EQUALS', values:['ENABLED']}])"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ limit, offset, sortBy, sortOrder, conditions }) => {
      try {
        let resp: ApiListResponse<Campaign>;

        if (conditions?.length || sortBy) {
          const selector = buildSelector({ limit, offset, sortBy, sortOrder, conditions });
          resp = await client.post<ApiListResponse<Campaign>>("/campaigns/find", selector);
        } else {
          resp = await client.get<ApiListResponse<Campaign>>("/campaigns", {
            limit: String(limit ?? 50),
            offset: String(offset ?? 0),
          });
        }

        const summaries = resp.data.map(formatCampaignSummary);
        const text = [
          `Found ${resp.data.length} campaigns (total: ${resp.pagination?.totalResults ?? resp.data.length}):`,
          "",
          ...summaries.map((s, i) => `--- Campaign ${i + 1} ---\n${s}`),
        ].join("\n");

        return {
          content: [
            { type: "text", text },
            { type: "text", text: JSON.stringify(resp.data, null, 2) },
          ],
        };
      } catch (err) {
        return handleToolError(err);
      }
    }
  );

  server.registerTool(
    "get_campaign_details",
    {
      title: "Get Campaign Details",
      description: "Get full configuration of a specific campaign: targeting settings, budgets (total + daily), countries, supply sources, billing event, and status. Use get_campaign_report for performance metrics instead.",
      inputSchema: {
        campaignId: z.number().describe("The campaign ID"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ campaignId }) => {
      try {
        const resp = await client.get<ApiResponse<Campaign>>(`/campaigns/${campaignId}`);
        const summary = formatCampaignSummary(resp.data);

        return {
          content: [
            { type: "text", text: summary },
            { type: "text", text: JSON.stringify(resp.data, null, 2) },
          ],
        };
      } catch (err) {
        return handleToolError(err);
      }
    }
  );

  server.registerTool(
    "create_campaign",
    {
      title: "Create Campaign",
      description: `Create a new Apple Search Ads campaign. After creation, you MUST create at least one ad group (create_ad_group) and add keywords (add_targeting_keywords) before the campaign can serve ads.

Defaults applied: status=ENABLED, currency=USD, supplySource=APPSTORE_SEARCH_RESULTS. adChannelType and billingEvent are auto-set based on supply source (SEARCH/TAPS for search results, DISPLAY/IMPRESSIONS for search tab).

Lifetime budget (budgetAmount) is optional. Omit it — or pass "", "0", or "none" — to create with only dailyBudgetAmount. Many organizations, including pay-as-you-go, reject a lifetime budget with error LIFETIME_BUDGET_NOT_SUPPORTED.

Side effects: Campaign starts spending immediately if status=ENABLED and budget > 0. Use status=PAUSED to set up everything before going live.`,
      inputSchema: {
        name: z.string().describe("Campaign name"),
        adamId: z.number().describe("App Adam ID (use search_apps to find it)"),
        budgetAmount: z.string().optional().describe("Total/lifetime budget (e.g., '5000.00'). Omit, or pass '', '0', or 'none', to send only the daily budget. Required only for orgs that support a lifetime budget; otherwise Apple returns LIFETIME_BUDGET_NOT_SUPPORTED."),
        dailyBudgetAmount: z.string().describe("Daily budget cap (e.g., '100.00')"),
        countriesOrRegions: z.array(z.string()).describe("Country/region codes (e.g., ['US', 'GB']). Use the apple-ads://countries resource for valid codes"),
        currency: z.string().optional().describe("Currency code (default 'USD')"),
        supplySources: z.array(z.string()).optional().describe("Supply sources: 'APPSTORE_SEARCH_RESULTS' (default) or 'APPSTORE_SEARCH_TAB'"),
        status: z.enum(["ENABLED", "PAUSED"]).optional().describe("Initial status (default 'ENABLED'). Use PAUSED to configure before launch"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ name, adamId, budgetAmount, dailyBudgetAmount, countriesOrRegions, currency, supplySources, status }) => {
      try {
        const cur = currency ?? "USD";
        const resolvedSources = supplySources ?? ["APPSTORE_SEARCH_RESULTS"];
        const lifetimeBudget = resolveLifetimeBudget(budgetAmount);
        const body: CampaignCreate = {
          name,
          adamId,
          dailyBudgetAmount: { amount: dailyBudgetAmount, currency: cur },
          countriesOrRegions,
          supplySources: resolvedSources,
          adChannelType: resolvedSources.includes("APPSTORE_SEARCH_TAB") ? "DISPLAY" : "SEARCH",
          status: status ?? "ENABLED",
          billingEvent: resolvedSources.includes("APPSTORE_SEARCH_TAB") ? "IMPRESSIONS" : "TAPS",
        };
        if (lifetimeBudget) {
          body.budgetAmount = { amount: lifetimeBudget, currency: cur };
        }

        const resp = await client.post<ApiResponse<Campaign>>("/campaigns", body);
        return {
          content: [
            { type: "text", text: `Created campaign "${resp.data.name}" (ID: ${resp.data.id}). Next steps: create_ad_group → add_targeting_keywords` },
            { type: "text", text: JSON.stringify(resp.data, null, 2) },
          ],
        };
      } catch (err) {
        return handleToolError(err);
      }
    }
  );

  server.registerTool(
    "update_campaign",
    {
      title: "Update Campaign",
      description: `Update a campaign's configuration. Only provided fields are changed; omitted fields are left unchanged.

Important: changing countriesOrRegions will clear existing geo targeting (ad-group-level locality/admin area targets). Budget changes take effect immediately. Setting status to PAUSED stops all ad delivery.`,
      inputSchema: {
        campaignId: z.number().describe("The campaign ID"),
        name: z.string().optional().describe("New campaign name"),
        status: z.enum(["ENABLED", "PAUSED"]).optional().describe("New status — PAUSED stops all delivery immediately"),
        budgetAmount: z.string().optional().describe("New total/lifetime budget (cannot be added after creation if not set initially). '', '0', and 'none' are ignored and not sent."),
        dailyBudgetAmount: z.string().optional().describe("New daily budget cap (e.g., '1.50')"),
        countriesOrRegions: z.array(z.string()).optional().describe("New country/region codes — WARNING: clears geo targeting"),
        currency: z.string().optional().describe("Currency code (default 'USD')"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ campaignId, name, status, budgetAmount, dailyBudgetAmount, countriesOrRegions, currency }) => {
      try {
        const cur = currency ?? "USD";
        const body: CampaignUpdate = {};
        if (name) body.name = name;
        if (status) body.status = status;
        const lifetimeBudget = resolveLifetimeBudget(budgetAmount);
        if (lifetimeBudget) body.budgetAmount = { amount: lifetimeBudget, currency: cur };
        if (dailyBudgetAmount) body.dailyBudgetAmount = { amount: dailyBudgetAmount, currency: cur };
        if (countriesOrRegions) body.countriesOrRegions = countriesOrRegions;

        if (Object.keys(body).length === 0) {
          return { content: [{ type: "text", text: "No changes specified." }] };
        }

        const clearGeo = !!countriesOrRegions;
        const resp = await client.put<ApiResponse<Campaign>>(`/campaigns/${campaignId}`, {
          campaign: body,
          clearGeoTargetingOnCountryOrRegionChange: clearGeo,
        });
        return {
          content: [
            { type: "text", text: `Updated campaign "${resp.data.name}" (ID: ${resp.data.id})` },
            { type: "text", text: JSON.stringify(resp.data, null, 2) },
          ],
        };
      } catch (err) {
        return handleToolError(err);
      }
    }
  );

  server.registerTool(
    "delete_campaign",
    {
      title: "Delete Campaign",
      description: "Permanently delete a campaign and all its child ad groups, keywords, and ads. This action CANNOT be undone. The campaign must be paused before deletion. Consider pausing instead if you might need the data later.",
      inputSchema: {
        campaignId: z.number().describe("The campaign ID to delete"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ campaignId }) => {
      try {
        await client.delete<unknown>(`/campaigns/${campaignId}`);
        return {
          content: [{ type: "text", text: `Deleted campaign ${campaignId}.` }],
        };
      } catch (err) {
        return handleToolError(err);
      }
    }
  );

  server.registerTool(
    "get_campaign_report",
    {
      title: "Campaign Performance Report",
      description: "Get performance metrics for one or all campaigns over a date range. Returns impressions, taps, installs, spend, CPA, CPT, TTR, and conversion rates. Use for high-level performance analysis. For deeper analysis, drill down with get_adgroup_report or get_keyword_report.",
      inputSchema: {
        campaignId: z.number().optional().describe("Filter to a specific campaign (omit for all campaigns)"),
        startDate: z.string().describe("Start date (YYYY-MM-DD)"),
        endDate: z.string().describe("End date (YYYY-MM-DD)"),
        granularity: z.enum(["HOURLY", "DAILY", "WEEKLY", "MONTHLY"]).optional().describe("Time granularity for trend data (default DAILY)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ campaignId, startDate, endDate, granularity }) => {
      try {
        validateDate(startDate, "startDate");
        validateDate(endDate, "endDate");

        const reportReq: ReportingRequest = {
          startTime: startDate,
          endTime: endDate,
          granularity: granularity ?? "DAILY",
          selector: buildSelector({
            limit: 1000,
            sortBy: "localSpend",
            sortOrder: "DESCENDING",
            conditions: campaignId
              ? [{ field: "campaignId", operator: "EQUALS", values: [String(campaignId)] }]
              : undefined,
          }),
          returnRowTotals: true,
          returnGrandTotals: true,
        };

        const path = "/reports/campaigns";

        const resp = await client.post<ReportResponse<{ campaignId: number; campaignName: string }>>(path, reportReq);
        const rows = resp.data.reportingDataResponse.row;

        if (rows.length === 0) {
          return { content: [{ type: "text", text: "No data found for the specified date range." }] };
        }

        const summaries = rows.map((row) => {
          const meta = row.metadata;
          return [
            `Campaign: ${meta.campaignName} (ID: ${meta.campaignId})`,
            formatMetrics(row.total),
          ].join("\n");
        });

        const text = [
          `Campaign Report (${startDate} to ${endDate}):`,
          "",
          ...summaries.map((s, i) => `--- Campaign ${i + 1} ---\n${s}`),
        ].join("\n");

        return {
          content: [
            { type: "text", text },
            { type: "text", text: JSON.stringify(rows, null, 2) },
          ],
        };
      } catch (err) {
        return handleToolError(err);
      }
    }
  );
}

/**
 * Amount to send as budgetAmount, or undefined when the field must be omitted.
 * Apple returns LIFETIME_BUDGET_NOT_SUPPORTED if a lifetime budget is present on
 * orgs that only allow a daily budget (common for pay-as-you-go). Blank, "none",
 * and numeric zero ("0", "0.00") mean "daily budget only".
 */
function resolveLifetimeBudget(budgetAmount: string | undefined): string | undefined {
  if (budgetAmount == null) return undefined;
  const trimmed = budgetAmount.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.toLowerCase() === "none") return undefined;
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric) && numeric === 0) return undefined;
  return trimmed;
}
