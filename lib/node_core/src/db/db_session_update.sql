UPDATE "session" SET expire_at = current_timestamp + '$(expiryInterval) millisecond'::INTERVAL, data=$(data), user_id=$(userId) WHERE session_id=decode($(sessionId),'hex');
