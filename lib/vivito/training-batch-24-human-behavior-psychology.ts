export type VivitoBehaviorModule={name:string;principle:string;diagnostics:string[];application:string[]};
const H=(name:string,principle:string,diagnostics:string[],application:string[]):VivitoBehaviorModule=>({name,principle,diagnostics,application});

export const VIVITO_HUMAN_BEHAVIOR_MODULES:VivitoBehaviorModule[]=[
H("Motivation","Behavior depends on motive, ability and prompt; weak conversion is not automatically weak desire.",["What does the person want?","Can they act easily now?","What prompts action?"],["motivation map","friction reduction"]),
H("Jobs to Be Done","Understand the progress a customer is hiring the product or service to make.",["What situation triggers search?","What progress is desired?","What alternatives are hired today?"],["job statement","switching forces"]),
H("Loss Aversion","Losses often feel larger than equivalent gains; frame real downside truthfully without fear manipulation.",["What legitimate loss is the customer avoiding?","Is the framing factual?"],["ethical loss frame"]),
H("Reference Points","People judge value relative to expectations, anchors and alternatives.",["What reference price or outcome exists?","Who set that reference point?"],["reference-point analysis"]),
H("Social Proof","Relevant peer evidence can reduce uncertainty; popularity claims require real evidence.",["Which peer group matters?","Is proof recent and verifiable?"],["proof plan"]),
H("Authority & Trust","Expertise works only when credibility, relevance and incentives are clear.",["Why should this source be trusted?","What conflict of interest exists?"],["trust architecture"]),
H("Friction","Small cognitive, procedural or emotional costs can suppress action.",["How many steps?","What is confusing?","What creates anxiety?"],["friction audit"]),
H("Choice Architecture","Too many poorly structured options increase decision cost.",["Are choices comparable?","Can defaults or tiers clarify without trapping users?"],["choice simplification"]),
H("Default Effect","Defaults influence behavior; use them only when aligned with user interest and easy to change.",["What happens if the person does nothing?","Is the default transparent and reversible?"],["default review"]),
H("Scarcity","Real scarcity can clarify urgency; manufactured scarcity is prohibited.",["Is scarcity objectively true?","Can it be evidenced?"],["scarcity integrity check"]),
H("Commitment & Consistency","Small voluntary commitments can support follow-through but must not exploit sunk cost.",["What commitment has the person freely made?","Can they reconsider easily?"],["commitment path"]),
H("Reciprocity","Value given first can build goodwill; it must not create hidden obligation.",["What useful value can be given with no coercive strings?"],["value-first action"]),
H("Identity","Choices often express identity, status or group membership.",["Who does the customer want to become or be seen as?","Is that identity aspiration authentic?"],["identity hypothesis"]),
H("Status & Signaling","People consider what choices communicate to others.",["What signal does the decision send?","To which audience?"],["signal map"]),
H("Present Bias","Immediate costs can outweigh future benefits in felt value.",["Can benefit be made visible sooner?","Can setup effort be reduced?"],["time-friction plan"]),
H("Peak-End Effect","Experiences are disproportionately remembered by intense moments and endings.",["Where are the emotional peaks?","How does the journey end?"],["experience redesign"]),
H("Availability Bias","Recent or vivid events can distort perceived probability.",["Are we overweighting one vivid anecdote?","What base-rate data exists?"],["bias correction"]),
H("Confirmation Bias","Teams seek evidence supporting preferred stories.",["What evidence would disconfirm our belief?","Who is tasked to find it?"],["disconfirmation test"]),
H("Sunk Cost","Past spend should not justify future spend when expected value is poor.",["Would we choose this today if prior spend were zero?"],["continue/stop decision"]),
H("Endowment Effect","Ownership can increase perceived value.",["Does trial, customization or saved work create legitimate ownership value?"],["ownership experience"]),
H("Ambiguity Aversion","Unclear outcomes or terms can suppress action.",["Which terms, risks or steps are uncertain to the customer?"],["clarity plan"]),
H("Cognitive Load","Complexity reduces comprehension and execution quality.",["What must be remembered simultaneously?","Can information be chunked or sequenced?"],["load reduction"]),
H("Emotion & Reason","Emotion sets salience while reasoning often validates; decisions need both relevance and evidence.",["What emotion is present?","What proof supports the claim?"],["emotion-proof balance"]),
H("Trust Repair","After failure, acknowledge reality, explain cause, repair harm and show preventive control.",["What expectation was broken?","What concrete repair restores trust?"],["trust-repair sequence"]),
H("Customer Anxiety","Conversion can fail because of perceived risk rather than price.",["What could go wrong in the customer’s mind?","Which guarantee, proof or process reduces legitimate risk?"],["anxiety map"]),
H("Team Incentives","People optimize what they are rewarded for, sometimes against enterprise goals.",["What behavior does the metric reward?","What gaming behavior could emerge?"],["incentive alignment"]),
H("Psychological Safety","Teams surface problems earlier when disagreement and error reporting are safe.",["Can someone challenge the plan without penalty?","Are bad-news channels explicit?"],["safety intervention"]),
H("Stakeholder Empathy","Model each stakeholder’s goals, fears, constraints and incentives before communication.",["What does this stakeholder win, lose or fear?"],["stakeholder map"]),
H("Habit Loop","Repeated behavior depends on cue, routine and reward plus environmental design.",["What cue starts behavior?","What reward sustains it?"],["habit loop"]),
H("Ethical Persuasion","Persuasion must preserve informed choice, truthfulness and easy refusal.",["Is the claim true?","Is material information omitted?","Can the person freely say no?"],["ethical persuasion check"])
];

export const VIVITO_HUMAN_BEHAVIOR_PSYCHOLOGY_DOCTRINE=`
Human Behavior & Psychology doctrine:
1. Diagnose behavior before optimizing messaging: motive, ability, friction, uncertainty, social context and timing all matter.
2. Never use deception, fabricated proof, manufactured scarcity, hidden defaults, coercion or exploitation of vulnerable users.
3. Separate customer insight from stereotype. Use observed evidence and segment-specific context.
4. Treat objections as information about risk, trust, value, timing or fit—not as resistance to overpower.
5. Use behavioral principles to make good choices easier to understand and execute, not to remove informed choice.
6. Audit cognitive bias in both customers and internal teams; apply disconfirmation and base-rate checks to our own beliefs.
7. Align incentives so local metrics do not create harmful enterprise behavior or Goodhart effects.
8. Build trust through truthful claims, transparent evidence, predictable delivery and repair after mistakes.
9. Adapt communication to stakeholder motives and constraints while keeping facts unchanged.
10. Measure behavior with actual outcomes, not only stated preference or engagement proxies.
11. Preserve dignity, autonomy, privacy and easy opt-out in every behavioral intervention.
12. When psychology suggests a tactic that conflicts with user welfare, trust or policy, reject the tactic.
`;

export const VIVITO_TRAINING_BATCH_24_CONTEXT=[VIVITO_HUMAN_BEHAVIOR_PSYCHOLOGY_DOCTRINE,...VIVITO_HUMAN_BEHAVIOR_MODULES.map((m,i)=>`## BEHAVIOR ${String(i+1).padStart(2,"0")} — ${m.name}\nPrinciple: ${m.principle}\nDiagnostics:\n${m.diagnostics.map(q=>`- ${q}`).join("\n")}\nApplication: ${m.application.join(", ")}`)].join("\n\n");
