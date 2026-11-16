import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { MongoClient } from 'mongodb';
const { PARTIERS_TEST_URL: base, MONGODB_URI: uri, MONGODB_DB: name } = process.env;
assert.match(name ?? '', /^partiers_test_[a-f0-9]+$/);
for (const url of [base, uri]) assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname));
const client = new MongoClient(uri);
const db = client.db(name);
const token = (await (await fetch(`${base}/api/form-token?form=booking`)).json()).token;
await delay(2100);
const body = { parentName: 'Retry check', contact: 'retry@example.invalid', childName: 'Test', childAge: 6, numberOfChildren: 4, date: '2099-06-15', time: '10:00', durationMinutes: 60, eventType: 'birthday', location: 'Test location', activities: [], notes: '', website: '', formToken: token };
const key = randomUUID();
async function send(value = body, requestKey = key) {
  return fetch(`${base}/api/bookings`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestKey }, body: JSON.stringify(value) });
}
try {
  const responses = await Promise.all(Array.from({length: 4}, () => send()));
  assert.deepEqual(responses.map(r => r.status), [201,201,201,201]);
  const receipts = await Promise.all(responses.map(r => r.json()));
  for (const receipt of receipts) assert.deepEqual(receipt, receipts[0]);
  assert.equal(await db.collection('bookings').countDocuments({contact: body.contact}), 1);
  await db.collection('bookings').updateOne({contact: body.contact}, {$set:{status:'confirmed'}});
  assert.equal((await send()).status, 201, 'Retry must work even after admin confirmation');
  assert.equal((await send({...body, childName:'Different'})).status, 409);
  assert.equal((await send(body,randomUUID())).status, 409, 'New overlapping request must fail');
  await db.collection('rateLimits').deleteMany({});
  for (const invalid of [{date:'2099-02-31'},{time:'08:30'},{time:'10:01'},{childAge:null},{childAge:''},{time:'22:00',durationMinutes:240}]) {
    assert.equal((await send({...body,...invalid},randomUUID())).status,400);
  }
  await db.collection('blockedDates').insertOne({date:'2099-06-16',reason:'PRIVATE BLOCK REASON'});
  assert.equal((await send({...body,date:'2099-06-16'},randomUUID())).status,409);
  const availability = await (await fetch(`${base}/api/availability?date=${body.date}`)).json();
  assert.deepEqual(availability,{taken:[{start:'10:00',end:'11:00'}],blocked:false});
  const blocked = await (await fetch(`${base}/api/availability?date=2099-06-16`)).json();
  assert.deepEqual(blocked,{taken:[],blocked:true});
  console.log('PASS: concurrent/replayed bookings save one receipt, changed payload rejected, retry after confirmation, direct invalid dates/times/durations/ages, blocked date and public availability privacy.');
} finally {
  await db.collection('bookings').deleteMany({contact:body.contact});
  await db.collection('blockedDates').deleteMany({date:'2099-06-16'});
  await db.collection('rateLimits').deleteMany({});
  await client.close();
}
