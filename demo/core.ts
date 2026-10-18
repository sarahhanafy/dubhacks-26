// Browser bundle entry: exposes the real domain core to the demo page.
export { generateProposals } from "../src/domain/matcher";
export { OutingLifecycle } from "../src/domain/lifecycle";
export { formatLocal, toPublicPlan } from "../src/domain/projection";
export * as fx from "../src/fixtures/demo";
