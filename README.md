# FilaFacil Logistica

A local terminal application for managing package collection requests. Collection data is stored in a SQLite file on your computer and persists between runs. There is no cloud synchronization.

## Requirements

- Node.js 24 or newer
- npm

The application is JavaScript with ES modules. Prisma 7 generates a TypeScript client; `tsx` runs it without requiring application code to be written in TypeScript. The SQLite adapter uses a native dependency; an environment without a prebuilt binary may require local C++ build tools.

## Install and run

From the project directory:

```sh
npm ci
npm run db:setup
npm start
```

`db:setup` creates the data directory, generates the Prisma client, and applies the checked-in migrations. Repeating it does not erase existing collections. Starting the application does not run migrations or reset data.

The default database is `data/filafacil.db`. To use another local database, set `DATABASE_URL` to `file:` followed by an absolute filesystem path. Use the same value for setup and execution:

```sh
DATABASE_URL='file:/absolute/path/collections.db' npm run db:setup
DATABASE_URL='file:/absolute/path/collections.db' npm start
```

No credentials or `.env` file are required. Configuration comes from the environment; `.env` files are not loaded automatically.

## Terminal operations

The menu and messages are in Portuguese. Select the numbered options to:

1. Register a collection: enter customer name, address, positive integer package count, and priority.
2. List collections in ascending ID order.
3. Filter by one status, one priority, or a customer-name substring.
4. Update a collection's status by ID.
5. Permanently delete a collection by ID after confirming with `s`. Enter `n` to cancel.
0. Exit.

Priority choices are **Baixa**, **Normal**, and **Alta**. Status choices are **Pendente**, **Em andamento**, **Concluída**, and **Cancelada**. Every new collection starts pending. Any status change is permitted, including reopening a completed or canceled collection.

Names and addresses are trimmed and cannot be blank. Package counts and IDs must be integers from 1 to 2147483647. IDs and creation timestamps are generated automatically. Dates are displayed in ISO 8601 UTC.

Name searches match any part of a name without distinguishing uppercase and lowercase letters. Accents remain significant: `ÁLVARO` finds `Álvaro`, while `alvaro` does not. Unicode normalization treats equivalent accent encodings consistently. The original customer name is retained for display; an internal normalized field supports database filtering. Characters such as `%` and `_` are treated as literal name text. The repository narrows SQL LIKE matches to enforce this behavior.

Empty results and nonexistent IDs produce messages. Invalid input returns to the main menu without changing records. Deletion is irreversible. An invalid confirmation cancels deletion. Database operation failures never produce a success message; initialization failures exit with a setup instruction and a nonzero exit status. Exit with option 0, Ctrl+C, or end of input.

## Architecture

The controller reads terminal input, converts numbers, and displays results. The service validates data and applies collection rules. The repository contains the ORM operations, including ordered reads, filters, and existence checks. Database configuration owns the connection lifecycle.

There is one business table, `collections`. Prisma also maintains its migration-history table. The business fields are ID, customer name, address, package count, priority, status, and creation time, plus the internal name-search field. Migration constraints reinforce required text, positive package counts, and permitted status/priority values. Application CRUD uses Prisma, not handwritten SQL.

The dependency overrides pin patched transitive versions of `deepmerge-ts` and `mysql2` while retaining Prisma 7.

## Tests

```sh
npm test
```

Tests use `node:test`, generated Prisma client code, and temporary SQLite databases outside the application's data directory. Run `npm run db:setup` after installation to generate the client before testing. Tests apply the same migrations as the application. They cover validation, ordering, filtering, status changes, deletion, persistence across processes, terminal input and confirmation, initialization and operation failures, and repeatable setup.

The local database, generated client, and dependencies are ignored by Git. Keep database files private; they may contain customer information.

## References

- [Prisma with SQLite](https://docs.prisma.io/docs/prisma-orm/quickstart/sqlite)
- [Prisma CRUD](https://www.prisma.io/docs/orm/v7/prisma-client/queries/crud)
- [SQLite types](https://www.sqlite.org/datatype3.html)
- [Node.js readline](https://nodejs.org/api/readline.html)
- [Node.js test runner](https://nodejs.org/api/test.html)
