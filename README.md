# MyGamesThing

A Windows-focused **game activity manager / rotator**, built with Electron and vanilla JavaScript. Based on / derived from [PresencePal by foxmanhwa](https://github.com/foxmanhwa/presencepal).

> [!WARNING]
> **DO NOT USE THIS APPLICATION TO FARM QUESTS, REWARDS, OR OTHER INCENTIVE SYSTEMS.**
> Simulating activity for the purpose of obtaining rewards may violate the rules of services that provide activity-based rewards. Your account may be restricted or suspended, and you may lose access to rewards.
>
> **НЕ ИСПОЛЬЗУЙТЕ ПРИЛОЖЕНИЕ ДЛЯ ФАРМА ЗАДАНИЙ, НАГРАД ИЛИ ДРУГИХ СИСТЕМ ВОЗНАГРАЖДЕНИЙ.**
> Имитация активности ради получения наград может нарушать правила сервисов, использующих системы вознаграждений. Аккаунт может быть ограничен или заблокирован.

MyGamesThing works with a catalog of detectable Windows applications, copies the original runner into an application-owned game folder, and runs it under the selected Windows executable name.

Activity detection itself is handled by compatible desktop software. MyGamesThing does not require account credentials, authentication tokens, reward-system integration, or modification of Steam metadata.

## Install

Download from [GitHub Releases](https://github.com/malevnick/MyGamesThing/releases/latest):

- `MyGamesThing-0.1.0-x64-nsis.exe` for the installer
- `MyGamesThing-0.1.0-x64-portable.exe` for the portable launcher

Local builds are stored under `dist/`.

Requirements:

- Windows 10/11 x64
- compatible desktop activity-detection software

Release binaries are unsigned unless a distributor supplies a signing certificate.

Portable means no installer is required. Settings still persist in the user's application data.

## Features

- Dashboard with current game, elapsed/remaining time, progress, ETA, and next five games.
- Searchable, paginated game library.
- Favorites, blacklist, recent games, application IDs, executable overrides, and custom games.
- Random queues without repeats.
- Curated Popular queues ordered by A/B/C/D tier.
- Manually selected and reorderable Custom queues.
- Arbitrary positive target count.
- Fixed durations or random duration ranges.
- Configurable inter-game delay.
- Start, pause, resume, skip, stop, remove pending items, reset, regenerate, and saved presets.
- Main-process deadline scheduling, so minimizing or hiding the renderer cannot stop the rotation clock.
- Persisted sessions with explicit recovery.
- Local detectable-application catalog with live/cache status.
- History with paths, timestamps, results, runtime, statistics, and JSON export.
- Steam library discovery.
- Controlled per-game folders.
- Storage cleanup and migration.
- Tray controls and configurable minimize/close behavior.
- Optional authenticated HTTP/UDP control on loopback, disabled by default.

If the requested target count exceeds the eligible game pool, the queue preview shows the smaller available selection rather than introducing repeats.

The application keeps a saved local catalog after the first successful fetch.

Later launches use the saved library without automatically requesting a new catalog. Only **Refresh list** in Library requests an update.

If refresh fails, the previously saved library remains available.

## Quick start

1. Open **Queues** and choose a preset, mode, target count, and interval.
2. Click **Generate queue**, review the lineup, then click **Start**.
3. For a custom lineup, select games with **+ Queue** in Library first.
4. Use the arrows in Queues to reorder pending games.
5. For a single game, use **Play** in Library. It uses the default interval.
6. Use **Pause** to stop the generated process while preserving its remaining duration.
7. **Resume** relaunches it.
8. **Stop** ends the session.
9. **Reset** clears the preview.

Closing to tray keeps the rotation running only when **Continue rotation while in tray** is enabled.

**Quit** in the tray fully exits the application, stops the active runner, and saves the session in a paused state.

Reopening the application never launches a recovered session automatically. The user must explicitly choose Resume.

Seconds are used throughout:

- 90 = 1m 30s
- 300 = 5m
- 3600 = 1h

Intervals allow up to seven days per game.

A crash can lose at most roughly five seconds of checkpointed activity.

Time while the application is closed is not counted as runtime.

Normal pauses and application shutdown save immediately.

Unexpected runner exits are recorded as failures and the queue advances automatically.

## Development

Node.js 24 LTS and npm:

```powershell
npm ci
npm start
```

Minimal validation:

```powershell
npm run check
npm test
npm run smoke
```

There are three focused tests covering:

- deadline and recovery behavior
- failure progression
- owned-file cleanup

The smoke command launches Electron with isolated temporary user data and checks the renderer/preload bridge.

It never launches a game runner.

## Build

```powershell
npm run build

# Or unpacked development build:
npm run build:dir
```

Builds Windows x64 NSIS and portable executables with electron-builder.

`assets/runner.exe` is copied outside ASAR as:

```text
resources/runner.exe
```

`.github/workflows/build.yml` builds artifacts on a version tag or manual dispatch.

It uploads CI artifacts and does not publish a GitHub release automatically.

Sign releases before public distribution if you have a certificate.

## Architecture

```text
src/
  main/
    index.js             Electron lifecycle, IPC sender checks, tray, serialization
    service.js           Validated application commands and settings
    queue-manager.js     Queue state machine, deadlines, recovery, history
    process-manager.js   Exact child process tracking and stale PID/path recovery
    storage-manager.js   Steam discovery, safe paths, ownership, cleanup/migration
    game-catalog.js      Catalog fetch, normalization, executable selection, disk cache
    ranking.js           Curated ranking and conservative title/alias matching
    persistence.js       Atomic JSON writes, backup recovery, rotating log
    config.js            Defaults and input validation
    remote-control.js    Optional authenticated local HTTP/UDP integration

  preload/
    index.js             Allowlisted IPC bridge with no raw Electron exposure

  renderer/
    index.html
    styles.css
    app.js

    components/
      Dashboard
      Library
      Queue
      History
      Settings
      UI helpers

data/
  popular-games.json     Editable editorial ranking, not live player-count data

assets/
  Upstream runner and MyGamesThing icon files

companion/
  Optional browser-based local controller

scripts/
  Syntax check and isolated Electron smoke launch

tests/
  Critical behavior checks
```

The main process owns all queue transitions and deadlines:

```js
endAt = now + remainingMs
```

Renderer state is only a display snapshot.

No renderer timer advances the queue.

Commands and scheduler transitions are serialized.

The main scheduler runs every 500 ms.

Catalog network refresh runs separately so a slow request cannot block queue deadlines.

System sleep naturally suspends the operating system.

After wake, an expired active item finishes and the next game starts instead of launching a burst of missed games.

The renderer is sandboxed with:

- context isolation
- no Node integration
- restrictive CSP
- denied navigation
- denied popups
- denied permissions
- fixed IPC allowlist

External game and application names are escaped before rendering.

Preferences and application state remain separate from presentation code.

## Storage

Priority:

```text
explicit user-selected parent
    ->
detected Steam library
    ->
local application data
```

Default Steam-based layout:

```text
<Steam library>/steamapps/common/MyGamesThing/Games/
  Counter-Strike 2--<stable-id-hash>/cs2.exe
  Cyberpunk 2077--<stable-id-hash>/Cyberpunk2077.exe
```

Fallback:

```text
%LOCALAPPDATA%/MyGamesThing/Games/
```

The directory picker chooses a **parent directory**.

`MyGamesThing/Games` is always appended automatically.

To select another Steam library manually, choose its:

```text
steamapps/common
```

directory.

The Settings page displays the exact resolved storage path.

Automatic discovery reads Steam installation locations from the Windows registry and parses:

```text
steamapps/libraryfolders.vdf
```

Common Program Files locations are used only as fallback candidates.

No assumption is made that Steam is installed on the C: drive.

Folder names remove:

- Windows-invalid characters
- trailing dots
- trailing spaces
- reserved Windows device names

A stable application-ID hash prevents name collisions.

Executable basenames are validated separately.

Paths longer than 240 characters are rejected.

Linked or junction-based storage paths are rejected.

The application never writes Steam manifests and never modifies real game installation folders.

Root and per-game ownership markers restrict cleanup to files generated by MyGamesThing.

Untracked files remain untouched.

**Unused** means a generated game that is not:

- in the pending queue
- paused
- marked as favorite

Pause or stop an active session before cleanup or migration.

Migration provides three options:

- leave existing files where they are
- copy files to the new location and then remove the source
- delete generated files and regenerate them when required

Interrupted copies may leave application-owned files at both roots.

Source files are not removed until the copy phase completes successfully.

Storage roots left behind using **Leave** are not automatically cleaned.

The main process tracks its generated child process directly.

Startup stale-process cleanup compares:

- persisted PID
- full executable path

This prevents unrelated processes with the same executable filename or a reused PID from being terminated.

There is no global:

```text
taskkill /IM
```

fallback.

Generated files cannot be cleaned or migrated while a tracked runner is active.

## Application data

Application data is stored under Electron's:

```js
app.getPath('userData')
```

Normally:

```text
%APPDATA%/MyGamesThing
```

Files include:

```text
settings.json
library.json
presets.json

session.json
history.json
catalog.json
process.json

remote-token.json

app.log
```

`remote-token.json` contains the credential used by the optional local integration.

`app.log` rotates after approximately 2 MiB.

The detectable-application catalog is stored locally in:

```text
%APPDATA%/MyGamesThing/catalog.json
```

There is no age-based expiry or automatic background refresh.

Deleting or corrupting the catalog and its backup causes another initial catalog fetch.

Game icons may still be loaded from external CDN sources when displayed. This is independent from the catalog refresh mechanism.

JSON writes use:

1. temporary file creation
2. flush
3. rename
4. previous-version `.bak`

Invalid JSON is preserved as:

```text
.corrupt-<timestamp>
```

The backup is then attempted.

No critical state uses renderer localStorage.

## Local integrations

Enable local integrations in Settings, save the configuration, and use **Show connection details**.

Open:

```text
http://127.0.0.1:41235/
```

for the local browser controller.

Available HTTP routes include:

```text
/play?game=Exact%20Title
/stop
/status
```

Requests require:

```text
Authorization: Bearer <token>
```

UDP port:

```text
41234
```

accepts messages such as:

```json
{
  "action": "play",
  "game": "Exact Title",
  "token": "..."
}
```

It also supports stop and status actions.

Active sessions must be stopped before replacement through remote control.

These endpoints bind only to loopback, have no wildcard CORS policy, and require authentication.

Do not expose this development API to a network.

## Screenshots

![Dashboard](screenshots/dashboard.png)

The dark interface includes:

- Dashboard
- Library
- Queues
- History
- Settings

Additional release screenshot placeholders:

- Library
- Running custom queue

## Known limitations / next work

- Successful runner launch does not guarantee that every third-party activity-detection application will recognize or display it.
- The upstream runner is a precompiled binary and its source is absent from the base repository. It is retained unchanged.
- Curated title matching is deliberately conservative.
- Unrecognized games fall back to tier D.
- Aliases and rankings may require updates as external application catalogs change.
- No automatic migration of old PresencePal localStorage preferences.
- Original data remains separate.
- History is currently loaded into memory.
- Very large histories may eventually need SQLite or retention settings.
- Windows x64 only.
- English UI only.
- Dark theme only.
- Code signing is not currently configured.
- Clean-VM installer testing is recommended.
- A source-built runner would be a useful future improvement.

## License & credits

MIT.

**Based on / derived from PresencePal by foxmanhwa.**

Preserve `LICENSE` and `NOTICE` with redistributed copies.

The upstream revision declares `MIT (c) foxmanhwa` in its README and MIT in package metadata.

The full standard MIT license text and original attribution are included with this project.

The original author does not endorse this fork.

MyGamesThing is an independent game activity management utility and is not affiliated with third-party gaming, communication, activity-detection, or distribution platforms.
