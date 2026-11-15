import test from "node:test";
import assert from "node:assert/strict";
import { formatAssistantMessage } from "../src/lib/ui.js";

test("assistant Markdown emphasis and list markers render safely", () => {
  assert.equal(
    formatAssistantMessage(
      '**High heart rate**\n*Please rest.*\n* Ask Jun to check in.',
    ),
    '<strong>High heart rate</strong>\n<em>Please rest.</em>\n&bull;&nbsp;Ask Jun to check in.',
  );
  assert.equal(
    formatAssistantMessage("<img src=x onerror=alert(1)>"),
    "&lt;img src=x onerror=alert(1)&gt;",
  );
});
