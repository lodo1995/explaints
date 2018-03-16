
function functionOrValue<T>(what: T | (() => T)): T
{
    return typeof what === "function" ? what() : what;
}

function apply3<A1, A2, A3, R,
                F extends (arg1: A1, arg2: A2, arg3: A3) => R = (arg1: A1, arg2: A2, arg3: A3) => R>(func: F, arg3: A3)
{
    return (arg1: A1, arg2: A2) => func(arg1, arg2, arg3);
}

export abstract class Computed<T, R, S>
{
    public abstract value(situation: S): T;
    public constructor(protected readonly method: string,
                       public readonly reason: R) {}
    public explain(situation: S): Explained<T, R>
    {
        return {value: this.value(situation), method: this.method, reason: this.reason};
    }
}
export interface Explained<T, R>
{
    value: T;
    method: string;
    reason: R;
}

export class ComputedCompound<T, R, S, XT, XR> extends Computed<T, R, S>
{
    public constructor(reason: R, private readonly func: (source: Array<CompoundEntry<XT, XR>>, situation: S) => T,
                       method = "compound", protected sources: Array<Computed<XT, XR, S>> = [])
    {
        super(method, reason);
    }
    public value(situation: S)
    {
        const subs = this.sources.map(source => ({value: source.value(situation), reason: source.reason}));
        return this.func(subs, situation);
    }
    public explain(situation: S): ExplainedCompound<T, R, XT, XR>
    {
        const subs = this.sources.map(source => source.explain(situation));
        return {value: this.func(subs, situation), method: this.method, reason: this.reason, sources: subs};
    }
    public add(source: Computed<XT, XR, S>)
    {
        this.sources.push(source);
    }
    public get(reason: XR | ((reason: XR) => boolean), def?: Computed<XT, XR, S> | (() => Computed<XT, XR, S>))
    {
        let source = typeof reason === "function"
                   ? this.sources.find(src => reason(src.reason))
                   : this.sources.find(src => src.reason === reason);
        if (!source && def)
        {
            source = functionOrValue(def);
            this.sources.push(source);
        }
        return source;
    }
}
export interface ExplainedCompound<T, R, XT, XR> extends Explained<T, R>
{
    sources: Array<Explained<XT, XR>>;
}
export interface CompoundEntry<T, R>
{
    value: T;
    reason: R;
}

// tslint:disable-next-line:no-any
export class ComputedValue<T, R> extends Computed<T, R, any>
{
    public constructor(reason: R, private readonly val: T, method = "simple")
    {
        super(method, reason);
    }
    public value()
    {
        return this.val;
    }
}
export class ComputedFunction<T, R, S> extends Computed<T, R, S>
{
    public constructor(reason: R, private readonly func: (situation: S) => T, method = "function")
    {
        super(method, reason);
    }
    public value(situation: S)
    {
        return this.func(situation);
    }
}

export class ComputedReduction<T, R, S, XT, XR> extends ComputedCompound<T, R, S, XT, XR>
{
    public constructor(reason: R, reducer: (partial: T, source: CompoundEntry<XT, XR>, situation: S) => T,
                       initial: T, method = "reducer", sources: Array<Computed<XT, XR, S>> = [])
    {
        const red = (situation: S) => apply3<T, CompoundEntry<XT, XR>, S, T>(reducer, situation);
        super(reason, (source, situation) => source.reduce(red(situation), initial), method, sources);
    }
}

export function makeComputed<T, R, S>(reason: R, func: (situation: S) => T, method?: string): ComputedFunction<T, R, S>;
export function makeComputed<T, R, S, XT, XR>(reason: R,
                                              func: (source: Array<CompoundEntry<XT, XR>>, situation: S) => T,
                                              method?: string, sources?: Array<Computed<XT, XR, S>>):
                                              ComputedCompound<T, R, S, XT, XR>;
export function makeComputed<T, R, S, XT, XR>(reason: R,
                                              func: (partial: T, source: CompoundEntry<XT, XR>, situation: S) => T,
                                              def: T, method?: string, sources?: Array<Computed<XT, XR, S>>):
                                              ComputedReduction<T, R, S, XT, XR>;
export function makeComputed<T, R, S, XR>(reason: R, preset: "first" | "last", def: T | (() => T),
                                          method?: string, sources?: Array<Computed<T, XR, S>>):
                                          ComputedCompound<T, R, S, T, XR>;
export function makeComputed<R, S, XR>(reason: R, preset: "max" | "min" | "avg" | "mult" | "sum",
                                       def?: number | (() => number), method?: string,
                                       sources?: Array<Computed<number, XR, S>>):
                                       ComputedCompound<number, R, S, number, XR>;
export function makeComputed<T, R>(reason: R, value: T, method?: string): ComputedValue<T, R>;
export function makeComputed<T, R, S, XT, XR>(
            reason: R,
            valueFuncPreset: T
                           | ((situation: S) => T)
                           | ((source: Array<CompoundEntry<XT, XR>>, situation: S) => T)
                           | ((partial: T, source: CompoundEntry<XT, XR>, situation: S) => T)
                           | "first" | "last" | "max" | "min" | "avg" | "mult" | "sum",
            methodDef?: string
                      | T | (() => T)
                      | number | (() => number),
            methodSources?: string
                          | Array<Computed<XT, XR, S>>
                          | Array<Computed<T, XR, S>>
                          | Array<Computed<number, XR, S>>,
            sources?: Array<Computed<XT, XR, S>>
                    | Array<Computed<T, XR, S>>
                    | Array<Computed<number, XR, S>>,
    ): Computed<T, R, S> | Computed<number, R, S>
{
    if (typeof valueFuncPreset === "function")
    {
        const func = valueFuncPreset;
        if (func.length === 0 || (func.length === 1 && arguments.length < 4))
            return new ComputedFunction(reason,
                                        func as (situation: S) => T, methodDef as string);
        else if (func.length === 1 || (func.length === 2 && arguments.length < 5))
            return new ComputedCompound(reason,
                                        func as (source: Array<CompoundEntry<XT, XR>>, situation: S) => T,
                                        methodDef as string,
                                        methodSources as Array<Computed<XT, XR, S>>);
        else
            return new ComputedReduction(reason,
                                         func as (partial: T, source: CompoundEntry<XT, XR>, situation: S) => T,
                                         methodDef as T,
                                         methodSources as string,
                                         sources as Array<Computed<XT, XR, S>>);
    }
    switch (valueFuncPreset)
    {
        case "first":
        {
            const def = methodDef as T | (() => T);
            return new ComputedCompound(reason,
                                        (source, _) => source.length ? source[0].value : functionOrValue(def),
                                        methodSources as string || "first",
                                        sources as Array<Computed<T, XR, S>>);
        }
        case "last":
        {
            const def = methodDef as T | (() => T);
            return new ComputedCompound(reason,
                                        (source, _) => source.length ? source[source.length - 1].value
                                                                     : functionOrValue(def),
                                        methodSources as string || "last",
                                        sources as Array<Computed<T, XR, S>>);
        }
        case "max":
        {
            const def = (methodDef as number | (() => number)) || 0;
            return new ComputedCompound(reason,
                                        (source, _) => source.length
                                                    ? source.slice(1).reduce(
                                                        (prev, entry) => Math.max(prev, entry.value), source[0].value)
                                                    : functionOrValue(def),
                                        methodSources as string || "max",
                                        sources as Array<Computed<number, XR, S>>);
        }
        case "min":
        {
            const def = (methodDef as number | (() => number)) || 0;
            return new ComputedCompound(reason,
                                        (source, _) => source.length
                                                    ? source.slice(1).reduce(
                                                        (prev, entry) => Math.min(prev, entry.value), source[0].value)
                                                    : functionOrValue(def),
                                        methodSources as string || "min",
                                        sources as Array<Computed<number, XR, S>>);
        }
        case "avg":
        {
            const def = (methodDef as number | (() => number)) || 0;
            return new ComputedCompound(reason,
                                        (source, _) => source.length
                                                    ? source.reduce((t, entry) => t + entry.value, 0) / source.length
                                                    : functionOrValue(def),
                                        methodSources as string || "avg",
                                        sources as Array<Computed<number, XR, S>>);
        }
        case "mult":
        {
            const def = (methodDef as number | (() => number)) || 0;
            return new ComputedCompound(reason,
                                        (source, _) => source.length
                                                    ? source.reduce((tot, entry) => tot * entry.value, 1)
                                                    : functionOrValue(def),
                                        methodSources as string || "mult",
                                        sources as Array<Computed<number, XR, S>>);
        }
        case "sum":
        {
            const def = (methodDef as number | (() => number)) || 0;
            return new ComputedCompound(reason,
                                        (source, _) => source.length
                                                    ? source.reduce((tot, entry) => tot + entry.value, 0)
                                                    : functionOrValue(def),
                                        methodSources as string || "sum",
                                        sources as Array<Computed<number, XR, S>>);
        }
        default:
            return new ComputedValue(reason, valueFuncPreset as T, methodDef as string);
    }
}
