# Backups

Every night at ~03:30 the server runs `sandugorea-backup` (systemd timer). It copies, **encrypted**, to off-site storage:

| What | Why |
| --- | --- |
| Database snapshot (`db/`) | projects, customer logins, admin account — kept 30 days |
| Photos (`photos/`) | originals + previews; only new photos are uploaded each night. Deleted photos are kept 30 days in `deleted/` |
| Encryption keys (`keys/`) | without them the admin's authenticator setup and sign-in cookies can't be restored |
| Secrets (`config/sandugorea.env`) | admin/SMTP settings |

The last 7 database snapshots also stay on the server in `/var/backups/sandugorea`.

Encryption happens on the server (rclone *crypt*): the storage provider only sees scrambled names and contents.
The backup refuses to run against an unencrypted destination.

## One-time setup (≈ 10 minutes)

Any storage rclone supports works (Backblaze B2, Hetzner Storage Box, Google Drive, OneDrive, S3, SFTP…).
**Backblaze B2** is the simplest and cheapest: 20 GB ≈ $0.12/month.

1. Create a Backblaze account → **B2 Cloud Storage** → *Create a Bucket* (private), e.g. `sandugorea-backup`.
2. *Application Keys* → *Add a New Application Key* limited to that bucket. Note the **keyID** and **applicationKey**.
3. Pick two long random passphrases and **store them in your password manager** — without them the backup
   can never be decrypted, not even by you:
   ```bash
   openssl rand -base64 32   # passphrase 1
   openssl rand -base64 32   # passphrase 2 (salt)
   ```
4. On the server:
   ```bash
   ssh root@sandugorea.ch
   rclone config create b2 b2 account <keyID> key <applicationKey>
   rclone config create --obscure sgbackup crypt remote b2:sandugorea-backup/sandugorea \
     password '<passphrase 1>' password2 '<passphrase 2>'
   chmod 600 /root/.config/rclone/rclone.conf
   ```
5. Run the first backup now and check it:
   ```bash
   systemctl start sandugorea-backup
   journalctl -u sandugorea-backup -n 20 --no-pager
   ```

## Checking

```bash
systemctl list-timers sandugorea-backup     # next / last run
cat /var/backups/sandugorea/last-success     # time of the last good backup
journalctl -u sandugorea-backup -n 50        # log of the last runs
sandugorea-restore list                      # snapshots available off-site
```

## Restoring

Onto the same or a brand-new VPS (run `setup-server.sh` first, then recreate the two rclone remotes from step 4
with the **same passphrases**):

```bash
sandugorea-restore                                   # newest snapshot
sandugorea-restore sandugorea-20261102-033012.db.gz  # a specific day
```

It stops the app, moves the current data aside to `/var/lib/sandugorea.before-restore-<date>`, restores photos,
keys and the database, checks the database, and starts the app again.

Try a restore once after setting this up — a backup you've never restored is only a hope.
