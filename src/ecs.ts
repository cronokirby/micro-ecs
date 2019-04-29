export type QueryFilter<M, K extends keyof M> = (entity: Pick<M, K>) => boolean;
export type QueryRun<M, K extends keyof M> = (entity: Pick<M, K>) => void;
export type QueryMap<M, K extends keyof M> = (entity: Pick<M, K>) => Partial<M>;

interface QueryI<M, K extends keyof M> {
    keys: K[],
    filter?: QueryFilter<M, K>,
    foreach?: QueryRun<M, K>
    map?: QueryMap<M, K>
}

export class Query<M, K extends keyof M> {
    private _keys: K[];
    private _filter?: QueryFilter<M, K>;
    private _foreach?: QueryRun<M, K>;
    private _map?: QueryMap<M, K>;

    constructor(...keys: K[]) {
        this._keys = keys;
    }

    filter(f: QueryFilter<M, K>): Query<M, K> {
        this._filter = f;
        return this;
    }

    forEach(f: QueryRun<M, K>): Query<M, K> {
        this._foreach = f;
        return this;
    }

    map(f: QueryMap<M, K>): Query<M, K> {
        this._map = f;
        return this;
    }

    build(): QueryI<M, K> {
        return {
            keys: this._keys,
            filter: this._filter,
            foreach: this._foreach,
            map: this._map
        };
    }
}

export class QueryBuilder<M> {
    select<K extends keyof M>(...keys: K[]): Query<M, K> {
        return new Query(...keys);
    }
}

export function query<M>(): QueryBuilder<M> {
    return new QueryBuilder<M>();
}


export class World<M> {
    private _entities: Partial<M>[] = [];

    add(...entities: Partial<M>[]) {
        this._entities.push(...entities);
    }

    allEntities(): Partial<M>[] {
        return this._entities.slice(0);
    }

    run<K extends keyof M>(q: Query<M, K>) {
        const { keys, filter, foreach, map } = q.build();
        const hasAllKeys = (e: Partial<M>) => {
            for (const key of keys) {
                if (!e[key]) return false;
            }
            return true;
        };
        for (let i = 0; i < this._entities.length; ++i) {
            const e = this._entities[i];
            if (!hasAllKeys(e)) continue;
            const picked = {} as Pick<M, K>;
            for (const key of keys) {
                picked[key] = e[key] as M[K];
            }
            if (filter && !filter(picked)) continue;
            if (foreach) foreach(picked);
            if (map) {
                const mapped = map(picked);
                for (const key in mapped) {
                    if (mapped[key]) {
                        this._entities[i][key] = mapped[key];
                    } else {
                        delete this._entities[i][key];
                    }
                }
            }
        }
    }
}
