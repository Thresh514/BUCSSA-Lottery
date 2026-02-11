import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL');

    while (true) {
      console.log('\n=== Admin / Display 角色管理 (UserRole 表) ===');
      console.log('1. 添加 display 邮箱');
      console.log('2. 移除 display 邮箱');
      console.log('3. 列出所有 display');
      console.log('4. 添加 admin 邮箱');
      console.log('5. 移除 admin 邮箱');
      console.log('6. 列出所有 admin');
      console.log('7. 退出');

      const choice = (await question('请选择 (1-7): ')).trim();

      switch (choice) {
        case '1': {
          const email = (await question('输入要设为 display 的邮箱: ')).trim();
          if (email) {
            await prisma.userRole.upsert({
              where: { email_role: { email, role: 'display' } },
              create: { email, role: 'display' },
              update: {},
            });
            console.log(`✅ 已添加 ${email} 为 display`);
          }
          break;
        }
        case '2': {
          const email = (await question('输入要从 display 移除的邮箱: ')).trim();
          if (email) {
            const result = await prisma.userRole.deleteMany({
              where: { email, role: 'display' },
            });
            if (result.count > 0) {
              console.log(`✅ 已从 display 移除 ${email}`);
            } else {
              console.log(`❌ ${email} 不在 display 列表中`);
            }
          }
          break;
        }
        case '3': {
          const rows = await prisma.userRole.findMany({
            where: { role: 'display' },
            orderBy: { email: 'asc' },
          });
          console.log('\n📺 Display 用户:');
          if (rows.length === 0) console.log('  (无)');
          else rows.forEach((r, i) => console.log(`  ${i + 1}. ${r.email}`));
          break;
        }
        case '4': {
          const email = (await question('输入要设为 admin 的邮箱: ')).trim();
          if (email) {
            await prisma.userRole.upsert({
              where: { email_role: { email, role: 'admin' } },
              create: { email, role: 'admin' },
              update: {},
            });
            console.log(`✅ 已添加 ${email} 为 admin`);
          }
          break;
        }
        case '5': {
          const email = (await question('输入要从 admin 移除的邮箱: ')).trim();
          if (email) {
            const result = await prisma.userRole.deleteMany({
              where: { email, role: 'admin' },
            });
            if (result.count > 0) {
              console.log(`✅ 已从 admin 移除 ${email}`);
            } else {
              console.log(`❌ ${email} 不在 admin 列表中`);
            }
          }
          break;
        }
        case '6': {
          const rows = await prisma.userRole.findMany({
            where: { role: 'admin' },
            orderBy: { email: 'asc' },
          });
          console.log('\n👑 Admin 用户:');
          if (rows.length === 0) console.log('  (无)');
          else rows.forEach((r, i) => console.log(`  ${i + 1}. ${r.email}`));
          break;
        }
        case '7':
          console.log('👋 再见');
          rl.close();
          await prisma.$disconnect();
          process.exit(0);
        default:
          console.log('❌ 请输入 1-7');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
    rl.close();
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
