# Local Windows installation

Clone this fork's `integration` branch and run `run_windows.bat` from the repository root for first-time setup. The manager installs the required Python and Node dependencies, builds the UI, and creates the empty SQLite database schema. Model weights are downloaded when a job or generation first uses them.

The public UI listens on `127.0.0.1:8675` by default. Set `AI_TOOLKIT_UI_HOST` before launch to change the listening address. For example, `0.0.0.0` allows other devices to connect if the firewall permits it. Configure access control before exposing the UI beyond your machine. The internal Next.js server always stays on loopback.

After first-time setup, `scripts/Start-Training-UI.cmd` starts the installed toolkit without opening a browser. It uses repo-relative cache and model paths and accepts `AI_TOOLKIT_UI_HOST` from the environment. If the Python environment is missing, use `run_windows.bat` first.

`scripts/Download-ZImage-Models.py` optionally prefetches the stock Z-Image Turbo components and Ostris training adapter. Run it with the toolkit's Python environment:

```powershell
& .\.venv\Scripts\python.exe .\scripts\Download-ZImage-Models.py
```

The script does not download custom text encoders, user LoRAs, or datasets. It is not required for ordinary training or generation because the model loader downloads standard components on demand.
