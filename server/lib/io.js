let ioInstance = null;

export function setIo(io) {
  ioInstance = io;
}

export function getIo() {
  return ioInstance;
}

/** Broadcast a "postgres_changes"-shaped realtime event to everyone. */
export function broadcastChange(table, eventType, row, oldRow) {
  const io = getIo();
  if (!io) return;
  io.emit(`change:${table}`, { table, eventType, new: row ?? null, old: oldRow ?? null });
}

/** Send a realtime event only to a specific user's private room. */
export function emitToUser(userId, table, eventType, row, oldRow) {
  const io = getIo();
  if (!io) return;
  io.to(`user:${String(userId)}`).emit(`change:${table}`, {
    table, eventType, new: row ?? null, old: oldRow ?? null,
  });
}
