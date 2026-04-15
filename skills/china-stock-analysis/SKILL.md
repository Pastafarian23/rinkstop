---
name: china-stock-analysis
description: Analyze Chinese stock prices (A-shares, HK stocks) for informational purposes. Use when the user asks about Chinese companies - provide data, news, and metrics ONLY. NO buy/hold/sell recommendations - just factual information. Output MUST be in English.
---

# Stock Analysis (English Output Only)

Analyze stock prices for informational purposes only. NO investment recommendations.

**IMPORTANT:** ALL output must be in English. No Chinese characters or pinyin labels.

## Supported Markets

| Market | Code Format | Example |
|--------|-------------|---------|
| A-shares (Shanghai) | XXXXXX.SH | 600519.SH (Moutai) |
| A-shares (Shenzhen) | XXXXXX.SZ | 000001.SZ (Ping An) |
| Hong Kong | XXXX.HK | 0700.HK (Tencent) |
| US ADR | TICKER | BYDDF, BABA |

## Analysis Workflow

1. **Get current price data** via AlphaVantage API
   - Use GLOBAL_QUOTE function
   - Capture: price, open, high, low, volume, change, change %

2. **Gather additional context** (if available)
   - Recent news affecting the stock
   - Industry trends
   - Market sentiment

3. **Present analysis in structured format**:

```
## [Stock Name] ([Ticker])

### Key Data
| Metric | Value | Change |
|--------|-------|--------|
| Price | XXX | +XX |
| Change | XX% | [emoji] |
| High | XXX | - |
| Low | XXX | - |
| Volume | XXX | - |
| Open | XXX | - |
| Prev Close | XXX | - |

### Technical Analysis
- Short-term trend: ...
- Key support/resistance: ...
- Moving average status: ...

### Latest News
- News headline 1
- News headline 2

### Disclaimer
This information is for reference only and does not constitute investment advice. Investing carries risks.
```

## Important Notes

- Output MUST be in English only
- Provide ONLY factual information: price, volume, news, metrics
- NEVER recommend buy/hold/sell - just present data
- Always include disclaimer that information is for reference only

## Common Chinese Stocks Reference

See [references/china-stocks.md](references/china-stocks.md) for popular Chinese stock codes.