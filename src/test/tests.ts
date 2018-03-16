import test from "ava";
import * as ets from "../lib/explainTS";

test("makeComputed:computedFunction:2", async t => {
    const ef: ets.ComputedFunction<number, string, {a: number; b: number}>
            = ets.makeComputed("test", (s: {a: number; b: number}) => s.a + s.b);

    t.is(ef.value({a: 0.3, b: -1}), -0.7);

    const expl: ets.Explained<number, string>
              = ef.explain({a: 1, b: 2});
    t.deepEqual(expl, {value: 3, reason: "test", method: "function"}, `${t.title} => explain`);
});
