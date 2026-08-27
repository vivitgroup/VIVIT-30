export type VivitoEconomicsModule={domain:string;mission:string;rules:string[];outputs:string[]};
const E=(domain:string,mission:string,rules:string[],outputs:string[]):VivitoEconomicsModule=>({domain,mission,rules,outputs});

export const VIVITO_BUSINESS_ECONOMICS_CAPITAL_ALLOCATION:VivitoEconomicsModule[]=[
E("Revenue Quality","Separate revenue from value creation",["Do not equate revenue growth with economic improvement.","Inspect gross margin, contribution margin, cash timing and retention behind revenue."],["revenue bridge","quality judgment"]),
E("Gross Margin","Measure product/service economics",["Gross margin = revenue minus direct cost of goods or delivery.","Use consistent cost classification across periods and cohorts."],["gross margin","margin trend"]),
E("Contribution Margin","Know what acquisition can afford",["Contribution margin should include variable costs that scale with the sale.","Do not scale a channel that produces negative contribution economics without an explicit strategic reason."],["contribution margin","scaling verdict"]),
E("CAC","Measure customer acquisition cost correctly",["Define whether CAC is paid-media, blended or fully loaded before comparing it.","Use new customers, not orders, unless the metric is explicitly cost per order."],["CAC definition","CAC"]),
E("LTV","Estimate lifetime value conservatively",["Base LTV on margin and retention, not revenue alone.","Prefer observed cohorts over speculative long-horizon assumptions."],["LTV","assumption range"]),
E("Payback","Protect cash",["Calculate how long contribution profit takes to recover acquisition spend.","A good LTV with an unaffordable payback period can still break cash flow."],["payback period","cash risk"]),
E("Breakeven ROAS","Translate margin into media guardrails",["Compute breakeven from contribution economics, not an arbitrary target.","Use post-refund/post-discount economics where relevant."],["breakeven ROAS","guardrail"]),
E("Marginal ROAS","Judge the next pound, not the average",["Scaling decisions should focus on marginal returns as spend increases.","High blended ROAS can hide weak incremental spend."],["marginal return","scale curve"]),
E("Diminishing Returns","Expect efficiency to change with scale",["Model response curves instead of assuming constant CPA or ROAS.","Identify the spend zone where marginal return drops below the hurdle rate."],["response curve","max efficient spend"]),
E("Incrementality","Separate attribution from causality",["Platform-attributed revenue is not automatically incremental revenue.","Use experiments, holdouts or triangulation where decision value justifies it."],["incrementality confidence","test plan"]),
E("Cohort Economics","Compare customers fairly",["Measure CAC, retention, margin and LTV by acquisition cohort/channel when mix differs.","Do not let aggregate averages hide deteriorating new cohorts."],["cohort table","quality trend"]),
E("Retention Economics","Value retention investment",["Quantify how retention changes LTV, payback and acquisition capacity.","Compare retention spend against the cost of replacing churned customers."],["retention ROI","investment case"]),
E("Working Capital","Respect timing of cash",["Model receivables, inventory, payables and settlement delays.","Profitability does not guarantee liquidity."],["cash conversion view","liquidity risk"]),
E("Cash Constraints","Allocate within survival limits",["Set minimum cash/runway guardrails before maximizing growth.","Do not spend theoretical LTV before the business can finance the payback period."],["cash guardrail","affordable growth"]),
E("Expected Value","Compare uncertain investments",["Expected value must combine outcome magnitude and probability, then be adjusted for downside and constraints.","Do not ignore tail risk when it threatens survival."],["EV table","risk-adjusted EV"]),
E("Opportunity Cost","Price every allocation",["State what alternative use of capital is being displaced.","Choose based on marginal expected value, not sunk cost or departmental ownership."],["opportunity-cost table","allocation rationale"]),
E("Hurdle Rate","Define minimum acceptable return",["Use a hurdle rate reflecting capital scarcity, risk and strategic objectives.","Raise evidence requirements for large, irreversible investments."],["hurdle rate","pass/fail"]),
E("Portfolio Allocation","Distribute budget across opportunities",["Allocate across acquisition, retention, creative, product, sales and hiring based on marginal risk-adjusted return.","Diversify when concentration risk outweighs incremental efficiency."],["capital portfolio","allocation percentages"]),
E("Concentration Risk","Avoid single-point dependency",["Measure dependence on one client, channel, platform, product or market.","Value resilience even when the highest-return option is concentrated."],["concentration map","risk limit"]),
E("Stop-Loss","Know when to stop funding",["Define evidence-based stop-loss, review and scale triggers before deployment.","Do not keep funding a thesis solely because of sunk cost."],["stop-loss rule","review trigger"]),
E("Scale Conditions","Earn the right to scale",["Scale when unit economics, capacity, measurement and cash guardrails remain healthy at the margin.","If scaling breaks operations or customer quality, include that cost in economics."],["scale checklist","scale/no-scale"]),
E("Scenario Economics","Stress financial assumptions",["Model base, downside and upside for CAC, conversion, margin, retention and cash timing.","Identify the variable with the greatest sensitivity to enterprise value or runway."],["scenario P&L","sensitivity"]),
E("Capital Allocation Council","Choose the best use of scarce capital",["Compare projects on marginal return, confidence, strategic option value, cash burden, reversibility and risk.","Return capital or preserve cash when no opportunity clears the hurdle rate."],["capital ranking","executive allocation"]),
E("Integrated Unit Economics","Make growth economically coherent",["Connect traffic → conversion → CAC → contribution margin → retention → LTV → payback → cash → marginal return.","A recommendation is incomplete if it optimizes media efficiency while destroying contribution profit or liquidity."],["unit-economics model","economic recommendation"])
];

export const VIVITO_BUSINESS_ECONOMICS_CAPITAL_ALLOCATION_DOCTRINE=`
Business Economics & Capital Allocation doctrine:
1. Revenue is not profit and attributed ROAS is not economic value.
2. Use gross margin and contribution margin to define acquisition capacity.
3. Measure CAC, margin-based LTV and payback with explicit definitions.
4. Judge scaling by marginal, not average, returns.
5. Expect diminishing returns and identify maximum efficient spend.
6. Distinguish incrementality from attribution.
7. Use cohorts to expose mix shifts and customer-quality changes.
8. Profitability and liquidity are different; protect cash and working capital.
9. Every allocation has opportunity cost and a hurdle rate.
10. Allocate capital across channels and functions by marginal risk-adjusted value.
11. Define concentration limits, stop-loss rules and scale conditions before spending.
12. Integrate unit economics with operational capacity, retention and cash flow.
`;

export const VIVITO_TRAINING_BATCH_21_CONTEXT=VIVITO_BUSINESS_ECONOMICS_CAPITAL_ALLOCATION.map((m,i)=>`## BECA ${String(i+1).padStart(2,"0")} — ${m.domain}: ${m.mission}\n${m.rules.map(x=>`- ${x}`).join("\n")}\nOutputs: ${m.outputs.join(", ")}`).join("\n\n");