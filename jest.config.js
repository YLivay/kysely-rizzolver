/** @type {import('ts-jest').JestConfigWithTsJest} **/

module.exports = {
	testEnvironment: 'node',
	testMatch: ['**/test/**/*.test.ts'],

	// Remove the .js extension from the module name
	moduleNameMapper: {
		'^(\\.\\.?\\/.+)\\.js$': '$1'
	},

	// Add the js-test transform to .ts and .js files
	transform: {
		'^.+\\.(t|j)s$': ['ts-jest', {}]
	}
};
