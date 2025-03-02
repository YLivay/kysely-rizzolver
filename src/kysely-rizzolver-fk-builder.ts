import type { KyselyRizzolverFKs, TableName } from './kysely-rizzolver.js';
import { NumericFields } from './type-helpers.js';

export type FkDefsBuilderCallback<DB, T> = (builder: KyselyRizzolverFkBuilder<DB, {}>) => T;

export type KyselyRizzolverFkBuilder<DB, FKDefs extends KyselyRizzolverFKs<DB> = {}> = {
	add<
		FromTable extends TableName<DB>,
		FromColumn extends Exclude<NumericFields<DB[FromTable]> & string, 'id'>,
		ToTable extends TableName<DB>,
		ToColumn extends NumericFields<DB[ToTable]> & string,
		FkName extends string,
		Nullable extends boolean = false
	>(
		fromTable: FromTable,
		fromColumn: FromColumn,
		toTable: ToTable,
		toColumn: ToColumn,
		fkName: FkName,
		nullable?: Nullable
	): KyselyRizzolverFkBuilder<
		DB,
		FKDefsAddEntry<DB, FKDefs, FromTable, FromColumn, ToTable, ToColumn, FkName, Nullable>
	>;

	build(): FKDefs;
};

type FKDefsAddEntry<
	DB,
	FKDefs extends KyselyRizzolverFKs<DB>,
	FromTable extends TableName<DB>,
	FromColumn extends string,
	ToTable extends TableName<DB>,
	ToColumn extends string,
	FkName extends string,
	Nullable extends boolean
> = FKDefs & {
	[K in FromTable]: {
		[N in FkName]: FKDefsEntry<DB, FromColumn, ToTable, ToColumn, Nullable>;
	};
};

export type FKDefsEntry<
	DB,
	FromColumn extends string,
	ToTable extends TableName<DB>,
	ToColumn extends string,
	Nullable extends boolean
> = {
	myColumn: FromColumn;
	otherTable: ToTable;
	otherColumn: ToColumn;
	isNullable: Nullable;
};

export function newKyselyRizzolverFkBuilder<DB, FKDefs extends KyselyRizzolverFKs<DB> = {}>(
	fkDefs: FKDefs
): KyselyRizzolverFkBuilder<DB, FKDefs> {
	return {
		add<
			FromTable extends TableName<DB>,
			FromColumn extends Exclude<NumericFields<DB[FromTable]> & string, 'id'>,
			ToTable extends TableName<DB>,
			ToColumn extends NumericFields<DB[ToTable]> & string,
			FkName extends string,
			Nullable extends boolean = false
		>(
			fromTable: FromTable,
			fromColumn: FromColumn,
			toTable: ToTable,
			toColumn: ToColumn,
			fkName: FkName,
			nullable?: Nullable
		) {
			const defsForTable = (fkDefs[fromTable] ?? {}) as NonNullable<FKDefs[FromTable]>;
			const fkEntry = {
				myColumn: fromColumn,
				otherTable: toTable,
				otherColumn: toColumn,
				isNullable: nullable ?? false
			} as FKDefsEntry<DB, FromColumn, ToTable, ToColumn, Nullable>;

			defsForTable[fkName] = fkEntry;
			fkDefs[fromTable] = defsForTable;

			return newKyselyRizzolverFkBuilder<DB, any>(fkDefs);
		},

		build() {
			return fkDefs;
		}
	};
}
