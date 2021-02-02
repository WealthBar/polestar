import {rpcCtor} from '../../../../lib/backend/src/ws_rpc_server/ws_rpc_server';
import {registryCtor} from '../../../../lib/agnostic/src/registry';
import {wsCallRegistryEntryType} from '../../../../lib/backend/src/ws_rpc_server/ws_rpc_server.type';
import {authz} from '../../../../lib/backend/src/authz';
import {userListWsCall} from './app/user/user_list';
import {permissionUserListWsCall} from './app/permission/permission_user';
import {colabUserContextListWsCall} from './app/colab/colab_user_context_list';
import {colabSetContextWsCall} from './app/colab/colab_set_context';

const registry = registryCtor<wsCallRegistryEntryType>();

registry.register('userList', {handler: userListWsCall, authz: authz.allOf(['ADMIN_USER_VIEW'])});
registry.register('permissionUserList', {handler: permissionUserListWsCall, authz: authz.allOf(['ADMIN_USER_VIEW'])});
registry.register('colabSetContext',{handler: colabSetContextWsCall, authz: authz.anyUser});
registry.register('colabUserContextList',{handler: colabUserContextListWsCall, authz: authz.anyUser});

export const rpc = rpcCtor(registry);
