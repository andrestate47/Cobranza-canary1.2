import { prisma } from './lib/db';

async function test() {
  try {
    let config = await prisma.configuracion.findFirst();
    console.log("Config exists?", !!config);
    if (config) {
      console.log("Config ID:", config.id);
      console.log("Logo URL before:", config.logoUrl);
      const updated = await prisma.configuracion.update({
        where: { id: config.id },
        data: { logoUrl: "test-url" }
      });
      console.log("Update success:", updated.logoUrl);
    } else {
      console.log("No config found, creating...");
      const created = await prisma.configuracion.create({
        data: { logoUrl: "test-url" }
      });
      console.log("Create success:", created.logoUrl);
    }
  } catch (err) {
    console.error("Prisma error:", err);
  }
}

test().finally(() => process.exit(0));
