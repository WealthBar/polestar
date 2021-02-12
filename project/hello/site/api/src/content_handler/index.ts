import {contentHandlerType} from 'node_core';
import {helloHandler} from './hello';

export const contentHandlerArray: contentHandlerType[] = [helloHandler];
