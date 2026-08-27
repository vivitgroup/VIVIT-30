export type CreativityInventionModule={name:string;principle:string;checks:string[];outputs:string[]};
const M=(name:string,principle:string,checks:string[],outputs:string[]):CreativityInventionModule=>({name,principle,checks,outputs});
export const VIVITO_CREATIVITY_INVENTION_MODULES:CreativityInventionModule[]=[
M("Problem Reframing","Generate alternative formulations before solving the first framing.",["What if the stated problem is a symptom?"],["reframed problems"]),
M("Constraint Inversion","Use constraints as design material instead of only obstacles.",["Can the limitation become an advantage?"],["constraint-led concepts"]),
M("First-Principles Decomposition","Strip inherited assumptions and rebuild from fundamental requirements.",["What must be true?","What is merely convention?"],["first-principles map"]),
M("Analogy Transfer","Borrow mechanisms from distant domains, not surface aesthetics only.",["What system solves a structurally similar problem?"],["analogy candidates"]),
M("Morphological Exploration","Systematically combine dimensions of a solution space.",["Which dimensions can vary independently?"],["morphological matrix"]),
M("SCAMPER Plus","Substitute, combine, adapt, modify, repurpose, eliminate and reverse with business constraints.",["Which transformation creates value?"],["variant set"]),
M("Diverge Then Converge","Separate idea generation from evaluation to avoid premature narrowing.",["Are we judging too early?"],["wide set","shortlist"]),
M("Novelty vs Usefulness","Creativity requires both distinctiveness and decision-relevant value.",["Is it new?","Is it useful?"],["novelty-utility score"]),
M("Mechanism Novelty","Prefer new mechanisms or combinations over cosmetic novelty.",["What actually works differently?"],["mechanism statement"]),
M("Creative Tension","Combine two desirable but seemingly conflicting goals.",["How can both be true?"],["tension-resolving concepts"]),
M("Extreme User","Design for edge cases to reveal hidden opportunities for the mainstream.",["What does the extreme case need?"],["edge insight"]),
M("Subtraction","Ask what can be removed while improving the outcome.",["What is non-essential?"],["simplified concept"]),
M("Reversal","Invert sequence, ownership, channel or incentive to expose alternatives.",["What if we do the opposite?"],["reversal concepts"]),
M("Temporal Shift","Move value earlier, later, continuously or on-demand.",["When should value occur?"],["timing innovation"]),
M("Business Model Innovation","Explore who pays, when, for what unit and under what risk-sharing model.",["Can value capture change?"],["business model options"]),
M("Channel Innovation","Use channel capabilities to create a different product or experience, not only distribution.",["What can this channel uniquely enable?"],["channel-native concept"]),
M("Data Product Thinking","Turn repeated decisions and signals into reusable intelligence products.",["What recurring uncertainty can data reduce?"],["data-product concept"]),
M("Service Blueprint Innovation","Redesign frontstage, backstage, handoffs and failure recovery together.",["Where does the experience break operationally?"],["service blueprint"]),
M("Experience Sequencing","Engineer the beginning, peak, recovery and ending of an experience.",["Which moment will be remembered?"],["experience arc"]),
M("Behavioral Design","Use friction, defaults, salience and commitment ethically to help desired action.",["Is influence transparent and reversible?"],["behavioral mechanism"]),
M("Idea Stress Test","Attack desirability, feasibility, viability, defensibility and ethics before promotion.",["Why will this fail?"],["stress-test result"]),
M("Prototype Small","Test the cheapest artifact that can answer the riskiest assumption.",["What is the minimum valid test?"],["prototype plan"]),
M("Concept Portfolio","Maintain safe, adjacent and breakthrough bets rather than one creative direction.",["Is the portfolio diversified?"],["concept portfolio"]),
M("Creative Combination","Combine complementary weak ideas into a stronger system.",["Which pieces reinforce each other?"],["hybrid concept"]),
M("Aesthetic-System Separation","Do not confuse visual style innovation with underlying strategic innovation.",["Is the novelty visual or structural?"],["novelty type"]),
M("Naming & Framing","Names should clarify value and memory without hiding weak economics.",["Does the frame make the idea easier to understand?"],["name/frame options"]),
M("Defensibility","Ask what makes an invention difficult to copy: data, workflow, brand, network, distribution or switching cost.",["What compounds over time?"],["moat hypothesis"]),
M("Second-Order Creativity","Evaluate what the idea changes in behavior, operations and competition after adoption.",["What new problem does success create?"],["second-order map"]),
M("Creative Evidence Loop","Use experiments and market response to evolve concepts rather than defending authorship.",["What evidence changes the concept?"],["iteration rule"]),
M("Invention Decision","Promote ideas that are novel enough, useful, testable, ethical and strategically coherent.",["Which idea deserves the next unit of learning budget?"],["selected invention","test plan"])
];
export const VIVITO_CREATIVITY_INVENTION_ENGINE_DOCTRINE=`
Creativity & Invention Engine doctrine:
1. Reframe before solving; the first problem statement is rarely sacred.
2. Separate divergence from convergence so evaluation does not kill exploration early.
3. Seek mechanism novelty and useful combinations, not decorative difference alone.
4. Use constraints, analogies, reversals, subtraction and first principles to expand the search space.
5. Balance novelty with usefulness, feasibility, viability, ethics and strategic fit.
6. Build portfolios of incremental, adjacent and breakthrough ideas.
7. Prototype the riskiest assumption with the cheapest valid test.
8. Treat market evidence as feedback on the idea, not a threat to authorship.
9. Look for defensibility and second-order consequences before scaling.
10. Creative intelligence is disciplined exploration followed by evidence-based selection.
`;
export const VIVITO_TRAINING_BATCH_29_CONTEXT=[VIVITO_CREATIVITY_INVENTION_ENGINE_DOCTRINE,...VIVITO_CREATIVITY_INVENTION_MODULES.map((m,i)=>`## INVENT ${String(i+1).padStart(2,"0")} — ${m.name}\nPrinciple: ${m.principle}\nChecks:\n${m.checks.map(q=>`- ${q}`).join("\n")}\nOutputs: ${m.outputs.join(", ")}`)].join("\n\n");