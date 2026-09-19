import { createQueues } from "./queue/index.js";

const queues = createQueues();
console.log(`Drift Bot worker stub. Queues: ${Object.values(queues).join(", ")}`);
