import { FRAMEWORK_VERSION, UPDATE_CHANNEL } from "../src/lifecycle/state.js";

export const TEST_SOURCE_VERSION = FRAMEWORK_VERSION;
export const TEST_SOURCE_CHANNEL = UPDATE_CHANNEL;

function nextFixtureVersion(source: string, offset: number): string {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)/.exec(source);
  if (!match) throw new Error(`Test baseline requires a semantic Framework version, observed '${source}'.`);
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]) + offset;
  return `${major}.${minor}.${patch}-fixture.1`;
}

export const NORMAL_TARGET_VERSION = nextFixtureVersion(TEST_SOURCE_VERSION, 1);
export const MIGRATION_TARGET_VERSION = nextFixtureVersion(TEST_SOURCE_VERSION, 2);
