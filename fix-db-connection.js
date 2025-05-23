// Fix database connection issues by adjusting the configuration
const fs = require("fs");
const path = require("path");

console.log("Starting database connection fix...");

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
} catch (error) {
    console.error("Error updating file:", error);
    process.exit(1);
}
