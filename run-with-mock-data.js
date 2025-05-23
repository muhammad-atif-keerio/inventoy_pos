// Script to run the application with mock data
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("Setting up the application to use mock data...");

// Path to ledger-db.ts file
const dbFilePath = path.join(__dirname, "app", "lib", "ledger-db.ts");

// Check if file exists
if (!fs.existsSync(dbFilePath)) {
    console.error(`File not found: ${dbFilePath}`);
    process.exit(1);
}

try {
    // Read the file content
    let content = fs.readFileSync(dbFilePath, "utf8");
    console.log("File read successfully");

    // Replace the useMockDataForTesting line to force it to true
    if (content.includes("const useMockDataForTesting = false;")) {
        content = content.replace(
            "const useMockDataForTesting = false;",
            "const useMockDataForTesting = true; // TEMPORARILY CHANGED TO TRUE DUE TO CONNECTION ISSUES",
        );
        console.log("Changed useMockDataForTesting to true");
    } else if (content.includes("const useMockDataForTesting = true;")) {
        console.log("useMockDataForTesting is already set to true");
    } else {
        console.log("Could not find useMockDataForTesting variable to modify");
    }

    // Write the file back
    fs.writeFileSync(dbFilePath, content);
    console.log("File updated successfully");

    // Verify the change
    const newContent = fs.readFileSync(dbFilePath, "utf8");
    if (newContent.includes("const useMockDataForTesting = true;")) {
        console.log("✅ Successfully updated the file to use mock data");
    } else {
        console.log("❌ Failed to update the file properly");
    }

    // Start the application
    console.log("\nStarting the application with mock data...");
    console.log("Press Ctrl+C to stop the application");

    // Run the application
    execSync("npm run dev", { stdio: "inherit" });
} catch (error) {
    console.error("Error:", error);
    process.exit(1);
}
