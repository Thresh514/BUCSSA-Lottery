import { createClient } from 'redis';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

async function main() {
  const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  try {
    await redisClient.connect();
    console.log('✅ Connected to Redis');

    while (true) {
      console.log('\n=== Display Users Management ===');
      console.log('1. Add display user email');
      console.log('2. Remove display user email');
      console.log('3. List all display users');
      console.log('4. Exit');

      const choice = await question('Choose an option (1-4): ');

      switch (choice) {
        case '1':
          const emailToAdd = await question('Enter email to add as display user: ');
          if (emailToAdd) {
            await redisClient.sAdd('nextauth:display_emails', emailToAdd);
            console.log(`✅ Added ${emailToAdd} as display user`);
          }
          break;

        case '2':
          const emailToRemove = await question('Enter email to remove from display users: ');
          if (emailToRemove) {
            const result = await redisClient.sRem('nextauth:display_emails', emailToRemove);
            if (result > 0) {
              console.log(`✅ Removed ${emailToRemove} from display users`);
            } else {
              console.log(`❌ ${emailToRemove} was not found in display users`);
            }
          }
          break;

        case '3':
          const displayUsers = await redisClient.sMembers('nextauth:display_emails');
          console.log('\n📺 Display Users:');
          if (displayUsers.length === 0) {
            console.log('No display users found');
          } else {
            displayUsers.forEach((email, index) => {
              console.log(`${index + 1}. ${email}`);
            });
          }
          break;

        case '4':
          console.log('👋 Goodbye!');
          rl.close();
          await redisClient.disconnect();
          process.exit(0);

        default:
          console.log('❌ Invalid option, please choose 1-4');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
    rl.close();
    await redisClient.disconnect();
    process.exit(1);
  }
}

main();
