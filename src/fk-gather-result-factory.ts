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
import type { DBWithFk, ModelFkExtractSelectable, ModelFkInstance, ValidFkDepth } from './fks.js';
import type { KyselyRizzolverFKs } from './kysely-rizzolver.js';
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
		newGatherOne<K extends keyof DBFk & string, Depth extends ValidFkDepth>(
			table: K,
			depth: Depth,
			result: ModelFkInstance<DBFk, K, Depth> | undefined,
			models?: ModelCollection<DB>
		) {
			return newGatherOneResult<DBFk, K, Depth>(
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
		newGatherOneX<K extends keyof DBFk & string, Depth extends ValidFkDepth>(
			table: K,
			depth: Depth,
			result: ModelFkInstance<DBFk, K, Depth> | undefined,
			models?: ModelCollection<DB>
		) {
			return newGatherOneXResult<DBFk, K, Depth>(
				table,
				depth,
				result,
				models as ModelCollection<any>
			);
		},

		/**
		 * Creates a new {@link GatherSomeResult} instance.
		 */
		newGatherSome<K extends keyof DBFk & string, Depth extends ValidFkDepth>(
			table: K,
			depth: Depth,
			result: ModelFkInstance<DBFk, K, Depth>[],
			models?: ModelCollection<DB>
		) {
			return newGatherSomeResult<DBFk, K, Depth>(
				table,
				depth,
				result,
				models as ModelCollection<any>
			);
		},

		/**
		 * Checks if a {@link GatherResult} is a {@link GatherOneResult}.
		 */
		isGatherOne<K extends keyof DBFk & string, Depth extends ValidFkDepth>(
			table: K,
			depth: Depth,
			result: unknown
		): result is FkGatherOneResult<DBFk, K, Depth> {
			return isGatherOneResult(result) && result.table === table && result.depth === depth;
		},

		/**
		 * Checks if a {@link GatherResult} is a {@link GatherOneXResult}.
		 */
		isGatherOneX<K extends keyof DBFk & string, Depth extends ValidFkDepth>(
			table: K,
			depth: Depth,
			result: unknown
		): result is FkGatherOneXResult<DBFk, K, Depth> {
			return isGatherOneXResult(result) && result.table === table && result.depth === depth;
		},

		/**
		 * Checks if a {@link GatherResult} is a {@link GatherSomeResult}.
		 */
		isGatherSome<K extends keyof DBFk & string, Depth extends ValidFkDepth>(
			table: K,
			depth: Depth,
			result: unknown
		): result is FkGatherSomeResult<DBFk, K, Depth> {
			return isGatherSomeResult(result) && result.table === table && result.depth === depth;
		},

		/**
		 * Asserts that a {@link GatherResult} is a {@link GatherOneResult}.
		 */
		assertIsGatherOne<K extends keyof DBFk & string, Depth extends ValidFkDepth>(
			table: K,
			depth: Depth,
			result: unknown
		): asserts result is FkGatherOneResult<DBFk, K, Depth> {
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
		assertIsGatherOneX<K extends keyof DBFk & string, Depth extends ValidFkDepth>(
			table: K,
			depth: Depth,
			result: unknown
		): asserts result is FkGatherOneXResult<DBFk, K, Depth> {
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
		assertIsGatherSome<K extends keyof DBFk & string, Depth extends ValidFkDepth>(
			table: K,
			depth: Depth,
			result: unknown
		): asserts result is FkGatherSomeResult<DBFk, K, Depth> {
			assertIsGatherSomeResult(result);

			if (result.table !== table) {
				throw new Error(`Expected a gatherSome result for table ${table}`);
			}

			if (result.depth !== depth) {
				throw new Error(`Expected a gatherSome result for table ${table} of depth ${depth}`);
			}
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
