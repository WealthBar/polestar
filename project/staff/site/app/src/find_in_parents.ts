import Vue from 'vue';

export function findInParents(self: Vue, targetName: string, bail: number) {
  let p = self.$parent;
  while (p && bail > 0) {
    if (p.$options.name === targetName) {
      return p;
    } else {
      p = p.$parent;
    }
    --bail;
  }
}
