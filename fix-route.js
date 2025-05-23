const fs = require("fs");
const path = require("path");

// Define paths
const targetDir = path.join(__dirname, "app", "api", "ledger", "[id]");
const sourcePath = path.join(targetDir, "route.ts.new");
const destPath = path.join(targetDir, "route.ts");

// Check if files exist
console.log("Checking files...");
console.log(`Source path: ${sourcePath}`);
console.log(`Destination path: ${destPath}`);

try {
    console.log(`Source exists: ${fs.existsSync(sourcePath)}`);
    console.log(`Destination exists: ${fs.existsSync(destPath)}`);

    if (fs.existsSync(sourcePath)) {
        // Read the new file
        const newContent = fs.readFileSync(sourcePath, "utf8");

        // Write to the destination file
        fs.writeFileSync(destPath, newContent);

        console.log("Successfully replaced the route.ts file");
    } else {
        console.error("Source file does not exist");
    }
} catch (error) {
    console.error("Error:", error);
}
