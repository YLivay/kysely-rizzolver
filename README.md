# Kysely Rizzolver

Complex Kysely queries, maximum rizz, type-safe every time.

## Overview

Kysely Rizzolver is a utility library for building complex, type-safe queries
across multiple tables with Kysely.

There are already a bunch of [awesome tools](https://github.com/kysely-org/awesome-kysely)
for working with Kysely out
there, but none strike the balance I'm looking for:
- [kysely-orm](https://github.com/seeden/kysely-orm) is a full-fledged ORM. It's
  a really cool project, but like all ORMs it works until it doesn't. If you
  need fine control over your queries, it gets very cumbersome.
- [kysely-mapper](https://github.com/jtlapp/kysely-mapper) is a bit more
  lightweight than an ORM, but it's focus is still on mapping tables to other
  classes. It doesn't offer much value in the way of writing complex queries, or
  working with multiple tables.

Kysely Rizzolver in constast, works *inside* Kysely. It does not replace, wrap,
abstract or hide it and can be incrementally added to an existing Kysely
project.

## Installation

You can install it via npm:

```sh
npm install kysely-rizzolver
```

## Usage

### Creating a KyselyRizzolver

`KyselyRizzolver` is the heart of Kysely Rizzolver. It is a definition of the
table names and columns in your database.

```typescript
import { KyselyRizzolver } from 'kysely-rizzolver';

const rizzolver = KyselyRizzolver.builderNoSchema()
    .table('user', ['id', 'name', 'email'] as const)
    .table('post', ['id', 'title', 'content', 'authorId'] as const)
    .build();
```

or if you have a schema, for example from
[kysely-codegen](https://github.com/RobinBlomberg/kysely-codegen), you can use
it like this:

```typescript
import { KyselyRizzolver } from 'kysely-rizzolver';
import { DB } from './db-types-generated';

const rizzolver = KyselyRizzolver.builderForSchema<DB>()
    .table('user', ['id', 'name', 'email'] as const)
    .table('post', ['id', 'title', 'content', 'authorId'] as const)
    .build();
```

You will get compile time errors if the fields don't actually match the schema.

### Creating a Query Builder

```typescript
import { rizzolver } from './rizzolver';

const qb = await rizzolver
    .newQueryBuilder()
    .add('session', 's')
    .add('user', 'u')
    .add('image', 'i');
```

The query builder exposes expressions to use in queries. For example:

- `qb.table('u')` returns `'user as u'`.
- `qb.fieldsOf('u')` returns `['u.id as _u_id', 'u.name as _u_name', 'u.email as _u_email']`.
- `qb.field('u.name').value` returns `'_u_name'`.
- `qb.field('u.name').from('a')` returns `'a._u_name'`.

### Using a Query Builder

For example, we can use the query builder above to fetch for each session the
user it is associated with and their avatar image if it exists:

```typescript
const rows = await db
    .selectFrom(qb.table('s'))
    .innerJoin(
        (eb) =>
            eb
                .selectFrom(qb.table('u'))
                .leftJoin(qb.table('i'), 'u.avatar_image_id', 'i.id')
                .select(qb.fieldsOf('u', 'i'))
                .as('a'),
        (join) => join.onRef('s.user_id', '=', `'a._u_id'`)
    )
    .select(qb.fieldsOf('s'))
    .selectAll('a')
    .where('s.id', '=', sessionId)
    .execute();
```

Note that Kysely remains as the main driver of the query. This makes it easy to
incrementally switch to Kysely Rizzolver.

### Parsing the Results

The fetched rows can be parsed into type-safe objects using the same query
builder that was used to create the query, as such:

```typescript
const results = await qb.run(rows);

// To get the user model
const first = results.first?.selectors.u;

// To get the first user's avatar image url
const avatarUrl = results.first?.selectors.i?.url;

// To collect all avatar image urls
const avatarUrls = results.rows.map((row) => row.selectors.i?.url);
```

To make it easier to work with the results and pass them around, accept them as
parameters in other functions, etc., you can further process the results into a
`FetchResult`:

```typescript
// Fetches the first user, or returns undefined if there are no results.
const maybeOneUser = results.newFetchOneResult('u');

// Fetches the first user, and throws an error if there are no results.
const oneUser = results.newFetchOneXResult('u');

// Fetches all users. May return an empty array if there are no results.
const someUsers = results.newFetchSomeResult('u');
```

Play around with the query builder and the results to get a feel for how they
work.

Everything is type-safe end to end.

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE)
file for details.
