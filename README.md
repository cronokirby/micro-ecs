# micro-ecs
A small ECS framework that works best with TypeScript.

I made this for a game I'm making.

## Testing
The unit tests for the project can be run with `npm run test`.

## Example Usages
First, let's set up the world and Model we'll be using:

```ts
interface Model {
    name: string,
    age: number
}

const world = new World<Model>();
const baseQuery = query<Model>();
```

### Adding entities
```ts
world.addEntities(
    {name: 'john'},
    {age: 10},
    {name: 'both', age: 20}
);
```

### Selecting all entities with certain keys
```ts
const nameAndAge = baseQuery.select('name', 'age').forEach(console.log);
world.run(nameAndAge);
```

### Selecting on certain keys and then filtering
```ts
const namedAdults = baseQuery
    .select('name', 'age')
    .filter(x => x.age >= 18)
    .forEach(console.log);
world.run(namedAdults);
```

### Selecting just the first matching item
```ts
const firstAdult = baseQuery
    .select('age')
    .filter(x => x.age >= 18) 
    .first()
    .forEach(console.log);
world.run(namedAdults);
```

### Deleting a key from all entities
```ts
const deleteAge = baseQuery.select('age').map(_ => {age: undefined});
world.run(deleteAge);
```

### Deleting all entities
```ts
const deleteAll = baseQuery.select().map(_ => undefined);
world.run(deleteAll);
```
