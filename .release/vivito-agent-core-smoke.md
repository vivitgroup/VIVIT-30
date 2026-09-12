# Authenticated Smoke Sequence

Run on the exact preview commit after Vercel reports READY:

1. `هاي`
2. `حلل TNG`
3. `طب ليه؟`
4. `طب أعمل إيه؟`
5. `اعمل تاسك لأسماء بأول نقطة`

Expected behavior:
- Follow-ups remain anchored to TNG instead of resetting to generic ERP output.
- VIVITO asks only for genuinely missing execution fields.
- No task is created until the existing action authorization/confirmation path allows it.
- Role scope remains enforced by backend authorization.

This smoke is a merge gate, not a production-side test.
