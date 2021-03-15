/* eslint-disable @typescript-eslint/camelcase */

import {limitedMemoFCtor} from 'ts_agnostic';
import Vue from 'vue';
import {ws} from '@/ws';

const delayTimeMilliseconds = 100;

const wsWhoAmI = ws.callCtor<{}, { login: string }>('app/whoAmI');
const wsLimitedWhoAmI = limitedMemoFCtor(15000, wsWhoAmI, () => '_');

export const wsAppMixin = Vue.extend({
  data() {
    return {
      $_wsCallsOutstanding: 0,
    };
  },
  methods: {
    async $wsTrackCall<T>(f: () => Promise<T>): Promise<T> {
      ++this.$data.$_wsCallsOutstanding;
      const r = await f();
      // delay the decrement to help smooth out 1->0->1->0->1->0 flicker caused
      // by updates that are watching $wsOutstanding and updating UI elements
      if (this.$data.$_wsCallsOutstanding === 1) {
        setTimeout(() => --this.$data.$_wsCallsOutstanding, delayTimeMilliseconds * 2);
      } else {
        --this.$data.$_wsCallsOutstanding;
      }
      return r;
    },
    $wsWhoAmI() {
      return this.$wsTrackCall(() => wsLimitedWhoAmI({}));
    },
  },
});
