import { Simplify } from 'kysely';
import { KyselyRizzolver, KyselyRizzolverFKs } from './kysely-rizzolver.js';
import {
	FkDefsBuilderCallback,
	newKyselyRizzolverFkBuilder
} from './kysely-rizzolver-fk-builder.js';

export type KyselyRizzolverBuilder<
	DB,
	T extends Partial<Record<keyof DB & string, readonly string[]>>
> = T extends Record<keyof DB & string, readonly string[]>
	? _KyselyRizzolverBuilder_Valid<DB, T>
	: _KyselyRizzolverBuilder_InProgress<DB, T>;

type _KyselyRizzolverBuilder_Valid<DB, T extends Record<keyof DB & string, readonly string[]>> = {
	build<FKDefs extends KyselyRizzolverFKs<DB>>(
		fkBuilderCb: FkDefsBuilderCallback<DB, FKDefs>
	): KyselyRizzolver<DB, T, Simplify<FKDefs>>;
	build(): KyselyRizzolver<DB, T, {}>;
};

type _KyselyRizzolverBuilder_InProgress<
	DB,
	T extends Partial<Record<keyof DB & string, readonly string[]>>
> = {
	table<K extends keyof DB & string, U extends readonly (keyof DB[K])[]>(
		name: K,
		fields: U &
			([keyof DB[K]] extends [U[number]]
				? unknown
				: `Missing key: ${Exclude<keyof DB[K] & string, U[number]>}`)
	): KyselyRizzolverBuilder<DB, T & { [key in K]: U }>;
};

export function newKyselyRizzolverBuilder<
	DB,
	T extends Partial<Record<keyof DB & string, readonly string[]>>
>(fields: T) {
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
		build<FKDefs extends KyselyRizzolverFKs<DB>>(cb?: FkDefsBuilderCallback<DB, FKDefs>) {
			const defs = cb?.(newKyselyRizzolverFkBuilder<DB>({}));
			return new KyselyRizzolver(fields, defs ?? {});
		}
	} as unknown as KyselyRizzolverBuilder<DB, T>;
}
