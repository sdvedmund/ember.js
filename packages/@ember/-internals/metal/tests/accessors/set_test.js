import EmberObject from '@ember/object';
import { get, set, trySet, computed } from '../..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'set',
  class extends AbstractTestCase {
    ['@test should set arbitrary properties on an object'](assert) {
      let obj = {
        string: 'string',
        number: 23,
        boolTrue: true,
        boolFalse: false,
        nullValue: null,
        undefinedValue: undefined,
      };

      let newObj = {};

      for (let key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) {
          continue;
        }

        assert.equal(set(newObj, key, obj[key]), obj[key], 'should return value');
        assert.ok(key in newObj, 'should have key');
        assert.ok(Object.prototype.hasOwnProperty.call(newObj, key), 'should have key');
        assert.equal(get(newObj, key), obj[key], 'should set value');
      }
    }

    ['@test should set a number key on an object'](assert) {
      let obj = {};

      set(obj, 1, 'first');
      assert.equal(obj[1], 'first');
    }

    ['@test should set an array index'](assert) {
      let arr = ['first', 'second'];

      set(arr, 1, 'lol');
      assert.deepEqual(arr, ['first', 'lol']);
    }

    ['@test should call setUnknownProperty if defined and value is undefined'](assert) {
      let obj = {
        count: 0,

        unknownProperty() {
          assert.ok(false, 'should not invoke unknownProperty if setUnknownProperty is defined');
        },

        setUnknownProperty(key, value) {
          assert.equal(key, 'foo', 'should pass key');
          assert.equal(value, 'BAR', 'should pass key');
          this.count++;
          return 'FOO';
        },
      };

      assert.equal(set(obj, 'foo', 'BAR'), 'BAR', 'should return set value');
      assert.equal(obj.count, 1, 'should have invoked');
    }

    ['@test warn on attempts to call set with undefined as object']() {
      expectAssertion(
        () => set(undefined, 'aProperty', 'BAM'),
        /Cannot call set with 'aProperty' on an undefined object./
      );
    }

    ['@test warn on attempts to call set with null as object']() {
      expectAssertion(
        () => set(null, 'aProperty', 'BAM'),
        /Cannot call set with 'aProperty' on an undefined object./
      );
    }

    ['@test warn on attempts to use set with an unsupported property path']() {
      let obj = {};
      expectAssertion(
        () => set(obj, null, 42),
        /The key provided to set must be a string or number, you passed null/
      );
      expectAssertion(
        () => set(obj, NaN, 42),
        /The key provided to set must be a string or number, you passed NaN/
      );
      expectAssertion(
        () => set(obj, undefined, 42),
        /The key provided to set must be a string or number, you passed undefined/
      );
      expectAssertion(
        () => set(obj, false, 42),
        /The key provided to set must be a string or number, you passed false/
      );
    }

    ['@test warn on attempts of calling set on a destroyed object']() {
      let obj = { isDestroyed: true };

      expectAssertion(
        () => set(obj, 'favoriteFood', 'hot dogs'),
        'calling set on destroyed object: [object Object].favoriteFood = hot dogs'
      );
    }

    ['@test does not trigger auto-run assertion for objects that have not been tagged'](assert) {
      let obj = {};

      set(obj, 'foo', 'bar');

      assert.equal(obj.foo, 'bar');
    }

    ['@test does not warn on attempts of calling set on a destroyed object with `trySet`'](assert) {
      let obj = { isDestroyed: true };

      trySet(obj, 'favoriteFood', 'hot dogs');
      assert.equal(obj.favoriteFood, undefined, 'does not set and does not error');
    }

    ['@test should work with native setters'](assert) {
      let count = 0;

      class Foo {
        __foo = '';

        get foo() {
          return this.__foo;
        }

        set foo(value) {
          count++;
          this.__foo = `computed ${value}`;
        }
      }

      let obj = new Foo();

      assert.equal(set(obj, 'foo', 'bar'), 'bar', 'should return set value');
      assert.equal(count, 1, 'should have native setter');
      assert.equal(get(obj, 'foo'), 'computed bar', 'should return new value');
    }

    ['@test should respect prototypical inheritance when subclasses override CPs'](assert) {
      let ParentClass = class extends EmberObject {
        @computed
        get prop() {
          return this._val;
        }
        set prop(val) {
          assert.ok(false, 'incorrect setter called');
          this._val = val;
        }
      };

      let SubClass = class extends ParentClass {
        set prop(val) {
          assert.ok(true, 'correct setter called');
          this._val = val;
        }
      };

      let instance = SubClass.create();

      instance.prop = 123;
    }

    ['@test should respect prototypical inheritance when subclasses override CPs with native classes'](
      assert
    ) {
      class ParentClass extends EmberObject {
        @computed
        set prop(val) {
          assert.ok(false, 'incorrect setter called');
          this._val = val;
        }
      }

      class SubClass extends ParentClass {
        set prop(val) {
          assert.ok(true, 'correct setter called');
          this._val = val;
        }
      }

      let instance = SubClass.create();

      instance.prop = 123;
    }
  }
);
