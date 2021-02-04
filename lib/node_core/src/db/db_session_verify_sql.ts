export const value = `
SELECT user_id, data FROM "session" WHERE session_id=decode($(sessionId),'hex') AND expire_at > now()

`;
