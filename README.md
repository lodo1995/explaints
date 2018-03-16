[![Build Status](https://travis-ci.org/lodo1995/explaints.svg?branch=master)](https://travis-ci.org/lodo1995/explaints)
[![codecov](https://codecov.io/gh/lodo1995/explaints/branch/master/graph/badge.svg)](https://codecov.io/gh/lodo1995/explaints)
![npm](https://img.shields.io/npm/v/explaints.svg)

# ExplainTS: <small> self-explaining computed values </small>

## Motivation

Imagine the salary of your employees starts at 2000$ and every year it grows by 5% of this original amount.
You have an API that allows your employees to check what their income will be after a certain number of years.

Your API could simply work like this:
```ts
> getExpectedIncome({years: 19})
  3900
```

But, if the rules to compute that value become complex, involving many different parameters, it could be better to
return not only the value, but also the way it was computed:

```ts
> getExpectedIncome({years: 19})
  {
       value: 3900,
       reason: "expected salary",
       method: "sum",
       sources: [
           {
               value: 2000,
               reason: "base salary",
               method: "fixed",
           },
           {
               value: 1900,
               reason: "expected bonus",
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
           },
       ],
   }
```

This brings several advantages:
- **transparency**: all values that affect the final result are clearly visible, allowing the client to understand how
                    a result was obtain and to re-execute all the steps to guarantee correctness
- **reactivity**: parameters may be referenced in more computation trees; updating a parameter will automatically
                  affect all values that are directly or indirectly computed from it
- **efficiency**: the tree of values can be created, once and for all, at startup; after that, it can be reused and
                  patched as needed; changes to the parameters are applied to the computed values lazily, i.e. only
                  when the values are requested again

## Example

```ts
import * as ets from "explaints";

interface Parameters
{
    years_of_work: number;
}

const baseSalary = ets.makeComputed("base salary", 2000, "fixed");

const expectedSalary = ets.makeComputed("expected salary", "sum", 0, "sum", [
                           base,
                           ets.makeComputed("expected bonus", "mult", 1, "mult", [
                               base,
                               ets.makeComputed("yearly bonus (5%)", 0.05, "fixed"),
                               ets.makeComputed("years of work", (params: Parameters) => params.years_of_work, "input"),
                           ]),
                       ]);

function getExpectedIncome(params: Parameters)
{
    return expectedSalary.explain(params);
}
```
