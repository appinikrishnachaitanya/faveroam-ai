import test from 'node:test';
import assert from 'node:assert/strict';
import {modelFailureReason} from '../src/agent/model-failure.ts';
test('provider failures distinguish quota, deadline, cancellation and transport without exposing bodies',()=>{
  assert.equal(modelFailureReason({status:429,message:'private provider body'}),'rate-limit');
  assert.equal(modelFailureReason({status:504}),'timeout');
  assert.equal(modelFailureReason({status:503}),'provider');
  const cancelled=new AbortController();cancelled.abort();
  assert.equal(modelFailureReason(new Error('private'),cancelled.signal),'cancelled');
  const timeout=new AbortController();timeout.abort(new DOMException('deadline','TimeoutError'));
  assert.equal(modelFailureReason(new Error('private'),timeout.signal),'timeout');
  assert.equal(modelFailureReason(new Error('private')),'transport');
});
