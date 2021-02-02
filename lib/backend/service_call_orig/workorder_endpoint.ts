import {ctxDbType} from '../middleware/db/db';
import {ctxType} from '../../../../project/staff/backend/src/ctx.type';
import {ctxSessionType} from '../middleware/session/session';
import {dbToWorkorder} from './db_to_workorder';

export type workorderEndpointCtxType = ctxDbType & ctxType & ctxSessionType;

// if any of the hooks return false the processing stops and it is assumed the hook
// has set ctx.body and ctx.status
// the only exception is `contextNameIsValid` which will set ctx.status to 400 and
// ctx.body to a common error message

// contextNameIsValid is mainly used to check of the user has permissions to create the work order
// generally the contextName will be `type/$userId` or `type/$otherId` ... if it is `type/$otherId`
// you should check the owner of $otherId is the current `ctx.sessionInfo.userId`
// Keep in mind that a contextName can have only one outstanding workflow.
//  i.e. using watchCreate/$userId implies a user can only have one watch being created at any one time.
//  i.e. using transfer/$accountId implies an account can only have one transfer being created at any one time.

// preResume
// if you want to block the creation of new workorder for a given context return false from here
// i.e. if the business object checked by the workorder needs further steps to complete, of if your
// are limited the number of business objects the user can hold.
// this covers the case where the user has limited permission to issues workorders

// getComputedData
// Generally business data the user might want to see while creating the workorder but won't be changing
// this is included here to avoid making an additional call to the server to get it.

// preUpdate
// Called before the update is processed to allow for validation of the data. Return false to block the update.
// can also be used to preemptively update business data before the final commit.

// preCommit
// Called before commit, similar to preUpdate. Expected to write event(s) to the work order for commit to process

// commit
// Called after commit (freeze). The business entity for the workflow should be created at this point based
// on event(s) produced in preCommit.

// preAbort
// Called before freezing the workflow without committing it (aborting). Returning false will block the abort.

// getDefaultState
// returns the initial state to create workorder with. This should always include meta.navHistory with a single
// step in the history which is where the workflow starts, and a step entry to store step data in with any
// pre-populated step data.

export function workorderEndpointCtor({
    contextNameIsValid,
    preResume,
    getComputedData,
    preUpdate,
    preCommit,
    commit,
    preAbort,
    getDefaultState,
  }: {
    contextNameIsValid: (ctx: workorderEndpointCtxType, contextName: string) => Promise<boolean>,
    preResume?: (ctx: workorderEndpointCtxType, contextName: string, contentHash: string | undefined) => Promise<boolean>,
    getComputedData?: (ctx: workorderEndpointCtxType, contextName: string) => Promise<any>,
    preUpdate?: (ctx: workorderEndpointCtxType, contextName: string, computed: any, stateList: any) => Promise<boolean>,
    preCommit: (ctx: workorderEndpointCtxType, contextName: string, computed: any, state: any) => Promise<boolean>,
    commit: (ctx: workorderEndpointCtxType, contextName: string, computed: any, state: any) => Promise<void>,
    preAbort?: (ctx: workorderEndpointCtxType, contextName: string, computed: any, state: any) => Promise<boolean>,
    getDefaultState: (ctx: workorderEndpointCtxType, contextName: string, computed: any) => Promise<{ meta: { navHistory: string[], [key: string]: any }, step: { [key: string]: any }, [key: string]: any }>,
  },
) {
  async function workorderEndpoint(ctx: workorderEndpointCtxType): Promise<void> {
    // dbProvider calls are wrapped in a tx already, so if we fail the whole action will be undone.

    await ctx.dbProvider(async (db) => {
      ctx.status = 200;

      const contextName = ctx.params.contextName;

      if (contextNameIsValid) {
        if (!(await contextNameIsValid(ctx, contextName))) {
          ctx.body = {err: [`contextNameInvalid/${contextName}`]};
          ctx.status = 400;
          return;
        }
      }

      const computed = getComputedData ? await getComputedData(ctx, contextName) : {};
      ctx.body = {computed};

      switch (ctx.params.op) {
        case 'RESUME': {
          if (preResume) {
            if (!(await preResume(ctx, contextName, ctx.params.contentHash))) {
              return;
            }
          }

          if (ctx.params.contentHash) {
            ctx.body.workorder = dbToWorkorder(await db.one(
              'SELECT * FROM workorder_by_content_hash($(contextName), $(contentHash))',
              {contextName, contentHash: ctx.params.contentHash},
            ));
          } else {
            const defaultState = await getDefaultState(ctx, contextName, computed);
            if (!(defaultState?.meta?.navHistory?.length > 0) || typeof (defaultState?.step) !== 'object') {
              throw new Error('invalid defaultState: ' + JSON.stringify(defaultState));
            }
            ctx.body.workorder = dbToWorkorder(await db.one(
              'SELECT * FROM workorder_get_active($(contextName), $(defaultState))',
              {contextName, defaultState},
            ));
          }
          return;
        }
        case 'UPDATE': {
          if (preUpdate) {
            if (!(await preUpdate(ctx, contextName, computed, ctx.params.stateList))) {
              return;
            }
          }

          ctx.body.workorderList = [];

          for (const state of ctx.params.stateList) {
            ctx.body.workorderList.push(dbToWorkorder(await db.one(
              'SELECT * FROM workorder_update($(contextName), $(state))',
              {contextName, state},
            )));
          }

          return;
        }
        case 'COMMIT': {
          if (!(await preCommit(ctx, contextName, computed, ctx.params.state))) {
            return;
          }

          const workorder = dbToWorkorder(await db.one(
            'SELECT * FROM workorder_update($(contextName), $(state))',
            {contextName, state: ctx.params.state},
          ));

          if (workorder) {
            ctx.body.workorder = dbToWorkorder(await db.oneOrNone(
              'SELECT * FROM workorder_freeze($(contextName), $(contentHash))',
              {contextName, contentHash: workorder.contentHash},
            ));
          } else {
            ctx.body.err = [`updateFailed/${contextName}`];
            ctx.status = 400;
            return;
          }

          await commit(ctx, contextName, computed, ctx.body.workorder.state);

          return;
        }
        case 'ABORT': {
          const workorder = dbToWorkorder(await db.one(
            'SELECT * FROM workorder_get_active($(contextName))',
            {contextName},
          ));

          if (!workorder) {
            ctx.body.err = [`updateFailed/${contextName}`];
            ctx.status = 400;
            return;
          }

          if (preAbort) {
            if (!(await preAbort(ctx, contextName, computed, workorder.state))) {
              return;
            }
          }

          ctx.body.workorder = dbToWorkorder(await db.oneOrNone(
            'SELECT * FROM workorder_freeze($(contextName), $(contentHash))',
            {contextName, contentHash: workorder.contentHash},
          ));

          return;
        }
        default: {
          ctx.body = {err: [`unknown/${ctx.params.op}`] };
          ctx.status = 400;
          return;
        }
      }
    });
  }

  return workorderEndpoint;
}
