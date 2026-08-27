export type VivitoNegotiationModule={name:string;principle:string;questions:string[];outputs:string[]};
const N=(name:string,principle:string,questions:string[],outputs:string[]):VivitoNegotiationModule=>({name,principle,questions,outputs});

export const VIVITO_NEGOTIATION_GAME_THEORY_MODULES:VivitoNegotiationModule[]=[
N("BATNA","Power starts with the best realistic alternative to agreement.",["What happens if no deal is reached?","How can our alternative be improved before negotiating?"],["BATNA","BATNA improvement plan"]),
N("Reservation Value","Know the boundary beyond which agreement destroys value.",["What is our walk-away point?","What assumptions determine it?"],["reservation value","walk-away rule"]),
N("ZOPA","Estimate the zone of possible agreement without assuming one exists.",["What might their reservation value be?","What evidence supports that estimate?"],["ZOPA estimate","uncertainty range"]),
N("Interests vs Positions","Negotiate underlying interests rather than only stated positions.",["What problem is each side actually trying to solve?","Which positions are proxies for deeper needs?"],["interest map"]),
N("Anchoring","Use evidence-backed anchors and resist arbitrary anchors by returning to fundamentals.",["What reference point is defensible?","What data justifies it?"],["anchor rationale"]),
N("Concession Strategy","Concessions should be deliberate, conditional and increasingly costly.",["What can we give cheaply that they value highly?","What do we require in return?"],["concession ladder"]),
N("Issue Trading","Trade across issues with different relative values to create value.",["Which issues matter more to us than them and vice versa?"],["trade matrix"]),
N("Information Asymmetry","Do not reveal sensitive information unnecessarily; seek diagnostic information ethically.",["What do we know that they may not?","What do we need to learn?"],["information plan"]),
N("Signaling","Actions can credibly communicate type, intent or constraints when they are costly to fake.",["Which signal would actually be credible?","Could it be misread?"],["signal analysis"]),
N("Credible Commitment","Commitments matter only when incentives or mechanisms make them believable.",["What makes the promise enforceable or self-binding?"],["commitment mechanism"]),
N("Repeated Games","Protect long-term cooperation when parties will interact again.",["Is this one-shot or repeated?","How does today’s move affect future trust and retaliation?"],["relationship strategy"]),
N("Reciprocity Strategy","Reward cooperation and respond proportionately to defection without uncontrolled escalation.",["What response preserves cooperation while protecting against exploitation?"],["response rule"]),
N("Prisoner’s Dilemma","Identify situations where individually rational defection destroys joint value.",["Can transparency, repetition or verification make cooperation stable?"],["cooperation mechanism"]),
N("Coordination Game","Sometimes the problem is choosing the same standard, timing or focal point rather than competing.",["What focal point can align both sides?"],["coordination proposal"]),
N("Chicken & Brinkmanship","Avoid reckless escalation when both sides are incentivized to appear unwilling to yield.",["What off-ramp preserves face?","What is the catastrophic downside?"],["de-escalation path"]),
N("Principal-Agent","Detect when an agent’s incentives differ from the principal’s objective.",["Who decides?","Who bears cost?","Who captures reward?"],["incentive-risk map"]),
N("Moral Hazard","When protection from downside changes behavior, redesign monitoring or incentives.",["Who can take risk without bearing the consequence?"],["moral-hazard control"]),
N("Adverse Selection","Before agreement, hidden quality differences can attract the wrong counterparties.",["What information can screen quality before commitment?"],["screening mechanism"]),
N("Mechanism Design","Design rules so truthful, value-creating behavior is easier than gaming.",["What behavior does this rule incentivize?","How could a smart participant game it?"],["mechanism review"]),
N("Auctions & Competitive Bids","Choose bid rules based on value, uncertainty and winner’s-curse risk.",["Is value common or private?","How uncertain is true value?"],["bid discipline"]),
N("Winner’s Curse","Winning can be bad when victory means we were the most optimistic estimator.",["Are we winning because we know more or because we overestimated?"],["winner's-curse check"]),
N("Coalitions","Map who can cooperate, block or influence the outcome.",["Which stakeholders can form a winning coalition?","Whose support is pivotal?"],["coalition map"]),
N("Power & Dependency","Power comes from alternatives, time, information, legitimacy and dependency—not aggression.",["Who depends on whom more?","What source of leverage is legitimate?"],["leverage map"]),
N("Time Pressure","Deadlines change bargaining power; distinguish real deadlines from pressure tactics.",["Whose deadline is real?","What happens if time expires?"],["deadline analysis"]),
N("Face Saving","Give counterparts a path to move without unnecessary humiliation.",["How can they accept while preserving legitimacy with their stakeholders?"],["face-saving option"]),
N("Multi-Party Negotiation","Sequence conversations and manage veto points when more than two parties matter.",["Who has veto power?","Who should be aligned first?"],["stakeholder sequence"]),
N("Competitive Response","Model how rivals may respond to pricing, channel, offer or market-entry moves.",["If we do X, what is their best response?","What is our response to that?"],["response tree"]),
N("Commitment vs Flexibility","Commit when credibility creates value; preserve flexibility when uncertainty dominates.",["Does commitment deter harmful moves or create costly lock-in?"],["commit/flex decision"]),
N("Negotiation Ethics","No deception about material facts, fake alternatives, fabricated deadlines or coercive threats.",["Is every material representation true?","Can the other party make an informed choice?"],["ethics check"]),
N("Post-Deal Governance","A good contract also manages what happens after agreement.",["How are performance, disputes, change requests and exits handled?"],["governance terms"])
];

export const VIVITO_NEGOTIATION_GAME_THEORY_DOCTRINE=`
Advanced Negotiation & Game Theory doctrine:
1. Prepare BATNA, reservation value, interests, issues, evidence and authority before bargaining.
2. Do not confuse aggression with leverage. Leverage comes from credible alternatives, information, timing and dependency.
3. Seek value creation through issue trades before value claiming through price alone.
4. Use evidence-backed anchors; reject arbitrary anchors by returning to economics and alternatives.
5. Never give an unreciprocated concession by default. Make concessions conditional and track the exchange.
6. Model the other side's incentives and best response, then model our response to that response.
7. In repeated relationships, include trust, reputation and future cooperation in the payoff—not just the current transaction.
8. Design incentives and governance to reduce principal-agent problems, moral hazard and gaming after agreement.
9. Identify winner's-curse risk whenever competition rewards the most optimistic estimate.
10. Preserve face-saving off-ramps in conflict; avoid escalation that creates catastrophic mutual loss.
11. Record uncertainty around the counterparty's BATNA and reservation value rather than pretending to know them.
12. Never fabricate alternatives, deadlines, proof, authority or material facts. Ethical constraints override tactical advantage.
13. Escalate legal, binding, high-value or outside-authority commitments to the accountable human owner.
14. Judge a deal by expected enterprise value and execution feasibility, not by whether we 'won' the negotiation.
`;

export const VIVITO_TRAINING_BATCH_25_CONTEXT=[VIVITO_NEGOTIATION_GAME_THEORY_DOCTRINE,...VIVITO_NEGOTIATION_GAME_THEORY_MODULES.map((m,i)=>`## NEGOTIATION ${String(i+1).padStart(2,"0")} — ${m.name}\nPrinciple: ${m.principle}\nQuestions:\n${m.questions.map(q=>`- ${q}`).join("\n")}\nOutputs: ${m.outputs.join(", ")}`)].join("\n\n");
