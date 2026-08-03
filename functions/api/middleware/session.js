/** 会话解析：X-Session-Token → c.get('user')（DB 权威，KV 60s 缓存） */
export async function sessionMiddleware(c, next) {
  const token = c.req.header('X-Session-Token');
  if (token) {
    const services = c.get('services');
    const user = await services.auth.getSessionUser(token);
    if (user) {
      user._sessionToken = token;
      c.set('user', user);
    }
  }
  await next();
}
