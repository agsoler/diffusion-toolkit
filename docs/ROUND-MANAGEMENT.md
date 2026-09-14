# Round management

The Rounds view in Rankings lists comparison rounds within the selected LoRA
output folder and encoder cohort. Turning off encoder separation in Settings
includes all encoders in that folder. Manual results are never included.

Deleting an image remains a rejection. A zero-survivor round continues to count.
Deleting a round explicitly removes its output files and its ranking contribution,
including baseline files. Bulk deletion uses the round IDs visible at confirmation,
not an unbounded server-side "delete everything" query.

The server validates every round against the supplied scope and permits regular
files only inside registered inference-output roots (including real-path checks).
Missing files are harmless. Other file failures retain the round's history for a
retry; some earlier files may already have been deleted. Successful rounds receive
a durable ID tombstone before their ledger payloads are removed. Stale browser
history cannot restore them. Generate reconciles tombstones on mount, window focus
and ranking refresh. Existing result metadata supplies timestamps where available;
otherwise the UI reports that the date is unavailable.

Deletion is unavailable while the current Generate view is running or refreshing;
the server also checks inference-engine health and rejects busy/queued engines.
No training or engine restart is needed to delete completed rounds.

Validation: `node test-round-deletion.cjs` from `ui` uses scratch files and a
scratch SQLite database. Never use real user rounds as destructive test fixtures.
