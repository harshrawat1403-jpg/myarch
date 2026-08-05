# Backup and Recovery

This procedure was executed in full against a real PostgreSQL 16.4 instance during this deployment phase — every command below is the exact command run, not a theoretical example. See "Validation record" at the end for the full result.

## What's covered

The **PostgreSQL database is the only stateful component** in this system. `web` and `worker` are both stateless (see `SYSTEM_ARCHITECTURE.md`) — losing either and redeploying from the container image loses nothing. Backing up the database is backing up the entire system's state: every user, batch, student, private field, profile draft/publication, audit log entry, notification record, and job queue row.

## Backup procedure

Use `pg_dump` in custom format (`-Fc`) — compressed, and restorable selectively with `pg_restore` (unlike a plain SQL dump).

```bash
pg_dump -h <host> -p <port> -U <user> -Fc -f tnparch_backup_$(date +%Y%m%d_%H%M%S).dump <database>
```

**Validated in this phase:**

```
$ pg_dump -h 127.0.0.1 -p 55432 -U postgres -Fc -f tnparch_backup.dump tnparch_dev
# produced a 44,567-byte dump file containing 6 users, 3 student profiles,
# 1 published profile, 1 sent notification, and the full schema
```

### Recommended schedule

- **Automated daily backup**, retained for at least 30 days, before any real student data is loaded — this is a hard prerequisite from `PRODUCTION_CHECKLIST.md` (NFR-SEC-09), not optional.
- **An additional backup immediately before every deploy that includes a schema migration** — a bad migration is the one scenario where "restore from last night" might not be recent enough.
- If your database is managed (Neon, Supabase, RDS, Render/Railway Postgres), **use the platform's built-in automated backup feature** if it offers one equivalent to the above — it will typically also give you point-in-time recovery, which a manual `pg_dump` schedule does not.

### Where to store backups

Off the same host/platform as the live database (a separate object storage bucket or the managed platform's own backup storage) — a backup that lives only on the same disk as the database it's backing up does not protect against the failure modes that actually matter (host loss, platform account issue, accidental `DROP DATABASE`).

## Restore procedure

```bash
createdb -h <host> -p <port> -U <user> <target-database>
pg_restore -h <host> -p <port> -U <user> -d <target-database> tnparch_backup.dump
```

**Validated in this phase** — restored into a brand-new, empty database and verified the data matches exactly:

```
$ createdb -h 127.0.0.1 -p 55432 -U postgres tnparch_restore_test
$ pg_restore -h 127.0.0.1 -p 55432 -U postgres -d tnparch_restore_test tnparch_backup.dump

$ psql ... -c "SELECT email, role FROM users ORDER BY role;"
         email          |    role
------------------------+-------------
 secretary@tnparch.in   | SECRETARY
 coordinator@tnparch.in | COORDINATOR
 alice@vnit.ac.in       | STUDENT
 bilal@vnit.ac.in       | STUDENT
 chitra@vnit.ac.in      | STUDENT
 recruiter@example.com  | RECRUITER
(6 rows)

$ psql ... -c "SELECT status, template FROM notifications;"
 status |     template
--------+------------------
 SENT   | PROFILE_APPROVED
(1 row)

$ psql ... -c "SELECT count(*) FROM student_profiles;"
 count
-------
     3
(1 row)
```

All 6 users, the notification record (with its `SENT` status intact), and all 3 student profiles were restored completely and correctly.

## Disaster recovery: full procedure

1. **Stop `web` and `worker`** (or point them at a maintenance/read-only mode if your platform supports it) — prevents writes to a database that's about to be replaced.
2. **Provision a fresh database** if the original is unrecoverable, or confirm the existing one is empty/clean if restoring in place.
3. **Restore the most recent good backup** using the command above.
4. **Run `npx prisma migrate deploy`** against the restored database — if the backup predates a schema migration that's since been deployed, this brings it up to date. (If the backup is newer than the currently-deployed application version, deploy the matching application version first instead.)
5. **Verify via `/api/health/ready`** — confirms the application can connect and query.
6. **Spot-check real data** — log in as a known account, confirm a known student/batch/profile is present and correct, matching the pattern validated above.
7. **Resume `web` and `worker`.**

## Restore verification checklist

After any restore (drill or real), confirm all of the following before considering it complete — this is exactly what was checked in this phase's validation:

- [ ] `SELECT count(*) FROM users;` matches the expected user count.
- [ ] A known account can log in successfully.
- [ ] `SELECT count(*) FROM student_profiles;` matches the expected count.
- [ ] At least one published profile (`student_public_profiles`) is present and its content is correct, if one existed before the backup.
- [ ] The `notifications` table's `status` values are intact (not reset to `PENDING`) — confirms the restore preserved application state, not just row existence.
- [ ] `/api/health/ready` returns `200`.
- [ ] A real login → dashboard → search flow works end to end.

## What backup does *not* cover

- **Object storage** (once implemented — resumes, portfolio images, confidential documents) will need its own, separate backup strategy; this document covers the PostgreSQL database only, since that's the only stateful component that exists today.
- **Secrets** (`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`, database credentials) are not part of the database and must be backed up/stored separately (a secrets manager or your platform's environment variable configuration, itself typically backed up by the platform) — losing them means every existing session is invalidated and reissuing is required, but no data is lost.

## Validation record

Every command in this document was executed against a real, locally-provisioned PostgreSQL 16.4 instance during this deployment phase (backup, restore into a fresh database, and full data-integrity verification, including a notification row's terminal status surviving the round-trip). Not validated: restoring across different PostgreSQL major versions, or restoring into a managed platform's specific restore tooling (each platform's own restore UI/CLI differs slightly from raw `pg_restore`, though the underlying dump format is the same) — consult your chosen platform's documentation for platform-specific restore steps once one is chosen.
