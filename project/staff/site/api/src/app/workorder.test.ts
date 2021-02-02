import * as assert from 'assert';
import {cloneDeep} from 'lodash';
import {getSettings} from '../settings';
import {dbProviderCtor, rolledback} from '../../../../../libs/backend/src/db/db_provider';

const dbProvider = dbProviderCtor(getSettings, true);

describe('workorder', () => {
  it('happy path', async () => {
    await rolledback(dbProvider, async db => {
      const contextName = 'test/123';
      const state1: any = {meta: {navHistory: ['name']}, data: {}};

      const s1 = await db.one(
        'SELECT * FROM workorder_get_active($(contextName), $(state));',
        {contextName, state: state1},
      );

      assert(s1.workorder_id);
      assert(s1.current_content_hash);
      assert.deepStrictEqual(s1.state, state1);

      const state2 = cloneDeep(state1);
      state2.data.name = 'bob';

      const s2 = await db.one(
        'SELECT * FROM workorder_update($(contextName), $(state));',
        {contextName, state: state2},
      );

      assert.strictEqual(s2.workorder_id, s1.workorder_id);
      assert.notStrictEqual(s2.current_content_hash, s1.current_content_hash);
      assert.deepStrictEqual(s2.state, state2);

      const s3 = await db.one(
        'SELECT * FROM workorder_get_active($(contextName));',
        {contextName},
      );

      assert.deepStrictEqual(s2, s3);

      const s4 = await db.one(
        'SELECT * FROM workorder_by_content_hash($(contextName),$(contentHash));',
        {contextName, contentHash: s1.current_content_hash},
      );
      assert.deepStrictEqual(s1.state, s4.state);
      assert(s4.frozen_at === null);
      assert.strictEqual(s4.current_content_hash, s3.current_content_hash);

      const s5 = await db.one(
        'SELECT * FROM workorder_freeze($(contextName),$(contentHash));',
        {contextName, contentHash: s1.current_content_hash},
      );

      assert(!s5.frozen_at);
      assert.strictEqual(s5.current_content_hash, s2.current_content_hash);

      const s6 = await db.one(
        'SELECT * FROM workorder_freeze($(contextName),$(contentHash));',
        {contextName, contentHash: s2.current_content_hash},
      );
      assert(s6.frozen_at);
      assert.strictEqual(s6.current_content_hash, s2.current_content_hash);

      const state3 = cloneDeep(state2);
      state3.data.phone = '555-1212';

      const s7 = await db.oneOrNone(
        'SELECT * FROM workorder_update($(contextName), $(state));',
        {contextName, state: state3},
      );

      assert(s7 === null); // couldn't update a frozen workorder

      const s8 = await db.one(
        'SELECT * FROM workorder_get_active($(contextName), $(state));',
        {contextName, state: state3},
      );
      assert.notStrictEqual(s1.workorder_id, s8.workorder_id);
      assert.notStrictEqual(s1.current_content_hash, s8.current_content_hash);
      assert.notDeepStrictEqual(s1.state, s8.state);
      assert.deepStrictEqual(s8.state, state3);
    });
  });
});
