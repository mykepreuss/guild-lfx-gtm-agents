import assert from "node:assert/strict";

// Exercise the actual Babel-generated machine. A dispatched specialist leaves
// an execution checkpoint in the runtime's state slot until the agent explicitly
// saves its domain state. Ordinary in-process awaits do not dispatch a subtask.
// This models the live failure boundary; it is not a replacement Guild runtime.
export function compiledLauncherRunner(agent, chat) {
  const dispatched = new WeakSet();
  let checkpoints = 0;
  for (const [name, tool] of Object.entries(chat.task.tools)) {
    if (!name.startsWith("marketing_os_")) continue;
    chat.task.tools[name] = (...args) => {
      const promise = tool(...args);
      dispatched.add(promise);
      return promise;
    };
  }

  // Preserve graph identity across serialization, including aliases between the
  // cockpit and current run. Task handles are reattached by the runtime, not JSON.
  function snapshot(machine) {
    const seen = new Map();
    function encode(value) {
      if (value === chat.task) return { runtimeTaskHandle: true };
      if (value instanceof Promise) return { runtimePromiseHandle: true };
      if (typeof value === "function") throw new Error("Unexpected function in compiled frame");
      if (!value || typeof value !== "object") return value;
      if (seen.has(value)) return seen.get(value);
      if (value instanceof RegExp || value instanceof Date) return structuredClone(value);
      const copy = Array.isArray(value) ? [] : {};
      seen.set(value, copy);
      for (const [key, entry] of Object.entries(value)) copy[key] = encode(entry);
      return copy;
    }
    return structuredClone(encode(machine.get()));
  }

  function reattach(value, seen = new Set()) {
    if (!value || typeof value !== "object" || seen.has(value)) return value;
    if (value.runtimeTaskHandle === true) return chat.task;
    if (value.runtimePromiseHandle === true) return undefined; // supplied through accept/reject
    seen.add(value);
    for (const [key, entry] of Object.entries(value)) value[key] = reattach(entry, seen);
    return value;
  }

  return {
    checkpointCount: () => checkpoints,
    async run(input) {
      let machine = agent.getStateMachine();
      let next = { type: "start", input: [input, chat.task] };
      for (let steps = 0; steps < 1000; steps++) {
        const result = machine.step(next);
        if (result.type === "return") return result.value;
        if (result.type === "throw") throw result.value;
        assert.equal(result.type, "await");
        if (dispatched.has(result.promise)) {
          const serialized = snapshot(machine);
          chat.replaceRuntimeCheckpoint(serialized);
          checkpoints++;
          machine = agent.getStateMachine();
          machine.set(reattach(structuredClone(serialized)));
        }
        try { next = { type: "accept", value: await result.promise }; }
        catch (error) { next = { type: "reject", value: error }; }
      }
      throw new Error("Compiled Launcher did not finish within the test step bound");
    },
  };
}
