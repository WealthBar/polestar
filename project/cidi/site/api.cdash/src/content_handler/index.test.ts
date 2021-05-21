import * as assert from "assert";
import {contentHandlerArray} from "./index";

describe('content_handler', () => {
  it('index', () => {
    assert(contentHandlerArray.length>0);
  });
});