# VIVITO Free-Tier Intelligence Certification

The strict 100-case intelligence benchmark can run without paid API billing.

- Target remains exactly 100 provider-backed benchmark cases.
- Pass threshold remains exactly 100/100.
- Each CI attempt runs at most 5 previously-uncompleted cases.
- Successful cases are persisted in `.vivito/benchmark-checkpoint.json` through GitHub Actions cache.
- Re-running the failed certification job restores the latest checkpoint for the same exact code SHA and continues from the next pending case.
- Transient provider failures (429/quota/high-demand/timeouts) are deferred and are not scored as wrong answers.
- A certification cannot pass until `completedCases === 100`, `remainingCases === 0`, overall score is 100%, and every intelligence dimension is 100%.
- The benchmark critic is disabled for strict free-tier certification so each case uses one primary provider call instead of two.
- A code SHA change starts a fresh checkpoint scope, so results from an older implementation cannot certify newer code.
- Re-running the same failed job increments `github.run_attempt` while keeping the same SHA; the workflow restores the most recent cache for that SHA and saves a new immutable checkpoint key.
- Production/Main and Vercel are not involved in this certification workflow.
