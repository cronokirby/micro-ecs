import * as chai from 'chai';
import { query, World } from './ecs';


interface Components {
    name: string,
    age: number
}
const baseQuery = query<Components>();

describe('World.add', () => {
    it('should return everything we put in', () => {
        const entities = [
            { name: 'a' },
            { name: 'a', age: 10 },
            { age: 20 },
        ];
        const world = new World<Components>();
        world.add(...entities);
        chai.expect(world.allEntities()).to.eql(entities);
    });
});

const entities = [
    { name: 'young' },
    { name: 'young', age: 10 },
    { name: 'old', age: 20 },
    { age: 20 }
];
const world = new World<Components>();
world.add(...entities);

describe('Query', () => {
    it('should be able to filter keys', () => {
        const expected = [
            { name: 'young' },
            { name: 'young' },
            { name: 'old' }
        ]
        const items: { name: string }[] = [];
        world.run(baseQuery.select('name').forEach(x => items.push(x)));
        chai.expect(items).to.eql(expected);
    });
    it('should be able to filter properties', () => {
        const expected = [
            { name: 'old', age: 20 }
        ];
        const items: { name?: string, age: number }[] = [];
        const sel = baseQuery.select('name', 'age');
        world.run(sel.filter(x => x.age >= 18).forEach(x => items.push(x)));
        chai.expect(items).to.eql(expected);
    });
    it('should be able to remove properties', () => {
        const expected = [
            { name: 'young' },
            { name: 'young' },
            { name: 'old' },
            { age: 20 }
        ];
        world.run(baseQuery.select('name', 'age').map(_ => ({age: undefined})));
        chai.expect(world.allEntities()).to.eql(expected);
    })
});
