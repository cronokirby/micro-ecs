import * as mocha from 'mocha';
import * as chai from 'chai';

import { helloWorld } from './index';


const expect = chai.expect;
describe('index.ts', () => {
    it('should say hello', () => {
        expect(helloWorld()).to.equal('Hello World!');
    });
});
