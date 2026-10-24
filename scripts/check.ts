import { runAgentChecks } from "../src/loop";
import { runContentChecks } from "../src/content";
import { runScoreChecks } from "../src/logic";
import { runPsiChecks } from "../src/psi";

const failures = [...runScoreChecks(), ...runContentChecks(), ...runAgentChecks(), ...(await runPsiChecks())];
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("ok");
