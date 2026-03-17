const { execSync } = require("child_process");
try {
  execSync(
    'docker run -d --name nutritionist-db -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=nutritionist_booking postgres:16-alpine',
    { stdio: "inherit" }
  );
  console.log("PostgreSQL started. Wait ~5 seconds, then run: npm run db:push && npm run db:seed");
} catch {
  try {
    execSync("docker start nutritionist-db", { stdio: "inherit" });
    console.log("PostgreSQL container started.");
  } catch (e) {
    console.error("Docker not found or container failed. Install Docker or run PostgreSQL manually.");
    process.exit(1);
  }
}
