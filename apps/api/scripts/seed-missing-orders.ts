import { runMissingOrdersCliProcess } from '../src/admin/missing-orders/missing-orders.cli';

void runMissingOrdersCliProcess(['seed', ...process.argv.slice(2)]).catch(
  (error) => {
    console.error(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exitCode = 1;
  },
);
