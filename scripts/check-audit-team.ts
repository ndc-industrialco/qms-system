import { db } from "../lib/db";

async function main() {
  const schedules = await db.auditSchedule.findMany({
    where: { plan: { auditNo: { in: ["AUD-26-001", "AUD-26-002"] } } },
    include: { team: true },
    orderBy: { startAt: "asc" },
  });

  console.log("=== Schedule team members ===");
  for (const s of schedules) {
    console.log(`Schedule: ${s.departmentName ?? s.sessionTitle} | team count: ${s.team.length}`);
    for (const m of s.team) {
      console.log(`  - ${m.nameSnapshot} (${m.role})`);
    }
  }
  if (schedules.length === 0) console.log("No schedules found");
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
