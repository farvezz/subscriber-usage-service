# Q4: Troubleshoot & Explain

## Original code

```javascript
function getTotalUsageMB(records) {
  return records.reduce((total, record) => {
    total += record.dataUsageMB;
  });
}
```

## Root cause

There are two independent bugs, both in how `reduce` is used:

1. **The callback never returns a value.**
   `Array.prototype.reduce` uses the callback's *return value* as the
   accumulator for the next iteration. Here, `total += record.dataUsageMB`
   updates a local variable but the arrow function body (using `{ }`) has
   no `return` statement, so the callback implicitly returns `undefined`
   every time. From the second iteration onward, `total` is `undefined`,
   and the final result is `undefined`.

2. **No initial value is passed to `reduce`.**
   Without a second argument, `reduce` uses the **first element of the
   array** (a whole `record` object) as the initial accumulator, and
   starts iterating from the second element. So on the very first
   iteration, `total` is an object, and `total += record.dataUsageMB`
   coerces that object to the string `"[object Object]"` and
   concatenates the number onto it, instead of doing numeric addition.
   This also means calling the function on an **empty array** throws a
   `TypeError: Reduce of empty array with no initial value`.

Either bug alone would break the function; together they compound.

## Fix

```javascript
function getTotalUsageMB(records) {
  return records.reduce((total, record) => total + record.dataUsageMB, 0);
}
```

Changes:
- The callback now returns the running sum on every call (using an
  implicit-return arrow function body).
- An explicit initial value of `0` is passed as `reduce`'s second
  argument, so the accumulator starts as a number and the function
  returns `0` for an empty array instead of throwing.

## Why it broke

The bug is subtle because it doesn't throw or crash for a non-empty
array — it silently returns `undefined` or a garbled string, which is
easy to miss in manual testing if the return value isn't checked
carefully, and it only throws for the edge case (empty array) that's
easiest to forget to test.

## How to prevent this class of bug in the future

- **Always pass an initial value to `reduce`.** It removes the
  ambiguity about the accumulator's starting type and makes the
  function safe for empty arrays.
- **Prefer implicit-return arrow functions for simple accumulators**
  (`(total, x) => total + x.value, 0`) — with a `{ }` block body, a
  missing `return` is a silent bug, not a syntax error.
- **Enable a linter rule that catches this**, e.g. ESLint's
  `array-callback-return`, which flags array callbacks (including
  `reduce`) that don't return a value on every path.
- **Write a unit test for the empty-array case** and for a known
  small dataset with an expected sum. A test like
  `expect(getTotalUsageMB([])).toBe(0)` would have caught bug #2
  immediately, and asserting the exact numeric total on a 2-record
  fixture would have caught bug #1.
- **Use TypeScript** (or JSDoc + `checkJs`) so the reducer's return
  type is checked against the expected accumulator type, which would
  flag the `undefined`/object-vs-number mismatch at compile time.
