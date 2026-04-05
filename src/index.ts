import 'dotenv/config';
import { configManager } from './services/config.service.js';
import { setupCLI, startChat } from './cli/index.js';
import { colors } from './ui/components.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export async function main(): Promise<void> {
  try {
    // Initialize config first
    await configManager.init();

    // Check if no arguments provided (just 'node dist/index.js')
    const noArgs = process.argv.length <= 2;

    if (noArgs) {
      // Start chat directly without commander
      await startChat({});
      return;
    }

    const program = setupCLI();
    await program.parseAsync(process.argv);
  } catch (err) {
    console.error(colors.error(err instanceof Error ? err.message : 'An unexpected error occurred'));
    process.exit(1);
  }
}

// Execute main() only when this file is run directly (not when imported)
const currentFilePath = fileURLToPath(import.meta.url);
const executedFilePath = process.argv[1] ? path.resolve(process.argv[1]) : '';

// Check if being run directly (not imported as a module)
if (executedFilePath && (currentFilePath === executedFilePath || executedFilePath.endsWith('index.js'))) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
