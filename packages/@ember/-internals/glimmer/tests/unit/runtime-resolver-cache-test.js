import { ENV } from '@ember/-internals/environment';
import { RenderingTestCase, moduleFor, runTask } from 'internal-test-helpers';

import { set } from '@ember/object';
import { templateCacheCounters } from '@ember/-internals/glimmer';
import { Component } from '../utils/helpers';

moduleFor(
  'ember-glimmer runtime resolver cache',
  class extends RenderingTestCase {
    '@test a helper definition is only generated once'() {
      this.registerHelper('foo-bar', () => 'foo-bar helper!');
      this.registerHelper('baz-qux', () => 'baz-qux helper!');

      // snapshot counters
      this.getCacheCounters();

      this.render(
        `
          {{~#if this.cond~}}
            {{foo-bar}}
          {{~else~}}
            {{baz-qux}}
          {{~/if}}`,
        {
          cond: true,
        }
      );

      this.assertText('foo-bar helper!');
      this.expectCacheChanges(
        {
          helperDefinitionCount: 1,
          // from this.render
          templateCacheMisses: 1,
          // from debugRenderTree
          templateCacheHits: ENV._DEBUG_RENDER_TREE ? 1 : 0,
        },
        'calculate foo-bar helper only'
      );

      // show component-two for the first time
      runTask(() => set(this.context, 'cond', false));

      this.assertText('baz-qux helper!');
      this.expectCacheChanges(
        {
          helperDefinitionCount: 1,
        },
        'calculate baz-qux helper, misses cache'
      );

      // show foo-bar again
      runTask(() => set(this.context, 'cond', true));

      this.assertText('foo-bar helper!');
      this.expectCacheChanges({}, 'toggle back to foo-bar cache hit');

      // show baz-qux again
      runTask(() => set(this.context, 'cond', false));

      this.assertText('baz-qux helper!');
      this.expectCacheChanges({}, 'toggle back to baz-qux cache hit');
    }

    '@test a component definition is only generated once'() {
      // static layout
      this.registerComponent('component-one', { template: 'One' });
      this.registerComponent('component-two', {
        ComponentClass: class extends Component {},
        template: 'Two',
      });

      // snapshot counters
      this.getCacheCounters();

      // show component-one for the first time
      this.render(`{{component this.componentName}}`, {
        componentName: 'component-one',
      });

      this.assertText('One');
      this.expectCacheChanges(
        {
          componentDefinitionCount: 1,
          // 1 from this.render, 1 from component-one
          templateCacheMisses: 2,
          // debugRenderTree
          templateCacheHits: ENV._DEBUG_RENDER_TREE ? 1 : 0,
        },
        'test case component and component-one no change'
      );

      // show component-two for the first time
      runTask(() => set(this.context, 'componentName', 'component-two'));

      this.assertText('Two');
      this.expectCacheChanges(
        {
          componentDefinitionCount: 1,
          templateCacheMisses: 1,
        },
        'component-two first render'
      );

      // show component-one again
      runTask(() => set(this.context, 'componentName', 'component-one'));

      this.assertText('One');
      this.expectCacheChanges({}, 'toggle back to component-one no change');

      // show component-two again
      runTask(() => set(this.context, 'componentName', 'component-two'));

      this.assertText('Two');
      this.expectCacheChanges({}, 'toggle back to component-two no change');
    }

    getCacheCounters() {
      let { componentDefinitionCount, helperDefinitionCount } = this.renderer._context.constants;

      return (this._counters = {
        templateCacheHits: templateCacheCounters.cacheHit || 0,
        templateCacheMisses: templateCacheCounters.cacheMiss || 0,
        componentDefinitionCount,
        helperDefinitionCount,
      });
    }

    expectCacheChanges(expected, message) {
      let lastState = this._counters;
      let state = this.getCacheCounters();
      let actual = diff(state, lastState);
      this.assert.deepEqual(actual, stripZeroes(expected), message);
    }
  }
);

function stripZeroes(value) {
  let res = {};
  Object.keys(value).forEach((key) => {
    if (value[key]) {
      res[key] = value[key];
    }
  });
  return res;
}

function diff(state, lastState) {
  let res = {};
  Object.keys(state).forEach((key) => {
    let delta = state[key] - lastState[key];
    if (delta !== 0) {
      res[key] = state[key] - lastState[key];
    }
  });
  return res;
}
