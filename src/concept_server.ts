import { Hono } from "@hono/hono";
import { walk } from "@std/fs";
import { toFileUrl } from "@std/path/to-file-url";
import { getDb } from "@utils/database.ts";
import { parseArgs } from "@std/cli/parse-args";
import { load } from "@std/dotenv";

/**
 * Main server function to initialize DB, load concepts, and start the server.
 */
async function main() {
  // Load environment variables from .env file
  await load({ export: true });

  // CORS middleware for all requests
  // Parse command-line arguments for port and base URL
  const flags = parseArgs(Deno.args, {
    string: ["port", "baseUrl"],
    default: {
      port: "8000",
      baseUrl: "/api",
    },
  });
  const PORT = parseInt(flags.port, 10);
  const app = new Hono();
  const CONCEPTS_DIR = "src/concepts";
  const BASE_URL = "/api";

  const [db] = await getDb();
  // CORS middleware for all requests
  app.use("*", async (c, next) => {
    await next();
    c.header("Access-Control-Allow-Origin", "*");
    c.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  });

  app.options("*", () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  });

  app.get("/", (c) => c.text("Concept Server is running."));

  // --- Dynamic Concept Loading and Routing ---
  console.log(`Scanning for concepts in ./${CONCEPTS_DIR}...`);

  for await (
    const entry of walk(CONCEPTS_DIR, {
      maxDepth: 1,
      includeDirs: true,
      includeFiles: false,
    })
  ) {
    if (entry.path === CONCEPTS_DIR) continue; // Skip the root directory

    const conceptName = entry.name;
    const conceptFilePath = `${entry.path}/${conceptName}Concept.ts`;

    try {
      const modulePath = toFileUrl(Deno.realPathSync(conceptFilePath)).href;
      const module = await import(modulePath);
      const ConceptClass = module.default;

      if (
        typeof ConceptClass !== "function" ||
        !ConceptClass.name.endsWith("Concept")
      ) {
        console.warn(
          `! No valid concept class found in ${conceptFilePath}. Skipping.`,
        );
        continue;
      }

      // Pass Gemini API key to QuizMatchmakerConcept, others just get db
      let instance;
      if (
        conceptName === "QuizMatchmaker" || conceptName === "MilestoneTracker"
      ) {
        const apiKey = Deno.env.get("GEMINI_API_KEY");
        instance = new ConceptClass(db, apiKey);
      } else {
        instance = new ConceptClass(db);
      }
      const conceptApiName = conceptName;
      console.log(
        `- Registering concept: ${conceptName} at ${BASE_URL}/${conceptApiName}`,
      );

      const methodNames = Object.getOwnPropertyNames(
        Object.getPrototypeOf(instance),
      )
        .filter((name) =>
          name !== "constructor" && typeof instance[name] === "function"
        );

      for (const methodName of methodNames) {
        const actionName = methodName;
        const route = `${BASE_URL}/${conceptApiName}/${actionName}`;

        app.post(route, async (c) => {
          try {
            console.log(
              `[CONCEPT_SERVER DEBUG] Entered POST handler for ${route}`,
            );
            // Extract session from Authorization header if present
            let session: string | undefined = undefined;
            const authHeader = c.req.header("authorization");
            if (authHeader && authHeader.startsWith("Bearer ")) {
              session = authHeader.slice("Bearer ".length);
            }
            const body = await c.req.json().catch(() => ({})); // Handle empty body
            console.log(
              `[CONCEPT_SERVER DEBUG] Parsed body for ${route}:`,
              body,
            );
            // Inject session into body if not already present
            const input = { ...body };
            if (session && !input.session) {
              input.session = session;
            }
            // Debug log for session injection
            console.log(
              `[CONCEPT_SERVER DEBUG] POST ${route} input.session:`,
              input.session,
            );
            console.log(`[CONCEPT_SERVER DEBUG] POST ${route} input:`, input);
            const result = await instance[methodName](input);
            return c.json(result);
          } catch (e) {
            console.error(`Error in ${conceptName}.${methodName}:`, e);
            return c.json({ error: "An internal server error occurred." }, 500);
          }
        });
        console.log(`  - Endpoint: POST ${route}`);
      }
    } catch (e) {
      console.error(
        `! Error loading concept from ${conceptFilePath}:`,
        e,
      );
    }
  }

  // Run the server
  console.log(`\nServer listening on http://localhost:${PORT}`);
  Deno.serve({ port: PORT }, app.fetch);
}

main();