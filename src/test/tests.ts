import test from "ava";
import * as ets from "../lib/explainTS";

test("makeComputed:computedFunction:simple", async t => {
    const ef: ets.ComputedFunction<number, string, {a: number; b: number}>
            = ets.makeComputed("test", (s: {a: number; b: number}) => s.a + s.b);

    t.is(ef.value({a: 0.3, b: -1}), -0.7, `${t.title} => value`);

    const expl: ets.Explained<number, string>
              = ef.explain({a: 1, b: 2});
    t.deepEqual(expl, {value: 3, reason: "test", method: "function"}, `${t.title} => explain`);
});

test("makeComputed:computedCompound:complex", async t => {
    const base: ets.ComputedValue<number, string>
              = ets.makeComputed("base salary", 2000, "fixed");
    const complete: ets.ComputedCompound<number, string, number, number, string>
                  = ets.makeComputed("current salary", "sum", 0, "sum", [
                        base,
                        ets.makeComputed("current bonus", "mult", 1, "mult", [
                            base,
                            ets.makeComputed("yearly bonus (5%)", 0.05, "fixed"),
                            ets.makeComputed("years of work", years => years, "input"),
                        ]),
                    ]);

    t.is(complete.value(-1.5), 1850, `${t.title} => value`);

    const expl: ets.ExplainedCompound<number, string, number, string>
              = complete.explain(19);

    t.deepEqual(expl,
                {
                    value: 3900,
                    reason: "current salary",
                    method: "sum",
                    sources: [
                        {
                            value: 2000,
                            reason: "base salary",
                            method: "fixed",
                        },
                        {
                            value: 1900,
                            reason: "current bonus",
                            method: "mult",
                            sources: [
                                {
                                    value: 2000,
                                    reason: "base salary",
                                    method: "fixed",
                                },
                                {
                                    value: 0.05,
                                    reason: "yearly bonus (5%)",
                                    method: "fixed",
                                },
                                {
                                    value: 19,
                                    reason: "years of work",
                                    method: "input",
                                },
                            ],
                        } as ets.ExplainedCompound<number, string, number, string>,
                    ],
                },
                `${t.title} => explain`);
});
