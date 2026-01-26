import { Command } from "commander";
import { loadSchema } from "./utils.js";
import { writeFileSync } from "fs";

export default function (program: Command) {
  return new Command("docs")
    .description("Generate Markdown documentation")
    .action(async (program, command) => {
      const schema = await loadSchema(command.parent.opts().schema);
      let md = `# Environment Variables\n\n`;

      Object.entries(schema).forEach(([key, rule]) => {
        md += `## \'${key}\'\n\n`;
        md += `- **Type**: ${rule.type}\n`;
        if (rule.docs) md += `- **Description**: ${rule.docs}\n`;
        if (rule.default) {
          md += `- **Default**: \'${rule.default}\'}\n`;
        }
        md += "\n";
      });

      writeFileSync("ENV.md", md);
    });
}
