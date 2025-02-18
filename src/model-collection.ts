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
	addCollection(collection: ModelCollection<DB>): ModelCollection<DB>;
	get(): Data<DB>;
	get<Table extends keyof DB & string>(table: Table): Record<number, Selectable<DB[Table]>>;
	get<Table extends keyof DB & string>(table: Table, id: number): Selectable<DB[Table]> | undefined;
	getX<Table extends keyof DB & string>(
		table: Table,
		id: number
	): Record<number, Selectable<DB[Table]>>;
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

		addCollection(collection: ModelCollection<DB>) {
			for (const [table, entries] of Object.entries(collection.get())) {
				for (const [id, model] of Object.entries(entries as any)) {
					this.add(table as any, model as any);
				}
			}
			return this;
		},

		get<Table extends keyof DB & string>(table?: Table, id?: number) {
			if (!table) {
				return collection;
			}

			if (!id) {
				return collection[table] ?? {};
			}

			return collection[table]?.[id];
		},

		getX<Table extends keyof DB & string>(table: Table, id: number) {
			const result = this.get(table, id);
			if (!result) {
				throw new Error(`Model not found in ModelCollection for table ${table} with id ${id}`);
			}
			return result;
		}
	} as ModelCollection<DB>;
}

type Data<DB> = {
	[M in keyof DB & string]?: Partial<Record<number, Selectable<DB[M]>>>;
};
