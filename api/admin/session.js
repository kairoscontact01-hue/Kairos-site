import { endpoint, method, json } from '../../server/http.js';
import { administrator } from '../../server/auth.js';

export default endpoint(async request => {
  method(request, ['GET']);
  await administrator(request);
  return json({ administrator: true });
});
