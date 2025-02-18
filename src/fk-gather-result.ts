import type { DBWithoutFk, ModelFkInstance, ValidFkDepth } from './fks.js';
import { MAX_FK_GATHER_DEPTH } from './fks.js';
import type { ModelCollection } from './model-collection.js';

/**
 * A {@link FkGatherResult} is a result of a gather operation. It can be one of
 * three types:
 * - {@link FkGatherOneResult} - A result of a gather operation that is expected to
 *   return up to one row,
 * - {@link FkGatherOneXResult} - A result of a gather operation that is expected to
 *   return exactly one row,
 * - {@link FkGatherSomeResult} - A result of a gather operation that is expected to
 *   return any number of rows.
 */
export type FkGatherResult<
	DBFk,
	Table extends keyof DBFk & string,
	Depth extends ValidFkDepth = typeof MAX_FK_GATHER_DEPTH
> =
	| FkGatherOneResult<DBFk, Table, Depth>
	| FkGatherOneXResult<DBFk, Table, Depth>
	| FkGatherSomeResult<DBFk, Table, Depth>;

/**
 * A {@link FkGatherOneResult} is a result of a gather operation that is expected to
 * return up to one row.
 */
export type FkGatherOneResult<
	DBFk,
	Table extends keyof DBFk & string,
	Depth extends ValidFkDepth = typeof MAX_FK_GATHER_DEPTH
> = {
	gatherType: 'gatherOne';
	table: Table;
	depth: Depth;
	result: ModelFkInstance<DBFk, Table, Depth> | undefined;
	models?: ModelCollection<DBWithoutFk<DBFk>>;
	/**
	 * Returns this result as a {@link FkGatherOneXResult}.
	 *
	 * @throws If the result is null or undefined.
	 */
	asGatherOneX(): FkGatherOneXResult<DBFk, Table, Depth>;
};

/**
 * A {@link FkGatherOneXResult} is a result of a gather operation that is expected
 * to return exactly one row.
 */
export type FkGatherOneXResult<
	DBFk,
	Table extends keyof DBFk & string,
	Depth extends ValidFkDepth = typeof MAX_FK_GATHER_DEPTH
> = {
	gatherType: 'gatherOne';
	table: Table;
	depth: Depth;
	result: ModelFkInstance<DBFk, Table, Depth>;
	models?: ModelCollection<DBWithoutFk<DBFk>>;
	/**
	 * Returns self. This is a no-op, but it's here to make it possible to
	 * cast this object back to a {@link FkGatherOneXResult}.
	 */
	asGatherOneX(): FkGatherOneXResult<DBFk, Table, Depth>;
};

/**
 * A {@link FkGatherSomeResult} is a result of a gather operation that is expected
 * to return any number of rows.
 */
export type FkGatherSomeResult<
	DBFk,
	Table extends keyof DBFk & string,
	Depth extends ValidFkDepth = typeof MAX_FK_GATHER_DEPTH
> = {
	gatherType: 'gatherSome';
	table: Table;
	depth: Depth;
	result: ModelFkInstance<DBFk, Table, Depth>[];
	models?: ModelCollection<DBWithoutFk<DBFk>>;
};

/**
 * Used to type juggle between {@link FkGatherResult} and its subtypes.
 */
export type AsGatherOneResult<T extends FkGatherResult<any, string, ValidFkDepth>> =
	T extends FkGatherResult<infer DBFk, infer Table, infer D>
		? FkGatherOneResult<DBFk, Table, D>
		: never;

/**
 * Used to type juggle between {@link FkGatherResult} and its subtypes.
 */
export type AsGatherOneXResult<T extends FkGatherResult<any, string, ValidFkDepth>> =
	T extends FkGatherResult<infer DBFk, infer Table, infer D>
		? FkGatherOneXResult<DBFk, Table, D>
		: never;

/**
 * Used to type juggle between {@link FkGatherResult} and its subtypes.
 */
export type AsGatherSomeResult<T extends FkGatherResult<any, string, ValidFkDepth>> =
	T extends FkGatherResult<infer DBFk, infer Table, infer D>
		? FkGatherSomeResult<DBFk, Table, D>
		: never;

/**
 * Creates a new {@link FkGatherOneResult} instance.
 */
export function newGatherOneResult<
	DBFk,
	Table extends keyof DBFk & string,
	Depth extends ValidFkDepth
>(
	table: Table,
	depth: Depth,
	result: ModelFkInstance<DBFk, Table, Depth> | undefined,
	models?: ModelCollection<DBWithoutFk<DBFk>>
) {
	const ref = { value: null as any as FkGatherOneXResult<DBFk, Table, Depth> };

	const me: FkGatherOneResult<DBFk, Table, Depth> = {
		gatherType: 'gatherOne' as const,
		table,
		depth,
		result,
		models,
		asGatherOneX() {
			if (!me.result) {
				throw new Error('Expected a gatherOneX result');
			}

			return ref.value;
		}
	};

	ref.value = me as FkGatherOneXResult<DBFk, Table, Depth>;

	return me;
}

/**
 * Creates a new {@link FkGatherOneXResult} instance.
 *
 * Note: it may be counterintuitive, but this function accepts `undefined` as
 * input. I found it is way more convenient to assert the type once in this
 * funciton rather than in every caller.
 */
export function newGatherOneXResult<
	DBFk,
	Table extends keyof DBFk & string,
	Depth extends ValidFkDepth
>(
	table: Table,
	depth: Depth,
	result: ModelFkInstance<DBFk, Table, Depth> | undefined,
	models?: ModelCollection<DBWithoutFk<DBFk>>
) {
	if (!result) {
		throw new Error('Expected a gatherOneX result');
	}

	const ref = { value: null as any as FkGatherOneXResult<DBFk, Table, Depth> };

	const me: FkGatherOneXResult<DBFk, Table, Depth> = {
		gatherType: 'gatherOne' as const,
		table,
		depth,
		result,
		models,
		asGatherOneX() {
			return ref.value;
		}
	};

	ref.value = me;

	return me;
}

/**
 * Creates a new {@link FkGatherSomeResult} instance.
 */
export function newGatherSomeResult<
	DBFk,
	Table extends keyof DBFk & string,
	Depth extends ValidFkDepth
>(
	table: Table,
	depth: Depth,
	result: ModelFkInstance<DBFk, Table, Depth>[],
	models?: ModelCollection<DBWithoutFk<DBFk>>
) {
	return {
		gatherType: 'gatherSome' as const,
		table,
		depth,
		result,
		models
	} as FkGatherSomeResult<DBFk, Table, Depth>;
}

export function isGatherResult(result: unknown): result is FkGatherResult<any, any, ValidFkDepth> {
	return (
		!!result &&
		typeof result === 'object' &&
		'gatherType' in result &&
		!!result.gatherType &&
		typeof result.gatherType === 'string' &&
		'table' in result &&
		!!result.table &&
		typeof result.table === 'string' &&
		'depth' in result &&
		typeof result.depth === 'number' &&
		Number.isInteger(result.depth) &&
		result.depth >= 0 &&
		result.depth <= MAX_FK_GATHER_DEPTH &&
		'result' in result &&
		(result.result === undefined ||
			typeof result.result === 'object' ||
			(Array.isArray(result.result) && result.result.every((r) => !!r && typeof r === 'object')))
	);
}

/**
 * Checks if `value` is a {@link FkGatherOneResult}.
 */
export function isGatherOneResult<
	DBFk,
	Table extends keyof DBFk & string,
	Depth extends ValidFkDepth
>(
	value: FkGatherOneResult<DBFk, Table, Depth> | FkGatherOneXResult<DBFk, Table, Depth>
): value is typeof value;
export function isGatherOneResult(
	value: unknown
): value is FkGatherOneResult<any, any, ValidFkDepth>;
export function isGatherOneResult(
	value: unknown
): value is FkGatherOneResult<any, any, ValidFkDepth> {
	return isGatherResult(value) && value.gatherType === 'gatherOne' && !Array.isArray(value.result);
}

/**
 * Checks if `value` is a {@link FkGatherOneXResult}.
 */
export function isGatherOneXResult<
	DBFk,
	Table extends keyof DBFk & string,
	Depth extends ValidFkDepth
>(value: FkGatherOneResult<DBFk, Table, Depth>): value is FkGatherOneXResult<DBFk, Table, Depth>;
export function isGatherOneXResult<
	DBFk,
	Table extends keyof DBFk & string,
	Depth extends ValidFkDepth
>(value: FkGatherOneXResult<DBFk, Table, Depth>): value is typeof value;
export function isGatherOneXResult(
	value: unknown
): value is FkGatherOneXResult<any, any, ValidFkDepth>;
export function isGatherOneXResult(
	value: unknown
): value is FkGatherOneXResult<any, any, ValidFkDepth> {
	return (
		isGatherResult(value) &&
		value.gatherType === 'gatherOne' &&
		!Array.isArray(value.result) &&
		!!value.result
	);
}

/**
 * Checks if `value` is a {@link FkGatherSomeResult}.
 */
export function isGatherSomeResult<
	DBFk,
	Table extends keyof DBFk & string,
	Depth extends ValidFkDepth
>(value: FkGatherSomeResult<DBFk, Table, Depth>): value is typeof value;
export function isGatherSomeResult(
	value: unknown
): value is FkGatherSomeResult<any, any, ValidFkDepth>;
export function isGatherSomeResult(
	value: unknown
): value is FkGatherSomeResult<any, any, ValidFkDepth> {
	return isGatherResult(value) && value.gatherType === 'gatherSome' && Array.isArray(value.result);
}

/**
 * Asserts that `value` is a {@link FkGatherOneResult}.
 */
export function assertIsGatherOneResult(
	value: unknown
): asserts value is FkGatherOneResult<any, any, ValidFkDepth> {
	if (!isGatherOneResult(value)) {
		throw new Error('Expected a gatherOne result');
	}
}

/**
 * Asserts that `value` is a {@link FkGatherOneXResult}.
 */
export function assertIsGatherOneXResult(
	value: unknown
): asserts value is FkGatherOneXResult<any, any, ValidFkDepth> {
	if (!isGatherOneXResult(value)) {
		throw new Error('Expected a gatherOne result with a non-null, non undefined result');
	}
}

/**
 * Asserts that `value` is a {@link FkGatherSomeResult}.
 */
export function assertIsGatherSomeResult(
	value: unknown
): asserts value is FkGatherSomeResult<any, any, ValidFkDepth> {
	if (!isGatherSomeResult(value)) {
		throw new Error('Expected a gatherSome result');
	}
}
