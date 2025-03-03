import { Selectable } from 'kysely';
import {
	assertIsGatherOneResult,
	assertIsGatherOneXResult,
	assertIsGatherSomeResult,
	type FkGatherOneResult,
	type FkGatherOneXResult,
	type FkGatherSomeResult,
	isGatherOneResult,
	isGatherOneXResult,
	isGatherSomeResult,
	newGatherOneResult,
	newGatherOneXResult,
	newGatherSomeResult
} from './fk-gather-result.js';
import {
	newGatheredModelObj,
	type DBWithFk,
	type ModelFkExtractSelectable,
	type ModelFkInstance,
	type OmitFks,
	type ValidFkDepth
} from './fks.js';
import type { KyselyRizzolverFKs, TableName } from './kysely-rizzolver.js';
import { type ModelCollection } from './model-collection.js';

/**
 * A {@link FkGatherResultFactory} exposes variants of gather-related functions, but
 * with the `DB` type parameter already set.
 *
 * This makes it less verbose to work with gather results in a type-safe way.
 */
export type FkGatherResultFactory<DB, FKDefs extends KyselyRizzolverFKs<DB>> = ReturnType<
	typeof newFkGatherResultFactory<DB, FKDefs>
>;

export function newFkGatherResultFactory<DB, FKDefs extends KyselyRizzolverFKs<DB>>() {
	type DBFk = DBWithFk<DB, FKDefs>;

	return {
		/**
		 * Creates a new {@link GatherOneResult} instance.
		 */
		newGatherOne<Table extends TableName<DBFk>, Depth extends ValidFkDepth>(
			table: Table,
			depth: Depth,
			result: ModelFkInstance<DBFk, Table, Depth> | undefined,
			models?: ModelCollection<DB>
		) {
			return newGatherOneResult<DBFk, Table, Depth>(
				table,
				depth,
				result,
				models as ModelCollection<any>
			);
		},

		/**
		 * Creates a new {@link GatherOneXResult} instance.
		 *
		 * Note: it may be counterintuitive, but this function accepts `undefined` as
		 * input. I found it is way more convenient to assert the type once in this
		 * funciton rather than in every caller.
		 */
		newGatherOneX<Table extends TableName<DBFk>, Depth extends ValidFkDepth>(
			table: Table,
			depth: Depth,
			result: ModelFkInstance<DBFk, Table, Depth> | undefined,
			models?: ModelCollection<DB>
		) {
			return newGatherOneXResult<DBFk, Table, Depth>(
				table,
				depth,
				result,
				models as ModelCollection<any>
			);
		},

		/**
		 * Creates a new {@link GatherSomeResult} instance.
		 */
		newGatherSome<Table extends TableName<DBFk>, Depth extends ValidFkDepth>(
			table: Table,
			depth: Depth,
			result: ModelFkInstance<DBFk, Table, Depth>[],
			models?: ModelCollection<DB>
		) {
			return newGatherSomeResult<DBFk, Table, Depth>(
				table,
				depth,
				result,
				models as ModelCollection<any>
			);
		},

		/**
		 * Checks if a {@link GatherResult} is a {@link GatherOneResult}.
		 */
		isGatherOne<Table extends TableName<DBFk>, Depth extends ValidFkDepth>(
			table: Table,
			depth: Depth,
			result: unknown
		): result is FkGatherOneResult<DBFk, Table, Depth> {
			return isGatherOneResult(result) && result.table === table && result.depth === depth;
		},

		/**
		 * Checks if a {@link GatherResult} is a {@link GatherOneXResult}.
		 */
		isGatherOneX<Table extends TableName<DBFk>, Depth extends ValidFkDepth>(
			table: Table,
			depth: Depth,
			result: unknown
		): result is FkGatherOneXResult<DBFk, Table, Depth> {
			return isGatherOneXResult(result) && result.table === table && result.depth === depth;
		},

		/**
		 * Checks if a {@link GatherResult} is a {@link GatherSomeResult}.
		 */
		isGatherSome<Table extends TableName<DBFk>, Depth extends ValidFkDepth>(
			table: Table,
			depth: Depth,
			result: unknown
		): result is FkGatherSomeResult<DBFk, Table, Depth> {
			return isGatherSomeResult(result) && result.table === table && result.depth === depth;
		},

		/**
		 * Asserts that a {@link GatherResult} is a {@link GatherOneResult}.
		 */
		assertIsGatherOne<Table extends TableName<DBFk>, Depth extends ValidFkDepth>(
			table: Table,
			depth: Depth,
			result: unknown
		): asserts result is FkGatherOneResult<DBFk, Table, Depth> {
			assertIsGatherOneResult(result);

			if (result.table !== table) {
				throw new Error(`Expected a gatherOne result for table ${table}`);
			}

			if (result.depth !== depth) {
				throw new Error(`Expected a gatherOne result for table ${table} of depth ${depth}`);
			}
		},

		/**
		 * Asserts that a {@link GatherResult} is a {@link GatherOneXResult}.
		 */
		assertIsGatherOneX<Table extends TableName<DBFk>, Depth extends ValidFkDepth>(
			table: Table,
			depth: Depth,
			result: unknown
		): asserts result is FkGatherOneXResult<DBFk, Table, Depth> {
			assertIsGatherOneXResult(result);

			if (result.table !== table) {
				throw new Error(`Expected a gatherOne result with a non-null value for table ${table}`);
			}

			if (result.depth !== depth) {
				throw new Error(
					`Expected a gatherOne result with a non-null value for table ${table} of depth ${depth}`
				);
			}
		},

		/**
		 * Asserts that a {@link GatherResult} is a {@link GatherSomeResult}.
		 */
		assertIsGatherSome<Table extends TableName<DBFk>, Depth extends ValidFkDepth>(
			table: Table,
			depth: Depth,
			result: unknown
		): asserts result is FkGatherSomeResult<DBFk, Table, Depth> {
			assertIsGatherSomeResult(result);

			if (result.table !== table) {
				throw new Error(`Expected a gatherSome result for table ${table}`);
			}

			if (result.depth !== depth) {
				throw new Error(`Expected a gatherSome result for table ${table} of depth ${depth}`);
			}
		},

		newModelObj<
			Table extends TableName<DBFk>,
			Depth extends ValidFkDepth,
			Model extends Omit<ModelFkInstance<DBFk, Table, Depth>, '__fkDepth' | '__table'>
		>(table: Table, depth: Depth, model: Model) {
			return newGatheredModelObj<DBFk, Table, Depth, Model>(table, depth, model);
		},

		/**
		 * Extracts a Kysely {@link Selectable} instance from a gathered model.
		 *
		 * This is useful because Selectables are the lowest common denominators
		 * for any representation of a DB model, so this allows you to convert
		 * any gather result to anything else that might build upon Kysely.
		 *
		 * For example, to convert a gather result to a fetch result:
		 * ```
		 * const userGather: FkGatherOneXResult<DB, 'user'>;
		 * const userModel = userGather.result;
		 * const userSelectable = rizzolver.gatherObjs.toSelectable(userModel);
		 * ```
		 *
		 */
		toSelectable<Model>(model: Model): ModelFkExtractSelectable<DB, Model> {
			if (model === undefined || model === null) {
				return model as any;
			}

			const selectable = {
				...model
			};
			delete (selectable as any)['__fkDepth'];
			delete (selectable as any)['__table'];

			return selectable as any;
		}
	};
}
