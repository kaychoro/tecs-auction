const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getAppConfig,
  DEFAULT_COLLECTIONS,
} = require("../lib/config.js");

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
};

test.afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_ENV.NODE_ENV;
  process.env.FIREBASE_PROJECT_ID = ORIGINAL_ENV.FIREBASE_PROJECT_ID;
  process.env.GCLOUD_PROJECT = ORIGINAL_ENV.GCLOUD_PROJECT;
});

test("returns local development defaults", () => {
  delete process.env.NODE_ENV;
  delete process.env.FIREBASE_PROJECT_ID;
  delete process.env.GCLOUD_PROJECT;

  const config = getAppConfig();

  assert.equal(config.environment, "development");
  assert.equal(config.projectId, "local-dev");
  assert.deepEqual(config.collections, DEFAULT_COLLECTIONS);
});

test("uses FIREBASE_PROJECT_ID when provided", () => {
  process.env.NODE_ENV = "test";
  process.env.FIREBASE_PROJECT_ID = "tecs-auction-v2";
  delete process.env.GCLOUD_PROJECT;

  const config = getAppConfig();

  assert.equal(config.environment, "test");
  assert.equal(config.projectId, "tecs-auction-v2");
});

test("falls back to GCLOUD_PROJECT when FIREBASE_PROJECT_ID is unset", () => {
  process.env.NODE_ENV = "production";
  delete process.env.FIREBASE_PROJECT_ID;
  process.env.GCLOUD_PROJECT = "gcloud-project-id";

  const config = getAppConfig();

  assert.equal(config.environment, "production");
  assert.equal(config.projectId, "gcloud-project-id");
});
