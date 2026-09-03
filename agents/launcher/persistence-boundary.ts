import { readLauncherAgentState, type LauncherAgentState } from "./launcher-state.js";

// Keep rejected persistence promises inside ordinary async code rather than
// propagating them through the compiler's serialized exception handler.
export async function restoreCockpit(task: {
  sessionId: string;
  restore(): Promise<unknown>;
}, discardUnreadable: boolean): Promise<{ ok: true; state: LauncherAgentState } | { ok: false }> {
  try {
    const restored = await task.restore();
    try {
      return { ok: true, state: readLauncherAgentState(restored, task.sessionId) };
    } catch {
      if (discardUnreadable) return { ok: true, state: readLauncherAgentState(undefined, task.sessionId) };
      return { ok: false };
    }
  } catch {
    return { ok: false };
  }
}

export async function checkpointPriorCockpit(task: {
  save(state: LauncherAgentState): Promise<void>;
}, state: LauncherAgentState): Promise<boolean> {
  try {
    await task.save(state);
    return true;
  } catch {
    return false;
  }
}
