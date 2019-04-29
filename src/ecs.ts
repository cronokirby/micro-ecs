class World<Model> {
    private _entities: Partial<Model>[] = [];

    addEntity(entity: Partial<Model>) {
        this._entities.push(entity);
    }

    allEntities(): Partial<Model>[] {
        return this._entities.slice(0);
    }

    filter<K extends keyof Model>(...keys: K[]): Pick<Model, K>[] {
        const hasAllKeys = (e: Partial<Model>) => {
            for (const key of keys) {
                if (!e[key]) return false;
            }
            return true;
        };
        return this._entities.filter(hasAllKeys).map(e => {
            // This cast is safe since all the keys will be filled
            const obj= {} as Pick<Model, K>;
            for (const key of keys) {
                // This cast is safe since we know the key exists
                // because we filtered before.
                obj[key] = e[key] as Model[K];
            }
            return obj;
        });
    }
}
