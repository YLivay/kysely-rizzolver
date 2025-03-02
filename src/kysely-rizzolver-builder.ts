import type { Simplify } from 'kysely';
import { MAX_FK_GATHER_DEPTH, type ValidFkDepth } from './fks.js';
import {
	type FkDefsBuilderCallback,
	newKyselyRizzolverFkBuilder
} from './kysely-rizzolver-fk-builder.js';
import { KyselyRizzolver, type KyselyRizzolverFKs, type TableName } from './kysely-rizzolver.js';

export type KyselyRizzolverBuilder<
	DB,
	T extends Partial<Record<TableName<DB>, readonly string[]>>,
	DefaultGatherDepth extends ValidFkDepth = typeof MAX_FK_GATHER_DEPTH
> = T extends Record<TableName<DB>, readonly string[]>
	? _KyselyRizzolverBuilder_Valid<DB, T, DefaultGatherDepth>
	: _KyselyRizzolverBuilder_InProgress<DB, T, DefaultGatherDepth>;

type _KyselyRizzolverBuilder_Valid<
	DB,
	T extends Record<TableName<DB>, readonly string[]>,
	DefaultGatherDepth extends ValidFkDepth = typeof MAX_FK_GATHER_DEPTH
> = {
	defaultGatherDepth<NewDepth extends ValidFkDepth>(
		depth: NewDepth
	): _KyselyRizzolverBuilder_Valid<DB, T, NewDepth>;
	build<FKDefs extends KyselyRizzolverFKs<DB>>(
		fkBuilderCb: FkDefsBuilderCallback<DB, FKDefs>
	): KyselyRizzolver<DB, T, Simplify<FKDefs>, DefaultGatherDepth>;
	build(): KyselyRizzolver<DB, T, {}, DefaultGatherDepth>;
};

type _KyselyRizzolverBuilder_InProgress<
	DB,
	T extends Partial<Record<TableName<DB>, readonly string[]>>,
	DefaultGatherDepth extends ValidFkDepth = typeof MAX_FK_GATHER_DEPTH
> = {
	table<K extends TableName<DB>, U extends readonly (keyof DB[K])[]>(
		name: K,
		columns: U &
			([keyof DB[K]] extends [U[number]]
				? unknown
				: `Missing key: ${Exclude<keyof DB[K] & string, U[number]>}`)
	): KyselyRizzolverBuilder<DB, T & { [key in K]: U }, DefaultGatherDepth>;
};

export function newKyselyRizzolverBuilder<
	DB,
	TableToColumns extends Partial<Record<TableName<DB>, readonly string[]>>,
	DefaultGatherDepth extends ValidFkDepth = typeof MAX_FK_GATHER_DEPTH
>(tableToColumns: TableToColumns, defaultGatherDepth?: DefaultGatherDepth) {
	return {
		table<K extends TableName<DB>, U extends readonly (keyof DB[K])[]>(
			table: K,
			columns: U &
				([keyof DB[K]] extends [U[number]]
					? unknown
					: `Missing key: ${Exclude<keyof DB[K] & string, U[number]>}`)
		) {
			return newKyselyRizzolverBuilder<DB, TableToColumns & { [key in K]: typeof columns }>({
				...tableToColumns,
				[table]: columns
			}) as any;
		},

		defaultGatherDepth<NextDepth extends ValidFkDepth>(depth: NextDepth) {
			return newKyselyRizzolverBuilder<DB, TableToColumns, NextDepth>(tableToColumns, depth);
		},

		build<FKDefs extends KyselyRizzolverFKs<DB>>(cb?: FkDefsBuilderCallback<DB, FKDefs>) {
			const defs = cb?.(newKyselyRizzolverFkBuilder<DB>({}));
			return new KyselyRizzolver(tableToColumns, defs ?? {}, defaultGatherDepth);
		}
	} as unknown as KyselyRizzolverBuilder<DB, TableToColumns>;
}
