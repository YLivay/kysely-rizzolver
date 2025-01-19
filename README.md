# Kysely Rizzolver

Complex Kysely queries, maximum rizz, type-safe every time.

## Overview

Kysely Rizzolver is a utility library for building complex, type-safe queries.

There are already a bunch of [awesome tools](https://github.com/kysely-org/awesome-kysely) for working with Kysely out there, but none strike the balance I'm looking for:
- [kysely-orm](https://github.com/seeeden/kysely-orm) is a full-fledged ORM for
  Kysely. It's a really cool project, but like all ORMs it works until it
  doesn't. If you need fine control over your queries, it gets very cumbersome.
- [kysely-mapper](https://github.com/jtlapp/kysely-mapper) is a bit more
  lightweight than an ORM, but it still wraps Kysely with a "hatch" to an
  underlying Kysely instance. It is also quite verbose and rigid in my opinion.

Kysely Rizzolver in constast, works *with* Kysely. It does not replace, wrap,
abstract or hide it and can be incrementally added to an existing Kysely
project.

## Installation

You can install it via npm:

```sh
npm install kysely-rizzolver
```

## Usage

### Creating a KyselyRizzolver

`KyselyRizzolver` is the heart of Kysely Rizzolver. It is a definition of the table names and columns in your database.

```typescript
import { KyselyRizzolver } from 'kysely-rizzolver';

const rizzolver = KyselyRizzolver.builder()
    .table('user', ['id', 'name', 'email'] as const)
    .table('post', ['id', 'title', 'content', 'authorId'] as const)
    .build();
```

### Creating a Selector

A `Selector` makes it easier to build select expressions for a table in a type-safe way. It can process the results of queries into Kysely's `Selectable` instances.

```typescript
import { newSelector } from 'kysely-rizzolver';
import { Kysely } from 'kysely';

// Assuming you have a Kysely instance
const db = new Kysely<DB>();

const selector = newSelector(db, 'user', 'u');
const data = await db.selectFrom(selector.selectTable).selectAll().execute();
const parsed = selector.select(data);
```

### Fetch Results

Kysely Rizzolver provides utilities to handle fetch results in a type-safe manner.

```typescript
import { newFetchOneResult, newFetchOneXResult, newFetchSomeResult } from 'kysely-rizzolver';

// Example usage
const fetchOneResult = newFetchOneResult('user', { id: 1, name: 'John Doe' });
const fetchOneXResult = newFetchOneXResult('user', { id: 1, name: 'John Doe' });
const fetchSomeResult = newFetchSomeResult('user', [{ id: 1, name: 'John Doe' }, { id: 2, name: 'Jane Doe' }]);
```

## Contributing

Contributions are welcome! Please follow these steps to contribute:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Make your changes.
4. Submit a pull request.

Please ensure your code adheres to the project's coding standards and includes appropriate tests.

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
