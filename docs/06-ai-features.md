# AI Features

This document describes the AI and natural language processing capabilities built into the Family Expense App, covering intent parsing, insight generation, spending prediction, and the chat interface.

## Architecture Overview

The AI system follows a **local-first, rule-based** design. All natural language understanding and insight generation run entirely on the client with zero network calls by default. There is no dependency on external LLM APIs for core functionality.

The architecture is organized into three services:

| Service | File | Responsibility |
|---------|------|----------------|
| NLP | `src/services/nlp.ts` | Parse free-text into structured intents |
| AI | `src/services/ai.ts` | Route intents to handlers, generate insights |
| Prediction | `src/services/prediction.ts` | Forecast spending, detect anomalies |

An `AIProvider` interface exists in `ai.ts` to allow future addition of remote providers (for example, a Claude API provider). Currently only `LocalAIProvider` is implemented and returned by `AIProviderManager.getProvider()`.

```
AIProvider (interface)
  +-- LocalAIProvider   <-- active, rule-based
  +-- [future remote]   <-- placeholder for Claude API integration
```

## NLP Intent Parsing

The `parseIntent(input: string)` function in `nlp.ts` converts a user's natural language message into a `ParsedIntent` object. It returns one of six intent types:

### Intent Types

| Intent | Trigger Examples | Extracted Fields |
|--------|-----------------|------------------|
| `add` | "Add $50 for groceries at Wegmans", "Spent $20 on lunch", "Log $100 for utilities" | `amount`, `category`, `merchant`, `date`, `description` |
| `query` | "How much did I spend on food in 2023?", "Show me transportation expenses in March" | `category`, `period` |
| `compare` | "Compare 2023 vs 2024" | `period`, `period2` |
| `top` | "Top spending categories last year", "Biggest expenses", "Where did most money go?" | `period` |
| `summarize` | "Summarize 2024", "Summary for March" | `period` |
| `unknown` | Anything that does not match the above patterns | `raw` (original input only) |

### Pattern Matching Order

Patterns are evaluated in a fixed order. The first match wins:

1. **Add** -- three regex patterns covering "add", "spent", "log/record/enter" prefixes.
2. **Compare** -- a single regex requiring two four-digit years separated by "vs", "versus", "to", "and", or "with".
3. **Top** -- keyword tests for "top categories", "biggest expense", "where most money", "highest spending".
4. **Summarize** -- regex for "summarize ..." or "summary for/of ...".
5. **Query** -- six regex patterns covering "how much ... on ... in ...", "total ... spending", "show me ... expenses", etc.
6. **Generic query fallback** -- matches "how much ... spend" without a category, extracting only a period.
7. **Unknown** -- returned if nothing above matched.

## Category Alias Mapping

The `CATEGORY_ALIASES` lookup table maps everyday words to canonical category names stored in the database. This lets users type informal terms and still get accurate results.

```
grocery, groceries, food, dining, restaurant, eating, lunch, dinner, breakfast -> Food
gas, fuel, transport, uber, lyft, transit                                      -> Transportation
car, auto, vehicle                                                             -> Car
rent, mortgage, home, house                                                    -> Home
electric, water, utility, utilities, phone, internet                           -> Utilities
doctor, medical, health, medicine, pharmacy                                    -> Health & Life
school, education, tuition, class                                              -> Education
travel, trip, hotel, flight, vacation                                          -> Travel
gift, gifts, present                                                           -> Gifts
shopping, clothes, clothing                                                    -> Miscellaneous
entertainment, movie, concert                                                  -> Entertainment
india, remittance                                                              -> India
```

Resolution logic in `resolveCategory()`:

1. Exact match on the lowercased input.
2. Partial match -- if the input contains an alias, or an alias contains the input.
3. If no match, the original input text is passed through as the category.

## Period Resolution Logic

The `resolvePeriod()` function extracts a time period from free text and returns it in one of two formats:

- **Year** (`"2024"`) -- for annual queries.
- **Year-Month** (`"2024-03"`) -- for monthly queries.

Resolution steps (first match wins):

1. **Explicit year** -- regex `/\b(20\d{2})\b/` extracts a four-digit year starting with 20.
2. **Relative year** -- "last year" or "this year" resolved against `new Date()`.
3. **Relative month** -- "last month" or "this month" resolved against `new Date()`, returning `YYYY-MM`.
4. **Month name** -- "january", "jan", "march", etc. looked up in `MONTH_MAP`. If a year was also found in the text, that year is used; otherwise the current year is assumed.
5. **No match** -- returns `undefined`, which downstream handlers interpret as "all time".

## Local AI Provider: Insight Generation

`LocalAIProvider.generateInsights()` accepts category breakdown, monthly spending, and yearly spending arrays and produces an array of `Insight` objects. Each insight has a `type` (trend, comparison, anomaly, prediction) and a `severity` (info, warning, positive, negative).

### Insight Rules

| Rule | Minimum Data | Logic | Severity |
|------|-------------|-------|----------|
| Top spending category | 1+ categories | Reports the highest-spending category with its percentage of total spend. | `info` |
| Year-over-year change | 2+ years | Computes percentage change between the two most recent years. | `warning` if >20% increase, `positive` if >10% decrease, else `info` |
| Monthly anomaly detection | 6+ months | Computes z-score for each of the 3 most recent months against all months. Flags months where z > 2. | `warning` |
| Spending concentration | 3+ categories | Checks whether the top 3 categories account for more than 80% of total spending. | `info` |

### Z-Score Anomaly Detection

For monthly anomaly detection, the calculation is:

```
mean     = sum(all monthly totals) / count
stdDev   = sqrt( sum( (total - mean)^2 ) / count )
zScore_i = (total_i - mean) / stdDev
```

A month is flagged as anomalous when `zScore > 2.0` (roughly the top 2.3% under a normal distribution).

## Prediction Service

The prediction service (`src/services/prediction.ts`) provides spending forecasting and anomaly detection as standalone functions, independent of the AI provider.

### Annual Projection: Weighted Moving Average

`projectAnnualSpending(yearlyData, yearsToProject, growthRate)`

1. Filters to years with non-zero spending.
2. Takes up to the 5 most recent years (`RECENT_YEARS_WEIGHT = 5`).
3. Assigns linearly increasing weights: the most recent year gets weight 5, second-most-recent gets 4, and so on.
4. Computes a weighted average as the base amount.
5. Projects forward by applying compound growth: `base * (1 + growthRate)^i` for each future year.
6. Assigns confidence: `high` for year 1, `medium` for year 2, `low` for year 3+.

Default growth rate is 3% (`DEFAULT_GROWTH_RATE = 0.03`). The `calculateGrowthRate()` function can compute the actual historical average year-over-year growth rate from the last 5 years of data.

### Monthly Projection: Seasonal Decomposition

`projectMonthlySpending(monthlyData, targetYear, growthRate)`

1. Requires at least 12 months of historical data.
2. Groups monthly totals by calendar month (1-12).
3. For each calendar month, computes a weighted average favoring the 3 most recent occurrences.
4. Derives a **seasonal factor** for each month: `monthAvg / overallMonthlyAvg * 12`. A factor of 1.0 means average spending; >1.0 means above average for that month.
5. Finds the last complete year (10+ months of data) and applies compound growth to project the annual total.
6. Distributes the projected annual total across months using seasonal factors: `(projectedAnnual / 12) * factor`.
7. If actual data exists for a target month, it is included alongside the projection.

### Standalone Anomaly Detection

`detectAnomalies(monthlyData, threshold)`

Uses the same z-score approach as the insight generator but applies it across all months (not just the last 3). Requires 6+ months of data. Default threshold is 2.0 standard deviations. Returns an array of flagged months with their z-score and the population mean.

## Chat Interface Flow

The Assistant page (`src/pages/Assistant.tsx`) provides a conversational interface for querying and managing expenses. The end-to-end flow for a user message is:

```
User types message
       |
       v
Assistant.handleSend()
       |
       v
processUserMessage(input)          [ai.ts]
       |
       v
provider.parseIntent(input)        [nlp.ts -> parseIntent()]
       |
       v
switch on intent.type:
  query     -> handleQuery()       fetch monthly spending via api, format totals
  add       -> handleAdd()         call api.addTransaction(), confirm
  compare   -> handleCompare()     fetch two years in parallel, compute diff
  top       -> handleTop()         fetch category breakdown, rank top 5
  summarize -> handleSummarize()   fetch categories + monthly, compute summary stats
  unknown   -> return help text with example commands
       |
       v
Return ChatMessage { content, data?, chart? }
       |
       v
Assistant renders message bubble
  - Markdown-style bold via regex replacement
  - Optional inline chart (bar, pie, or line) via Recharts
```

### Chat Message Structure

Each `ChatMessage` contains:

- `id` -- unique identifier (UUID or timestamp).
- `role` -- "user" or "assistant".
- `content` -- text with simple markdown (bold via `**text**`).
- `data` (optional) -- structured data for chart rendering.
- `chart` (optional) -- chart type hint: `"bar"`, `"pie"`, or `"line"`.
- `timestamp` -- when the message was created.

### Chart Selection by Intent

| Intent | Chart Type | Data Shape |
|--------|-----------|------------|
| `query` | Bar | Monthly spending totals |
| `compare` | Line | Two arrays of monthly data, one per year |
| `top` | Pie | Top 5 category breakdowns |
| `summarize` | None | Text-only summary |
| `add` | None | Confirmation text |

### Suggestion Chips

On first load (when the conversation has only the welcome message), the UI displays clickable suggestion chips with example queries:

- "How much did I spend on groceries in 2023?"
- "Compare 2023 vs 2024"
- "Top spending categories last year"
- "Summarize 2024"
- "Add $50 for groceries at Wegmans"

Clicking a chip sends it as a message, demonstrating the system's capabilities.
