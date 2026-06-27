import fs from 'node:fs';
import path from 'node:path';

const apiRoot = path.resolve(__dirname, '..');

const removedDeadScaffoldPaths = [
  'src/admin/entities/admin.entity.ts',
  'src/admin/discover/dto/discover.dto.ts',
  'src/google-drive/entities/google-drive.entity.ts',
  'src/involve/entities/involve.entity.ts',
  'src/tasks/dto/create-task.dto.ts',
  'src/tasks/dto/update-task.dto.ts',
  'src/tasks/entities/task.entity.ts',
  'src/telegram-bot/dto/telegram-auth.dto.ts',
  'src/user/entities/user.entity.ts',
  'src/user/interface/my-cashback.interface.ts',
] as const;

describe('dead Nest scaffold removal', () => {
  it.each(removedDeadScaffoldPaths)(
    'given removed scaffold %s > then it is not present in the tree',
    (relativePath) => {
      expect(fs.existsSync(path.join(apiRoot, relativePath))).toBe(false);
    },
  );
});
