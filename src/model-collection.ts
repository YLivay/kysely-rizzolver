import type { Selectable } from 'kysely';
import type { QueryBuilder } from './query-builder.js';

/**
 * A {@link ModelCollection} is a collection of {@link Selectable} instances,
 * grouped by their table name and keyed by their id.
 *
 * This type purposefully discards specific type information to make it simpler
 * to create and pass it around without worrying about type compatibility and
 * casting.
 *
 * It does not preserve information on which tables are present in the
 * collection, or which fields on their {@link Selectable}s have been gathered.
 *
 * If you need to preserve this information, you should just pass the result of
 * the {@link QueryBuilder.run} method where needed. However, doing this is not
 * recommended, as your types can easily become too nested to the point where
 * TypeScript can't infer them correctly.
 */
export type ModelCollection<DB> = {
	add<Table extends keyof DB & string>(
		table: Table,
		selectable?: Selectable<DB[Table]>
	): ModelCollection<DB>;
	get collection(): Data<DB>;
};

export function newModelCollection<DB>(init: Data<DB> = {}) {
	const collection: Data<DB> = { ...init };

	return {
		add<Table extends keyof DB & string>(table: Table, selectable?: Selectable<DB[Table]>) {
			if (
				!selectable ||
				!('id' in selectable) ||
				!selectable.id ||
				typeof selectable.id !== 'number'
			) {
				return this;
			}

			if (!(table in collection)) {
				collection[table] = {};
			}

			collection[table]![selectable.id] = selectable;
			return this;
		},

		get collection() {
			return collection;
		}
	} as ModelCollection<DB>;
}

type Data<DB> = {
	[M in keyof DB & string]?: Partial<Record<number, Selectable<DB[M]>>>;
};
