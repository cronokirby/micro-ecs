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

    constructor(private _query: QueryI<M, K>) {

    }

    /**
     * Add a filter function to this query.
     * 
     * This function will run for every entity with the right keys,
     * and the query will only continue with those entities for which
     * this function returned true.
     * 
     * @param filter the filter function
     */
    filter(filter: QueryFilter<M, K>): Query<M, K> {
        return new Query({ ...this._query, filter });
    }

    /**
     * Add a function that should be run for every selected entity.
     * 
     * This function will be called on every selected entity.
     * This can be used to modify components if they are reference types,
     * but cannot be used to add or remove components, or to delete entities.
     * To do those operations @link { map } should be used instead.
     * 
     * @param foreach the function to run for every entity
     */
    forEach(foreach: QueryRun<M, K>): Query<M, K> {
        return new Query({ ...this._query, foreach });
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
    map(map: QueryMap<M, K>): Query<M, K> {
        return new Query({ ...this._query, map });
    }

    build(): QueryI<M, K> {
        return this._query;
    }
}

/**
 * This class exists to aid type inference.
 * 
 * The main way to use this class is by doing:
 * ```ts
 * query<Type>().select('key1', 'key2');
 * ```
 * This class allows us to provide just the first type parameter, the Model,
 * to a Query without having to provide the keys we're selecting on,
 * which would be redundant.
 * 
 * Instances of this class are safe to be cached, and in fact should be.
 * Ideally, next to the declaration of your model type, you'd also have
 * a `const baseQuery = query<Model>()` declaration.
 */
export class QueryBuilder<M> {
    /**
     * This creates a new query that will only match entities with the given keys.
     * 
     * @param keys the subset of keys to select from the model.
     */
    select<K extends keyof M>(...keys: K[]): Query<M, K> {
        return new Query({ keys });
    }
}

/**
 * Start a query for a given model.
 * 
 * This is just an alias for the constructor of `QueryBuilder`.
 */
export function query<M>(): QueryBuilder<M> {
    return new QueryBuilder<M>();
}


function isEmptyObject(obj: any): boolean {
    return Object.keys(obj).length === 0;
}


/**
 * Represents a repository for all the entities that exist.
 * 
 * A world allows us to add entities, and then query them.
 */
export class World<M> {
    private _entities: (Partial<M> | undefined)[] = [];
    private _free: number[] = [];

    /**
     * Add new entities to the world.
     * 
     * Note that the order of entities is undefined, and should not
     * be depended on.
     * 
     * @param entities the entities to add to the world.
     */
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

    /**
     * Get all entities in this World.
     * 
     * This is mainly useful as a debugging tool.
     */
    allEntities(): Partial<M>[] {
        // This is fine since we're filtering out all the undefined entities
        return this._entities.filter(Boolean) as Partial<M>[];
    }

    /**
     * Run a given query on the entities in this World.
     * 
     * For more information about how this works, see the `Query` type itself.
     * 
     * Note that the order of entities is not defined, and should not be
     * depended on.
     * 
     * @param q the query to run over the world.
     */
    run<K extends keyof M>(q: Query<M, K>) {
        const { keys, filter, foreach, map } = q.build();
        const hasAllKeys = (e: Partial<M>) => {
            for (const key of keys) {
                if (e[key] === undefined) return false;
            }
            return true;
        };
        for (let i = 0; i < this._entities.length; ++i) {
            const ent = this._entities[i];
            if (!ent) continue;

            if (!hasAllKeys(ent)) continue;
            // This is safe since we will fill all of the keys
            const picked = {} as Pick<M, K>;
            for (const key of keys) {
                // This is safe since we filtered out the entities that
                // have all the keys we need
                picked[key] = ent[key] as M[K];
            }

            if (filter && !filter(picked)) continue;

            if (foreach) foreach(picked);

            if (!map) continue;
            const diff = map(picked);
            if (!diff) {
                this.removeAt(i);
                continue;
            }
            this.adjustAt(i, diff);
        }
    }

    private removeAt(index: number) {
        this._entities[index] = undefined;
        this._free.push(index);
    }

    private adjustAt(index: number, diff: Partial<M>) {
        // This should have already been checked before calling this function
        const entity = this._entities[index] as Partial<M>;
        for (const key in diff) {
            if (diff[key]) {
                entity[key] = diff[key];
            } else {
                delete entity[key];
                if (isEmptyObject(entity)) {
                    this.removeAt(index);
                }
            }
        }
    }
}
