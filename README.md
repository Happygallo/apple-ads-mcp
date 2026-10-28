<p align="center">
  <h1 align="center">Apple Ads MCP</h1>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/apple-ads-mcp"><img src="https://img.shields.io/npm/v/apple-ads-mcp.svg" alt="npm version"></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-compatible-blue" alt="MCP compatible"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/apple-ads-mcp.svg" alt="License"></a>
</p>

<p align="center">
  MCP server for the <a href="https://developer.apple.com/documentation/apple_search_ads">Apple Search Ads API v5</a>.<br>
  Connect it to any MCP-compatible AI client and manage your campaigns, keywords, budgets, and reporting through natural language.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#tools">Tools</a> &bull;
  <a href="#resources">Resources</a> &bull;
  <a href="#prompts">Prompts</a> &bull;
  <a href="#clients">Clients</a>
</p>

---

**Ask your AI things like:**

> *"How did my campaigns perform last week?"*
> *"Pause the brand campaign and increase the budget on discovery to $500."*
> *"What search terms are triggering my ads? Add the best ones as exact-match keywords."*

Supports 54 tools, 3 resources, and 6 prompts — campaigns, ad groups, keywords, creatives, budgets, search terms, geo targeting, impression share, and performance reports.

### Features at a glance

| Feature | Description |
|---|---|
| **Campaign management** | Create, update, pause, and delete campaigns and ad groups |
| **Keyword optimization** | Add/remove targeting and negative keywords, update bids |
| **Performance reporting** | Campaign, ad group, keyword, ad, and geo reports with date presets |
| **Search term analysis** | See actual search queries triggering your ads |
| **Creative management** | Manage ads, creatives, and product pages |
| **Budget control** | Create and manage budget orders, analyze utilization |
| **Impression share** | Generate and retrieve impression share reports |
| **Multi-org support** | Switch between organizations at runtime |

---

## Quick Start

1. [Get your Apple credentials](#step-1--invite-an-api-user) (~10 min, one-time)
2. [Generate your key pair](#step-3--generate-your-key-pair) (2 commands)
3. [Add to your MCP client](#step-5--add-to-your-mcp-client)
4. Start chatting

---

## Setup

### Step 1 — Invite an API user

> Done by the **account admin** at [searchads.apple.com](https://searchads.apple.com).

1. Go to **Settings** → **User Management** → **Invite User**
2. Enter the email of the person who will use the API
3. Set the role:
   - **API Account Manager** — full read/write access
   - **API Account Read Only** — view-only access
4. Send the invitation

> The API user must be a **different Apple ID** from the admin. If you're the admin, use a second Apple ID.

### Step 2 — Accept and copy your credentials

> Done by the **invited user**.

1. Accept the email invitation and sign in to [searchads.apple.com](https://searchads.apple.com)
2. Go to **Settings** → **API** tab
3. Copy and save these three values:
   - **clientId** — starts with `SEARCHADS.`
   - **teamId** — starts with `SEARCHADS.`
   - **keyId** — a UUID

### Step 3 — Generate your key pair

Open Terminal and run:

```bash
openssl ecparam -genkey -name prime256v1 -noout -out ~/apple-ads-key.pem && \
openssl pkcs8 -topk8 -nocrypt -in ~/apple-ads-key.pem -out ~/apple-ads-key-pkcs8.pem
```

Then generate the public key:

```bash
openssl ec -in ~/apple-ads-key-pkcs8.pem -pubout -out ~/apple-ads-key-public.pem
```

This creates:
- **`~/apple-ads-key-pkcs8.pem`** — private key (keep this safe, used in your config)
- **`~/apple-ads-key-public.pem`** — public key (upload to Apple next)

### Step 4 — Upload public key to Apple

Print your public key:

```bash
cat ~/apple-ads-key-public.pem
```

Copy the entire output (including the `BEGIN` / `END` lines), then:

1. Go to **Settings** → **API** tab on [searchads.apple.com](https://searchads.apple.com)
2. Paste into the **Public Key** field
3. **Save**

### Step 5 — Add to your MCP client

Pick your client below and fill in your **clientId**, **teamId**, and **keyId** from Step 2, and the **full path** to your private key from Step 3.

> **Multiple orgs?** Omit `ASA_ORG_ID` and use `list_organizations` / `switch_organization` at runtime. Or set it in `env` to pick a default.

---

## Clients

<details>
<summary><strong>Claude Desktop</strong></summary>

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "apple-ads": {
      "command": "npx",
      "args": ["-y", "apple-ads-mcp"],
      "env": {
        "ASA_CLIENT_ID": "SEARCHADS.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "ASA_TEAM_ID": "SEARCHADS.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "ASA_KEY_ID": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "ASA_PRIVATE_KEY_PATH": "/Users/yourname/apple-ads-key-pkcs8.pem"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

</details>

<details>
<summary><strong>Claude Code</strong></summary>

```bash
claude mcp add apple-ads \
  -e ASA_CLIENT_ID=SEARCHADS.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \
  -e ASA_TEAM_ID=SEARCHADS.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \
  -e ASA_KEY_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \
  -e ASA_PRIVATE_KEY_PATH=/Users/yourname/apple-ads-key-pkcs8.pem \
  -- npx -y apple-ads-mcp
```

</details>

<details>
<summary><strong>Cursor</strong></summary>

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "apple-ads": {
      "command": "npx",
      "args": ["-y", "apple-ads-mcp"],
      "env": {
        "ASA_CLIENT_ID": "SEARCHADS.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "ASA_TEAM_ID": "SEARCHADS.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "ASA_KEY_ID": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "ASA_PRIVATE_KEY_PATH": "/Users/yourname/apple-ads-key-pkcs8.pem"
      }
    }
  }
}
```

</details>

<details>
<summary><strong>VS Code</strong></summary>

Add to your `settings.json`:

```json
{
  "mcp": {
    "servers": {
      "apple-ads": {
        "command": "npx",
        "args": ["-y", "apple-ads-mcp"],
        "env": {
          "ASA_CLIENT_ID": "SEARCHADS.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
          "ASA_TEAM_ID": "SEARCHADS.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
          "ASA_KEY_ID": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
          "ASA_PRIVATE_KEY_PATH": "/Users/yourname/apple-ads-key-pkcs8.pem"
        }
      }
    }
  }
}
```

</details>

<details>
<summary><strong>Windsurf</strong></summary>

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "apple-ads": {
      "command": "npx",
      "args": ["-y", "apple-ads-mcp"],
      "env": {
        "ASA_CLIENT_ID": "SEARCHADS.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "ASA_TEAM_ID": "SEARCHADS.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "ASA_KEY_ID": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "ASA_PRIVATE_KEY_PATH": "/Users/yourname/apple-ads-key-pkcs8.pem"
      }
    }
  }
}
```

</details>

<details>
<summary><strong>Other MCP clients</strong></summary>

This server uses **STDIO transport**. Any MCP-compatible client can connect by running:

```bash
npx -y apple-ads-mcp
```

Set these environment variables:

| Variable | Description |
|---|---|
| `ASA_CLIENT_ID` | Your client ID (starts with `SEARCHADS.`) |
| `ASA_TEAM_ID` | Your team ID (starts with `SEARCHADS.`) |
| `ASA_KEY_ID` | Your key ID (UUID) |
| `ASA_PRIVATE_KEY_PATH` | Absolute path to your PKCS#8 private key |
| `ASA_ORG_ID` | *(optional)* Organization ID to use by default |

</details>

<details>
<summary><strong>Inline key (no file)</strong></summary>

Replace `ASA_PRIVATE_KEY_PATH` with `ASA_PRIVATE_KEY` and paste the PEM content with `\n` for line breaks:

```json
"ASA_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----\nMIGH...your-key...\n-----END PRIVATE KEY-----"
```

</details>

---

## Tools

| Category | Count | What you can do |
|---|---|---|
| **Organizations** | 3 | List and switch between organizations. Get user details. |
| **Campaigns** | 6 | List, create, update, delete campaigns. Pull performance reports. |
| **Ad Groups** | 6 | Manage ad groups within campaigns. Get ad group reports. |
| **Keywords** | 11 | Add/remove targeting and negative keywords. Update bids. Keyword reports. |
| **Search Terms** | 1 | See the actual queries people searched before tapping your ad. |
| **Ads** | 7 | List, create, update, delete ads. Get ad reports and rejection reasons. |
| **Creatives** | 5 | Manage creatives and product pages. |
| **Budget Orders** | 4 | Create, update, list, and get budget order details. |
| **Apps & Geo** | 5 | Search for eligible apps, check eligibility, find assets, search geolocations. |
| **Geo Performance** | 1 | Performance breakdown by country/region. |
| **Impression Share** | 3 | Create, list, and retrieve custom impression share reports. |
| **Optimization** | 2 | Campaign snapshots and budget utilization analysis. |

### All 54 tools

| Category | Tools |
|---|---|
| **Organizations** | `list_organizations`, `switch_organization`, `get_me_details` |
| **Campaigns** | `list_campaigns`, `get_campaign_details`, `create_campaign`, `update_campaign`, `delete_campaign`, `get_campaign_report` |
| **Ad Groups** | `list_ad_groups`, `get_ad_group`, `create_ad_group`, `update_ad_group`, `delete_ad_group`, `get_adgroup_report` |
| **Keywords** | `get_keyword_report`, `list_targeting_keywords`, `get_targeting_keyword`, `add_targeting_keywords`, `update_targeting_keywords`, `delete_targeting_keywords`, `list_negative_keywords`, `get_negative_keyword`, `add_negative_keywords`, `update_negative_keywords`, `delete_negative_keywords` |
| **Search Terms** | `get_search_term_report` |
| **Ads** | `list_ads`, `get_ad`, `create_ad`, `update_ad`, `delete_ad`, `get_ad_report`, `find_ad_rejection_reasons` |
| **Creatives** | `list_creatives`, `get_creative`, `create_creative`, `list_product_pages`, `get_product_page_by_id` |
| **Budget Orders** | `list_budget_orders`, `get_budget_order`, `create_budget_order`, `update_budget_order` |
| **Apps & Geo** | `search_apps`, `get_app_details`, `get_app_eligibility`, `find_app_assets`, `search_geolocations` |
| **Geo Performance** | `get_geo_performance` |
| **Impression Share** | `create_impression_share_report`, `get_impression_share_report_by_id`, `list_impression_share_reports` |
| **Optimization** | `get_campaign_snapshot`, `get_budget_analysis` |

---

## Resources

The server exposes 3 resources:

| URI | Description |
|---|---|
| `apple-ads://countries` | Supported countries and regions for Apple Search Ads |
| `apple-ads://device-sizes` | App preview device sizes for creative assets |
| `apple-ads://metrics-glossary` | Definitions, formulas, and benchmarks for all reporting metrics (CPA, CPT, TTR, etc.) |

---

## Prompts

6 built-in workflow prompts to guide common tasks:

| Prompt | Description |
|---|---|
| `campaign_health_check` | Comprehensive campaign analysis — reviews spend, conversions, CPA trends, and flags issues |
| `keyword_optimization` | Keyword and search term optimization workflow — finds wasted spend and new opportunities |
| `new_campaign_setup` | Guided new campaign creation — walks through app selection, structure, keywords, and budgets |
| `budget_reallocation` | Cross-campaign budget analysis — identifies over/under-spending and proposes budget shifts |
| `creative_review` | Creative A/B review — compares ad performance, flags rejections, recommends winners |
| `geo_expansion` | Geographic expansion analysis — ranks current markets and identifies new ones to enter |

---

<details>
<summary><strong>Troubleshooting</strong></summary>

> **"pkcs8 must be PKCS#8 formatted string"**
> Your key is in the wrong format. Re-run the `openssl pkcs8` command from [Step 3](#step-3--generate-your-key-pair).

> **"No organization selected"**
> Use `list_organizations` then `switch_organization`, or add `ASA_ORG_ID` to your config.

> **"Token request failed (401)"**
> Verify your **clientId**, **teamId**, and **keyId** match Apple's API tab. Check that you uploaded your public key.

> **"Failed to read private key"**
> Use an absolute path (e.g. `/Users/yourname/...`), not `~/...`.

> **"LIFETIME_BUDGET_NOT_SUPPORTED"**
> This organization does not accept a campaign lifetime budget (`budgetAmount`). That is common on pay-as-you-go accounts. Call `create_campaign` with only `dailyBudgetAmount` — omit `budgetAmount`, or pass `""`, `"0"`, or `"none"`, so the field is not sent.

> **Ad group end time rejected**
> `create_ad_group` and `update_ad_group` take `endTime` as `YYYY-MM-DD` and send it as a full date-time (`YYYY-MM-DDT00:00:00.000`), which is what the Apple Search Ads API expects. Search Match is the optional boolean `automatedKeywordsOptIn` on create and update.

> **Server disconnects immediately**
> A required credential is missing. You need all four: `ASA_CLIENT_ID`, `ASA_TEAM_ID`, `ASA_KEY_ID`, and `ASA_PRIVATE_KEY_PATH`.

</details>

<details>
<summary><strong>Development</strong></summary>

```bash
git clone https://github.com/javiergalloroca/AppleAdsMCP.git
cd AppleAdsMCP
npm install
npm run build
npm start
```

For hot reload: `npm run dev`

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

</details>

## License

MIT
