import { KyselyRizzolverFKs } from './kysely-rizzolver.js';
import { NumericFields } from './type-helpers.js';

export type FkDefsBuilderCallback<DB, T> = (builder: KyselyRizzolverFkBuilder<DB, {}>) => T;

export type KyselyRizzolverFkBuilder<DB, FKDefs extends KyselyRizzolverFKs<DB> = {}> = {
	add<
		FromTable extends keyof DB & string,
		FromField extends Exclude<NumericFields<DB[FromTable]> & string, 'id'>,
		ToTable extends keyof DB & string,
		ToField extends NumericFields<DB[ToTable]> & string,
		FkName extends string,
		Nullable extends boolean = false
	>(
		fromTable: FromTable,
		fromField: FromField,
		toTable: ToTable,
		toField: ToField,
		fkName: FkName,
		nullable?: Nullable
	): KyselyRizzolverFkBuilder<
		DB,
		FKDefsAddEntry<DB, FKDefs, FromTable, FromField, ToTable, ToField, FkName, Nullable>
	>;

	build(): FKDefs;
};

type FKDefsAddEntry<
	DB,
	FKDefs extends KyselyRizzolverFKs<DB>,
	FromTable extends keyof DB & string,
	FromField extends string,
	ToTable extends keyof DB & string,
	ToField extends string,
	FkName extends string,
	Nullable extends boolean
> = FKDefs & {
	[K in FromTable]: {
		[N in FkName]: FKDefsEntry<DB, FromField, ToTable, ToField, Nullable>;
	};
};

export type FKDefsEntry<
	DB,
	FromField extends string,
	ToTable extends keyof DB & string,
	ToField extends string,
	Nullable extends boolean
> = {
	myField: FromField;
	otherTable: ToTable;
	otherField: ToField;
	isNullable: Nullable;
};

export function newKyselyRizzolverFkBuilder<DB, FKDefs extends KyselyRizzolverFKs<DB> = {}>(
	fkDefs: FKDefs
): KyselyRizzolverFkBuilder<DB, FKDefs> {
	return {
		add<
			FromTable extends keyof DB & string,
			FromField extends Exclude<NumericFields<DB[FromTable]> & string, 'id'>,
			ToTable extends keyof DB & string,
			ToField extends NumericFields<DB[ToTable]> & string,
			FkName extends string,
			Nullable extends boolean = false
		>(
			fromTable: FromTable,
			fromField: FromField,
			toTable: ToTable,
			toField: ToField,
			fkName: FkName,
			nullable?: Nullable
		) {
			const defsForTable = (fkDefs[fromTable] ?? {}) as NonNullable<FKDefs[FromTable]>;
			const fkEntry = {
				myField: fromField,
				otherTable: toTable,
				otherField: toField,
				isNullable: nullable ?? false
			} as FKDefsEntry<DB, FromField, ToTable, ToField, Nullable>;

			defsForTable[fkName] = fkEntry;
			fkDefs[fromTable] = defsForTable;

			return newKyselyRizzolverFkBuilder<DB, any>(fkDefs);
		},

		build() {
			return fkDefs;
		}
	};
}
