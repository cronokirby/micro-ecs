import * as chai from 'chai';
import { Query, select, World } from './ecs';


interface Components {
    name: string,
    age: number
}

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
        world.run(select<Components, 'name'>('name').forEach(x => items.push(x)));
        chai.expect(items).to.eql(expected);
    });
    it('should be able to filter properties', () => {
        const expected = [
            { name: 'old', age: 20 }
        ];
        const items: { name?: string, age: number }[] = [];
        const sel = select<Components, 'name' | 'age'>('name', 'age');
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
        const sel = select<Components, 'name' | 'age'>('name', 'age');
        world.run(sel.map(x => ({age: undefined})));
        chai.expect(world.allEntities()).to.eql(expected);
    })
});
