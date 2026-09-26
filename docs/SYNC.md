# Saving, backups, and cross-device sync

## What works now

MBU-NAP remains local-first. Progress is stored in the browser's localStorage.

The shared app core adds:

- a stable per-browser device id;
- per-save revision and updated-time metadata;
- a versioned backup envelope (`schema: 1`);
- **Download backup** and **Import backup** in the global Tools dialog;
- deterministic "newer save wins" import behavior;
- a replace mode available through the API;
- a pluggable adapter API for future cloud synchronization.

This means progress can already be moved manually between devices without changing any bank's save format.

## Sync envelope

`MBUSync.exportSnapshot()` returns:

- app/schema identifiers;
- build and device id;
- raw values for every tracked progress store;
- per-store revision metadata.

`MBUSync.importSnapshot(snapshot)` imports only known save keys. Unknown keys are ignored.

## Future cloud provider

A backend can be added without rewriting quiz engines:

```js
MBUSync.registerAdapter('provider-name', {
  async pull(context) {
    // Return a compatible snapshot or null.
  },
  async push(snapshot) {
    // Persist the snapshot remotely.
  }
});

await MBUSync.syncWith('provider-name');
```

No cloud adapter is bundled yet. Authentication, encryption, server-side revisions, and account identity should be selected together when a provider is chosen.

## Merge model

Current groundwork uses per-store last-writer-wins ordering:

1. `updatedAt`;
2. revision number;
3. device id as a deterministic tie-breaker.

A future server-backed adapter should replace clock-based ordering with server revisions or another authoritative conflict mechanism.
