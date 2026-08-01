import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isConstructorEmail } from "@/lib/auth/constructor-list";

/**
 * The editor writes directly into the published library, so this allow-list is
 * the only thing between a stranger and the front page. It has to fail closed.
 */
describe("constructor allow-list", () => {
  const original = {
    list: process.env.CLUEBERRY_CONSTRUCTORS,
    env: process.env.NODE_ENV,
  };

  const setEnv = (list: string | undefined, nodeEnv: string) => {
    if (list === undefined) delete process.env.CLUEBERRY_CONSTRUCTORS;
    else process.env.CLUEBERRY_CONSTRUCTORS = list;
    // NODE_ENV is readonly in the types but a plain assignable string at
    // runtime; the cast is the smallest way to say that.
    (process.env as Record<string, string>).NODE_ENV = nodeEnv;
  };

  beforeEach(() => setEnv(undefined, "test"));
  afterEach(() => setEnv(original.list, original.env ?? "test"));

  it("admits a listed address", () => {
    setEnv("editor@example.com,other@example.com", "production");
    expect(isConstructorEmail("editor@example.com")).toBe(true);
    expect(isConstructorEmail("other@example.com")).toBe(true);
  });

  it("refuses an address that is not listed", () => {
    setEnv("editor@example.com", "production");
    expect(isConstructorEmail("stranger@example.com")).toBe(false);
  });

  it("ignores case and surrounding whitespace on both sides", () => {
    setEnv("  Editor@Example.COM , second@example.com ", "production");
    expect(isConstructorEmail("editor@example.com")).toBe(true);
    expect(isConstructorEmail(" SECOND@example.com ")).toBe(true);
  });

  it("admits nobody in production when the list is unset", () => {
    // An unconfigured deployment must not be an open one.
    setEnv(undefined, "production");
    expect(isConstructorEmail("anyone@example.com")).toBe(false);
    expect(isConstructorEmail(null)).toBe(false);
    setEnv("", "production");
    expect(isConstructorEmail("anyone@example.com")).toBe(false);
  });

  it("stays usable offline: an unset list opens the editor in development only", () => {
    setEnv(undefined, "development");
    expect(isConstructorEmail("anyone@example.com")).toBe(true);
    // …but a configured list is still enforced, even in development.
    setEnv("editor@example.com", "development");
    expect(isConstructorEmail("anyone@example.com")).toBe(false);
  });

  it("refuses a missing address whenever a list exists", () => {
    setEnv("editor@example.com", "development");
    expect(isConstructorEmail(null)).toBe(false);
    expect(isConstructorEmail(undefined)).toBe(false);
    expect(isConstructorEmail("")).toBe(false);
  });
});
