/** Jest setup for the backoffice's TypeScript utility logic (lib/*). */
module.exports = {
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/support/"],
  roots: ["<rootDir>/__tests__"],
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        // Next.js compiles for the bundler; Jest runs plain CommonJS.
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node10",
          jsx: "react-jsx",
          esModuleInterop: true,
          target: "es2020",
          strict: true,
          ignoreDeprecations: "5.0",
        },
      },
    ],
  },
  collectCoverageFrom: ["lib/api.ts", "lib/auth-storage.ts", "lib/incidents.ts"],
  coverageThreshold: { global: { lines: 70 } },
};
