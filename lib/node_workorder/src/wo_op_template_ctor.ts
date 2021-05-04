import {dbType} from 'node_core';
import {serializableType} from 'ts_agnostic';
import {dbProviderCtxType} from "node_core";
import {sigCtor} from "node_core";
import {woActionType, woMetadataType, woOpType, woSignType, woStateType} from "ts_workorder";

export type woTemplateType = {
  secret: string,
  contextNameIsValid: (db: dbType, contextName: string) => Promise<boolean>,
  getComputedData?: (db: dbType, contextName: string) => Promise<Record<string, serializableType>>,
  getDefaultState: (db: dbType, contextName: string, computed: Record<string, serializableType>) => Promise<woStateType>,
  validate: (db: dbType, contextName: string, computed: Record<string, serializableType>, state: {
    navHistory: string[],
    step: Record<string, Record<string, serializableType>>,
  }) => Promise<{ action?: woActionType, err?: string }>,
  commit: (db: dbType, contextName: string, action: woActionType) => Promise<void>,
};

type woDbType = {
  state: woStateType,
  metadata: woMetadataType,
};

function dbToWorkorder(dbRow: {
  workorder_id: string,
  context_name: string,
  content_hash: string,
  current_content_hash: string,
  state: woStateType,
  frozen_at?: string,
}): woDbType | undefined {
  if (dbRow) {
    return {
      metadata: {
        woId: dbRow.workorder_id,
        contextName: dbRow.context_name,
        currentContentHash: dbRow.current_content_hash,
        frozenAt: dbRow.frozen_at,
      },
      state: {...dbRow.state, contentHash: dbRow.content_hash}
    };
  }
}

const toValidationState = (state: woStateType) => {
  const step: Record<string, Record<string, serializableType>> = {};
  for (const s in state.step) {
    step[s] = state.step[s];
  }
  return {
    navHistory: state.navHistory,
    step
  };
}

export const internal = {
  toValidationState
};

export const woOpTemplateCtor = (
  {
    secret,
    contextNameIsValid,
    getComputedData,
    getDefaultState,
    validate,
    commit,
  }: woTemplateType
) => {
  const sig = sigCtor(secret);

  const woOp = async ({db}: { db: dbProviderCtxType }, params: Partial<woOpType>) => {
    const {contextName, op} = params;

    if (!op || !['UPDATE', 'SIGN', 'COMMIT', 'RESUME'].includes(op)) {
      return {err: `opInvalid`};
    }

    const applyUpdate = async (db: dbType, states: woStateType[]) => {
      const s1 =
        dbToWorkorder(await db.one(
          'SELECT * FROM workorder_update($(contextName), $(state))',
          {contextName, state: states[0]},
        ));

      const s2 =
        dbToWorkorder(await db.one(
          'SELECT * FROM workorder_update($(contextName), $(state))',
          {contextName, state: states[1]},
        ));

      if (!s1 || !s2) {
        return {err: 'updateNoWorkorder'};
      }

      return {
        res: {
          states: [s1.state, s2.state],
          metadata: s2.metadata,
        },
      };
    }

    return db(async (db) => {
      if (!contextName || !(await contextNameIsValid(db, contextName))) {
        return {err: `contextNameInvalid`};
      }

      const computed = getComputedData ? await getComputedData(db, contextName) : {};

      switch (params.op) {
        case 'RESUME': {
          const contentHash = params.contentHash;

          let woDb: woDbType | undefined;
          if (contentHash) {
            woDb = dbToWorkorder(await db.one(
              'SELECT * FROM workorder_by_content_hash($(contextName), $(contentHash))',
              {contextName, contentHash},
            ));
          } else {
            const defaultState = await getDefaultState(db, contextName, computed);
            if (!(defaultState?.navHistory?.length > 0) || typeof (defaultState?.step) !== 'object') {
              throw new Error('invalid defaultState: ' + JSON.stringify(defaultState));
            }
            woDb = dbToWorkorder(await db.one(
              'SELECT * FROM workorder_get_active($(contextName), $(defaultState))',
              {contextName, defaultState},
            ));
          }
          if (!woDb) {
            return {err: 'resumeNoWorkorder'};
          }

          // todo
          // if sign.envId && !sign.signed
          //   check docusign for status
          //     unsigned => get new signing url, update sign.url
          //     signed => update sign.signed to true

          return {
            res: {
              states: [woDb.state],
              metadata: woDb.metadata,
            },
          };
        }
        case 'UPDATE': {
          const states = params.states;
          if (states?.length !== 2) {
            return {err: 'updateInvalidStates'};
          }

          return await applyUpdate(db, states);
        }
        case 'SIGN': {
          const states = params.states;
          if (states?.length !== 2) {
            return {err: 'signInvalidStates'};
          }

          const r = await validate(db, contextName, computed, toValidationState(states[1]));
          if (r.err) {
            return r;
          }
          if (!r.action) {
            return {err: 'signNoAction'};
          }
          const action = r.action;
          action.sig = sig({contextName, action});

          const sign: woSignType = {
            envId: 'todo', // get from docusign
            url: 'todo', // get from docusign
            signed: false,
          };

          states[1].action = action;
          states[1].sign = sign;

          return await applyUpdate(db, states);
        }
        case 'COMMIT': {
          const states = params.states;

          if (states?.length !== 2) {
            return {err: 'commitInvalidStates'};
          }

          const s2 = states[1];
          if (s2.sign && !s2.sign.signed) {
            return {err: 'commitNotSigned'};
          }
          if (s2.action) {
            const origSig = s2.action.sig;
            delete s2.action.sig;
            const asig = sig({contextName, action: s2.action});
            if (asig !== origSig) {
              return {err: 'commitFailed'};
            }
            s2.action.sig = origSig;
          } else {
            const r = await validate(db, contextName, computed, toValidationState(states[1]));
            if (r.err) {
              return r;
            }
            if (!r.action) {
              return {err: 'commitNoAction'};
            }
            const action = r.action;
            action.sig = sig({contextName, action});
            s2.action = action;
          }

          const woDb1 =
            dbToWorkorder(await db.one(
              'SELECT * FROM workorder_update($(contextName), $(state))',
              {contextName, state: states[0]},
            ));

          if (!woDb1) {
            return {err: `commitFailed`};
          }

          let woDb2 = dbToWorkorder(await db.one(
            'SELECT * FROM workorder_update($(contextName), $(state))',
            {contextName, s1: s2},
          ));

          if (woDb2) {
            const freeze = await db.oneOrNone(
              'SELECT * FROM workorder_freeze($(contextName), $(contentHash))',
              {contextName, contentHash: s2.contentHash},
            );
            if (!freeze) {
              return {err: `commitFailed`};
            }
            woDb2 = dbToWorkorder(freeze);
          } else {
            return {err: `commitFailed`};
          }

          if (!woDb2) {
            return {err: `commitFailed`};
          }

          await commit(db, contextName, s2.action);

          return {
            res: {
              states: [woDb1.state, woDb2.state],
              metadata: woDb2.metadata,
            },
          };
        }
      }
    });
  }

  return woOp;
}

export type woOpTemplateType = ReturnType<typeof woOpTemplateCtor>;
