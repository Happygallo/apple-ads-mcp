import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerPrompts(server: McpServer) {
  server.prompt(
    "campaign_health_check",
    "Comprehensive health check of a campaign — analyzes performance, keywords, search terms, and budgets to identify issues and optimization opportunities.",
    {
      campaignId: z.string().describe("The campaign ID to analyze"),
      dateRange: z.enum(["LAST_7_DAYS", "LAST_14_DAYS", "LAST_30_DAYS", "LAST_90_DAYS"]).optional().describe("Date range (default LAST_30_DAYS)"),
    },
    ({ campaignId, dateRange }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Perform a comprehensive health check on campaign ${campaignId} for the ${dateRange ?? "LAST_30_DAYS"} period.

Follow these steps:

1. **Get the full campaign snapshot** using get_campaign_snapshot (campaignId: ${campaignId}, dateRange: "${dateRange ?? "LAST_30_DAYS"}").

2. **Analyze the data** and report on:
   - **Budget health**: Is the campaign under-spending or over-spending vs daily budget? Days until budget exhaustion?
   - **Cost efficiency**: Is CPA trending up or down? How does it compare across ad groups?
   - **Keyword performance**: Which keywords have high spend but low conversions (waste)? Which have great CPA but low impression share (opportunity)?
   - **Search term quality**: Are there search terms with high spend and zero installs that should be added as negatives? Any high-converting terms not yet added as exact keywords?
   - **Ad group balance**: Are all ad groups contributing, or is spend concentrated in one?

3. **Provide specific recommendations** with concrete actions:
   - Keywords to pause (high CPA, no conversions)
   - Keywords to increase bids (good CPA, low impression share)
   - Search terms to add as negative keywords (wasteful)
   - Search terms to add as exact match keywords (high converting)
   - Budget adjustments needed
   - Any structural issues (too few keywords, missing negatives, etc.)

Format each recommendation as an actionable item I can approve and execute.`,
          },
        },
      ],
    })
  );

  server.prompt(
    "keyword_optimization",
    "Analyze keyword and search term performance to generate specific bid adjustments, new keywords to add, and negatives to block.",
    {
      campaignId: z.string().describe("The campaign ID"),
      adGroupId: z.string().optional().describe("Specific ad group ID (optional, analyzes all if omitted)"),
      targetCPA: z.string().optional().describe("Target CPA in account currency (e.g., '5.00')"),
    },
    ({ campaignId, adGroupId, targetCPA }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Optimize keywords for campaign ${campaignId}${adGroupId ? ` (ad group ${adGroupId})` : ""}.${targetCPA ? ` Target CPA: $${targetCPA}.` : ""}

Follow these steps:

1. **Pull keyword performance** using get_keyword_report (campaignId: ${campaignId}${adGroupId ? `, adGroupId: ${adGroupId}` : ""}, last 30 days, sorted by localSpend, limit 200).

2. **Pull search term data** using get_search_term_report (same params).

3. **Analyze and categorize keywords**:
   - **Pause candidates**: Keywords with spend > $5 and zero installs in 30 days, or CPA > ${targetCPA ? `${parseFloat(targetCPA) * 3}` : "3x account average"}
   - **Bid increase candidates**: Keywords with CPA < ${targetCPA ?? "account average"} AND impression share < 50% (check insights.impressionShare in raw data)
   - **Bid decrease candidates**: Keywords with CPA > ${targetCPA ?? "account average"} but still converting (don't pause, just lower bid)

4. **Analyze search terms**:
   - **New keyword candidates**: Search terms with installs > 0 and good CPA that aren't already targeting keywords (add as EXACT)
   - **Negative keyword candidates**: Search terms with spend > $2 and zero installs (block as negatives)
   - **Irrelevant terms**: Search terms that don't match the app's intent

5. **Generate action plan** with specific tool calls:
   - update_targeting_keywords calls with exact keywordIds and new bids/statuses
   - add_targeting_keywords calls with new keywords, match types, and suggested bids
   - add_negative_keywords calls with terms to block

Present as a numbered list of actions I can approve one by one.`,
          },
        },
      ],
    })
  );

  server.prompt(
    "new_campaign_setup",
    "Step-by-step guided workflow for creating a new Apple Search Ads campaign from scratch.",
    {
      adamId: z.string().describe("The app Adam ID"),
      countries: z.string().describe("Comma-separated country codes (e.g., 'US,GB,CA')"),
      dailyBudget: z.string().describe("Daily budget amount (e.g., '100.00')"),
      totalBudget: z.string().optional().describe("Total/lifetime budget (optional)"),
    },
    ({ adamId, countries, dailyBudget, totalBudget }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Set up a new Apple Search Ads campaign for app ${adamId} targeting ${countries}.

Follow these steps in order:

1. **Verify the app**: Use get_app_details (adamId: ${adamId}) to confirm the app name and details.

2. **Check eligibility**: Use get_app_eligibility (adamId: ${adamId}, countriesOrRegions: [${countries.split(",").map(c => `"${c.trim()}"`).join(", ")}]) to verify the app can run ads in target markets.

3. **Create the campaign**: Use create_campaign with:
   - adamId: ${adamId}
   - countriesOrRegions: [${countries.split(",").map(c => `"${c.trim()}"`).join(", ")}]
   - dailyBudgetAmount: "${dailyBudget}"
   ${totalBudget ? `- budgetAmount: "${totalBudget}" (only if this org supports a lifetime budget)` : "- Omit budgetAmount. Pay-as-you-go and many other orgs reject a lifetime budget with LIFETIME_BUDGET_NOT_SUPPORTED; dailyBudgetAmount alone is enough."}
   - status: PAUSED (we'll enable after setup is complete)

4. **Create an ad group**: Use create_ad_group with a reasonable default bid based on the app category (typically $0.50-$2.00 for most categories). Pass automatedKeywordsOptIn: true only when Search Match should be on.

5. **Suggest keywords**: Based on the app name and category, suggest 10-20 initial keywords:
   - 5-10 brand/exact terms (app name, developer name)
   - 5-10 category/discovery terms (BROAD match)
   - Suggest starting bids for each

6. **Ask for approval** before adding keywords and enabling the campaign.

Present each step with what you're doing and why, so I can learn and make adjustments.`,
          },
        },
      ],
    })
  );

  server.prompt(
    "budget_reallocation",
    "Analyze spend across all campaigns and recommend budget reallocations to maximize ROI.",
    {
      dateRange: z.enum(["LAST_7_DAYS", "LAST_14_DAYS", "LAST_30_DAYS", "LAST_90_DAYS"]).optional().describe("Date range (default LAST_30_DAYS)"),
    },
    ({ dateRange }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Analyze budget allocation across all my campaigns and recommend reallocations for the ${dateRange ?? "LAST_30_DAYS"} period.

Follow these steps:

1. **Get cross-campaign budget analysis** using get_budget_analysis (dateRange: "${dateRange ?? "LAST_30_DAYS"}").

2. **Identify reallocation opportunities**:
   - **Over-spending, under-performing**: Campaigns with high CPA relative to the account average that are consuming a large share of total spend. These should have budgets reduced.
   - **Under-spending, high-performing**: Campaigns with low CPA and strong conversion rates but hitting daily budget caps early. These deserve more budget.
   - **Inactive spend**: Campaigns with significant budget but very low impressions or taps — may indicate poor keyword targeting or paused ad groups consuming budget allocation.

3. **Propose specific budget changes**:
   - For each campaign that needs adjustment, show the current dailyBudgetAmount vs the proposed new value.
   - Ensure total daily spend across campaigns stays the same (budget-neutral reallocation) unless I indicate otherwise.
   - Generate the exact update_campaign tool calls with new dailyBudgetAmount values.

4. **Summarize the expected impact**: Estimate how CPA and install volume would change based on historical efficiency of each campaign.

Present each reallocation as a numbered action I can approve or reject individually.`,
          },
        },
      ],
    })
  );

  server.prompt(
    "creative_review",
    "Compare ad creative performance within a campaign — identify winners, losers, and rejected creatives with fix suggestions.",
    {
      campaignId: z.string().describe("The campaign ID to analyze"),
      dateRange: z.enum(["LAST_7_DAYS", "LAST_14_DAYS", "LAST_30_DAYS", "LAST_90_DAYS"]).optional().describe("Date range (default LAST_30_DAYS)"),
    },
    ({ campaignId, dateRange }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Review creative/ad performance for campaign ${campaignId} over the ${dateRange ?? "LAST_30_DAYS"} period.

Follow these steps:

1. **Pull ad-level performance** using get_ad_report (campaignId: ${campaignId}, dateRange: "${dateRange ?? "LAST_30_DAYS"}").

2. **Check for rejections** using find_ad_rejection_reasons (campaignId: ${campaignId}).

3. **Analyze creative performance**:
   - **Winning creatives**: Ads with the best tap-through rate (TTR) and conversion rate. These are your best performers — consider scaling them to more ad groups.
   - **Losing creatives**: Ads with significantly worse TTR or CPA than the campaign average. Consider pausing these.
   - **Statistical confidence**: Flag any ads with too few impressions to draw reliable conclusions.

4. **Handle rejected creatives**:
   - For each rejected ad, explain the likely rejection reason based on Apple's creative guidelines.
   - Suggest specific fixes to get the creative approved.

5. **Recommendations**:
   - Which ads to pause (with update_ad calls)
   - Which creative variations to test next based on what's working
   - Whether the campaign would benefit from more creative diversity

Present findings as a clear comparison table followed by actionable recommendations.`,
          },
        },
      ],
    })
  );

  server.prompt(
    "geo_expansion",
    "Analyze geographic performance and identify new markets to expand into based on CPA, volume, and app eligibility.",
    {
      campaignId: z.string().describe("The campaign ID to analyze"),
      dateRange: z.enum(["LAST_7_DAYS", "LAST_14_DAYS", "LAST_30_DAYS", "LAST_90_DAYS"]).optional().describe("Date range (default LAST_30_DAYS)"),
    },
    ({ campaignId, dateRange }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Analyze geographic performance for campaign ${campaignId} and recommend expansion opportunities for the ${dateRange ?? "LAST_30_DAYS"} period.

Follow these steps:

1. **Pull geo performance data** using get_geo_performance (campaignId: ${campaignId}, dateRange: "${dateRange ?? "LAST_30_DAYS"}").

2. **Get campaign details** using get_campaign_details (campaignId: ${campaignId}) to find the app's adamId and current countriesOrRegions.

3. **Rank current markets** by efficiency:
   - Best markets: Low CPA, high conversion rate, strong install volume
   - Worst markets: High CPA, low conversion rate, or negligible volume
   - For underperforming markets, recommend whether to reduce bids, pause, or remove them

4. **Identify expansion candidates**:
   - Based on the app's category and current top-performing regions, suggest promising new markets.
   - Use get_app_eligibility to verify the app can run ads in each suggested market.
   - Consider language/cultural similarity to current top markets.

5. **Recommend an expansion plan**:
   - Which new countries to add (with eligibility confirmed)
   - Suggested starting daily budgets per new market (based on CPA in similar existing markets)
   - Whether to create separate campaigns per region or add countries to existing campaigns
   - Generate specific create_campaign or update_campaign tool calls

Present the analysis as a ranked table of current markets, followed by expansion recommendations with specific actions.`,
          },
        },
      ],
    })
  );
}
