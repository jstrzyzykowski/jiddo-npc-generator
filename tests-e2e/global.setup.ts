import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import { STORAGE_STATE } from "../playwright.config";

dotenv.config({ path: ".env.test" });

async function globalSetup() {
  console.log("Starting global setup...");

  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;
  const testUserEmail = process.env.E2E_TEST_USER_EMAIL;
  const testUserPassword = process.env.E2E_TEST_USER_PASSWORD;

  if (!supabaseUrl || !serviceRoleKey || !testUserEmail || !testUserPassword) {
    throw new Error("One or more required environment variables for E2E tests are not set.");
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // 1. Check if the user exists
  const {
    data: { users },
    error: listUsersError,
  } = await supabaseAdmin.auth.admin.listUsers();

  if (listUsersError) {
    throw new Error(`Could not list users: ${listUsersError.message}`);
  }

  const user = users.find((u) => u.email === testUserEmail);

  // 2. If user doesn't exist, create it
  if (!user) {
    console.log(`Test user ${testUserEmail} not found. Creating...`);
    const { error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: testUserEmail,
      password: testUserPassword,
      email_confirm: true,
      user_metadata: {
        display_name: "Test User",
      },
    });
    if (createUserError) {
      throw new Error(`Could not create test user: ${createUserError.message}`);
    }
    console.log(`Test user ${testUserEmail} created successfully.`);
  } else {
    console.log(`Test user ${testUserEmail} already exists.`);
  }

  const {
    data: { session },
    error: signInError,
  } = await supabaseAdmin.auth.signInWithPassword({
    email: testUserEmail,
    password: testUserPassword,
  });

  if (signInError) {
    throw new Error(`Could not sign in with test user: ${signInError.message}`);
  }
  if (!session) {
    throw new Error("Sign in was successful, but no session object was returned.");
  }

  console.log("Successfully signed in test user.");

  fs.mkdirSync("tests-e2e/.auth", { recursive: true });
  fs.writeFileSync(STORAGE_STATE, JSON.stringify(session));

  console.log(`Session state saved to ${STORAGE_STATE}`);
  console.log("Global setup finished.");
}

export default globalSetup;
