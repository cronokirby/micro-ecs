export type QueryFilter<M, K extends keyof M> = (entity: Pick<M, K>) => boolean;
export type QueryRun<M, K extends keyof M> = (entity: Pick<M, K>) => void;
export type QueryMap<M, K extends keyof M> = (entity: Pick<M, K>) => Partial<M> | undefined;

interface QueryI<M, K extends keyof M> {
    keys: K[],
    filter?: QueryFilter<M, K>,
    foreach?: QueryRun<M, K>
    map?: QueryMap<M, K>
}

/**
 * Represents a query operation on a given Model.
 * 
 * The main way to create a Query is via the @link {query} function.
 * 
 * A Query is parameterised on a given Model, and a subset of that Model's
 * keys. When run on a given World, the Query will find all entities
 * with all the keys present, optionally filter out those entities
 * using a function. Then will run the `forEach` function for each of these
 * entities, as well as use the `map` function provided to modify
 * the entities.
 * 
 * Here's an example of a query that runs a function for every adult entity.
 * ```ts
 * const baseQuery = query<Person>();
 * baseQuery.select('age').filter({age} => age >= 18).forEach(console.log);
 * ```
 */
export class Query<M, K extends keyof M> {
    private _keys: K[];
    private _filter?: QueryFilter<M, K>;
    private _foreach?: QueryRun<M, K>;
    private _map?: QueryMap<M, K>;

    constructor(...keys: K[]) {
        this._keys = keys;
    }

    /**
     * Add a filter function to this query.
     * 
     * This function will run for every entity with the right keys,
     * and the query will only continue with those entities for which
     * this function returned true.
     * 
     * @param f the filter function
     */
    filter(f: QueryFilter<M, K>): Query<M, K> {
        this._filter = f;
        return this;
    }

    /**
     * Add a function that should be run for every selected entity.
     * 
     * This function will be called on every selected entity.
     * This can be used to modify components if they are reference types,
     * but cannot be used to add or remove components, or to delete entities.
     * To do those operations @link { map } should be used instead.
     * 
     * @param f the function to run for every entity
     */
    forEach(f: QueryRun<M, K>): Query<M, K> {
        this._foreach = f;
        return this;
    }

    /**
     * Add a function used to modify each selected entity.
     * 
     * The function takes in a subset of the Model with the right keys
     * fully present, and returns a diff of sorts. For each key present
     * in the diff, if that key is defined, then `entity[key] = diff[key]`.
     * If the key is explicitly undefined, e.g. `{age: undefined}`
     * then the key is removed completely from the entity. If the diff
     * is explicitly `undefined` then the entity is completely removed.
     * 
     * @param f the diff function for every entity.
     */
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


function isEmptyObject(obj: any): boolean {
    return Object.keys(obj).length === 0;
}


export class World<M> {
    private _entities: Partial<M>[] = [];
    private _free: number[] = [];

    add(...entities: Partial<M>[]) {
        for (const ent of entities) {
            const i = this._free.pop();
            if (i) {
                this._entities[i] = ent;
            } else {
                this._entities.push(ent);
            }
        }
    }

    allEntities(): Partial<M>[] {
        return this._entities.slice(0);
    }

    private adjustAt(index: number, diff: Partial<M>) {
        const entity = this._entities[index];
        for (const key in diff) {
            if (diff[key]) {
                entity[key] = diff[key];
            } else {
                delete entity[key];
                if (isEmptyObject(entity)) {
                    this._free.push(index);
                }
            }
        }
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
            const ent = this._entities[i];

            if (!hasAllKeys(ent)) continue;
            const picked = {} as Pick<M, K>;
            for (const key of keys) {
                picked[key] = ent[key] as M[K];
            }

            if (filter && !filter(picked)) continue;

            if (foreach) foreach(picked);

            if (!map) continue;
            const diff = map(picked);
            if (!diff) {
                this._free.push(i);
                continue;
            }
            this.adjustAt(i, diff);
        }
    }
}
