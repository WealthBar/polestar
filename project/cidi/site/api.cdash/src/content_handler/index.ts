import {contentHandlerType} from 'node_core';
import {userInfoV1Handler} from "./v1/user_info";

export const contentHandlerArray: contentHandlerType[] = [
  userInfoV1Handler,
];
