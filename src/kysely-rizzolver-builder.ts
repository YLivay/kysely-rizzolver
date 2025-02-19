import type { Simplify } from 'kysely';
import { MAX_FK_GATHER_DEPTH, type ValidFkDepth } from './fks.js';
import {
	type FkDefsBuilderCallback,
	newKyselyRizzolverFkBuilder
} from './kysely-rizzolver-fk-builder.js';
import { KyselyRizzolver, type KyselyRizzolverFKs } from './kysely-rizzolver.js';

export type KyselyRizzolverBuilder<
	DB,
	T extends Partial<Record<keyof DB & string, readonly string[]>>,
	DefaultGatherDepth extends ValidFkDepth = typeof MAX_FK_GATHER_DEPTH
> = T extends Record<keyof DB & string, readonly string[]>
	? _KyselyRizzolverBuilder_Valid<DB, T, DefaultGatherDepth>
	: _KyselyRizzolverBuilder_InProgress<DB, T, DefaultGatherDepth>;

type _KyselyRizzolverBuilder_Valid<
	DB,
	T extends Record<keyof DB & string, readonly string[]>,
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
	T extends Partial<Record<keyof DB & string, readonly string[]>>,
	DefaultGatherDepth extends ValidFkDepth = typeof MAX_FK_GATHER_DEPTH
> = {
	table<K extends keyof DB & string, U extends readonly (keyof DB[K])[]>(
		name: K,
		fields: U &
			([keyof DB[K]] extends [U[number]]
				? unknown
				: `Missing key: ${Exclude<keyof DB[K] & string, U[number]>}`)
	): KyselyRizzolverBuilder<DB, T & { [key in K]: U }, DefaultGatherDepth>;
};

export function newKyselyRizzolverBuilder<
	DB,
	T extends Partial<Record<keyof DB & string, readonly string[]>>,
	DefaultGatherDepth extends ValidFkDepth = typeof MAX_FK_GATHER_DEPTH
>(fields: T, defaultGatherDepth?: DefaultGatherDepth) {
	return {
		table<K extends keyof DB & string, U extends readonly (keyof DB[K])[]>(
			tableName: K,
			tableFields: U &
				([keyof DB[K]] extends [U[number]]
					? unknown
					: `Missing key: ${Exclude<keyof DB[K] & string, U[number]>}`)
		) {
			return newKyselyRizzolverBuilder<DB, T & { [key in K]: typeof tableFields }>({
				...fields,
				[tableName]: tableFields
			}) as any;
		},

		defaultGatherDepth<NextDepth extends ValidFkDepth>(depth: NextDepth) {
			return newKyselyRizzolverBuilder<DB, T, NextDepth>(fields, depth);
		},

		build<FKDefs extends KyselyRizzolverFKs<DB>>(cb?: FkDefsBuilderCallback<DB, FKDefs>) {
			const defs = cb?.(newKyselyRizzolverFkBuilder<DB>({}));
			return new KyselyRizzolver(fields, defs ?? {}, defaultGatherDepth);
		}
	} as unknown as KyselyRizzolverBuilder<DB, T>;
}
