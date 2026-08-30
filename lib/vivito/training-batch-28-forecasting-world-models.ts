export type ForecastWorldModelModule={name:string;principle:string;checks:string[];outputs:string[]};
const M=(name:string,principle:string,checks:string[],outputs:string[]):ForecastWorldModelModule=>({name,principle,checks,outputs});
export const VIVITO_FORECAST_WORLD_MODULES:ForecastWorldModelModule[]=[
M("Reference Class Forecasting","Start from comparable historical cases before narrative adjustment.",["What is the closest reference class?"],["outside-view forecast"]),
M("Inside vs Outside View","Blend local specifics with base-rate evidence rather than choosing one blindly.",["What is unique here?","What is not unique?"],["blended forecast"]),
M("Probability Calibration","Express uncertain outcomes as probabilities that can be scored later.",["What probability is assigned?"],["probability"]),
M("Prediction Intervals","Give ranges, not false precision, for uncertain quantities.",["What interval captures plausible outcomes?"],["forecast interval"]),
M("Scenario Tree","Branch futures by decision-relevant uncertainties and triggers.",["What event changes the path?"],["scenario tree"]),
M("Driver Model","Link outcomes to a small set of measurable leading drivers.",["Which inputs move the result most?"],["driver equation"]),
M("Leading Indicators","Separate leading, coincident and lagging signals.",["Which metric gives earliest useful warning?"],["indicator map"]),
M("Trend Decomposition","Separate level, trend, seasonality, event shocks and noise.",["What component explains movement?"],["decomposition"]),
M("Change-Point Detection","Do not extrapolate through structural breaks without re-estimating.",["Did the regime change?"],["change-point alert"]),
M("Forecast Horizon Discipline","Use different models and confidence for days, weeks, quarters and years.",["What horizon is being forecast?"],["horizon-specific confidence"]),
M("Decay of Confidence","Confidence should fall as horizon and structural uncertainty increase.",["How fast does uncertainty expand?"],["confidence decay"]),
M("Event Risk","Represent discrete shocks separately from ordinary variance.",["Which low-frequency event matters?"],["event-risk register"]),
M("Conditional Forecasts","State forecasts as conditional on assumptions and policy choices.",["What must remain true?"],["conditional forecast"]),
M("Decision-Dependent Forecasts","Model how our own action changes the future distribution.",["How does the decision alter outcomes?"],["policy forecast"]),
M("Competitor Response","Forecast adaptive reactions rather than treating competitors as static.",["How could rivals respond?"],["response scenarios"]),
M("Customer Adaptation","Customers learn, habituate and change behavior over repeated exposure.",["Will behavior persist?"],["adaptation risk"]),
M("Capacity Constraints","Growth forecasts must respect people, inventory, fulfillment and service capacity.",["Where is the bottleneck?"],["capacity-adjusted forecast"]),
M("Cash Constraints","A profitable path can still fail if cash timing breaks.",["What is peak cash need?"],["cash runway forecast"]),
M("Feedback Loops","Model reinforcing and balancing loops that create non-linear behavior.",["What feeds back into itself?"],["feedback map"]),
M("Threshold Effects","Some outcomes change sharply after a threshold rather than smoothly.",["Which threshold matters?"],["threshold model"]),
M("S-Curves","Adoption and saturation often follow non-linear diffusion patterns.",["Where are we on the adoption curve?"],["diffusion stage"]),
M("Cohort Forecasting","Project cohorts separately when retention or conversion differs by acquisition period.",["Which cohorts behave differently?"],["cohort forecast"]),
M("Monte Carlo Thinking","Use distributions for uncertain inputs instead of one-point assumptions when stakes justify it.",["Which inputs need distributions?"],["simulation summary"]),
M("Sensitivity Ranking","Rank assumptions by impact on output uncertainty.",["Which assumption dominates variance?"],["sensitivity ranking"]),
M("Forecast Reconciliation","Ensure channel, client and company forecasts add up coherently.",["Do bottom-up and top-down totals reconcile?"],["reconciled forecast"]),
M("Forecast Error Tracking","Track bias, MAE/MAPE-like error and calibration by horizon.",["Where are forecasts systematically wrong?"],["error dashboard"]),
M("Model Ensemble","Combine diverse reasonable models when no single model dominates reliably.",["Do models fail differently?"],["ensemble forecast"]),
M("Unknown Unknown Buffer","Reserve contingency for risks not represented explicitly.",["What margin is prudent?"],["contingency"]),
M("Forecast Update Cadence","Refresh when new evidence has enough information value, not just on a calendar.",["What event triggers reforecast?"],["reforecast rule"]),
M("World Model Audit","Check that the internal model matches observed reality and retire broken assumptions.",["Which assumption has gone stale?"],["world-model revision"])
];
export const VIVITO_FORECASTING_WORLD_MODELS_DOCTRINE=`
Forecasting & World Models doctrine:
1. Start with reference classes and base rates, then adjust for case-specific evidence.
2. Forecast distributions, ranges and probabilities rather than false precision.
3. Make forecasts conditional on explicit assumptions, decisions and time horizons.
4. Track leading drivers, structural breaks, seasonality, feedback loops and thresholds.
5. Model adaptive competitors, customers, capacity and cash constraints.
6. Confidence decays with horizon and structural uncertainty.
7. Use scenario trees, sensitivity analysis and simulation when uncertainty is decision-critical.
8. Reconcile top-down and bottom-up forecasts and record forecast errors over time.
9. Update forecasts when informative evidence arrives, not merely because the calendar changed.
10. Maintain an auditable world model: assumptions that repeatedly fail must be revised or retired.
`;
export const VIVITO_TRAINING_BATCH_28_CONTEXT=[VIVITO_FORECASTING_WORLD_MODELS_DOCTRINE,...VIVITO_FORECAST_WORLD_MODULES.map((m,i)=>`## FORECAST ${String(i+1).padStart(2,"0")} — ${m.name}\nPrinciple: ${m.principle}\nChecks:\n${m.checks.map(q=>`- ${q}`).join("\n")}\nOutputs: ${m.outputs.join(", ")}`)].join("\n\n");