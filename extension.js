const vscode = require("vscode");
const axios = require("axios");
const express = require("express");
const path = require("path");
const fs = require("fs");
const querystring = require("querystring");
const { exec } = require("child_process");
require('dotenv').config();

// const clientId = process.env.GITHUB_CLIENT_ID;
// const clientSecret = process.env.GITHUB_CLIENT_SECRET;
// const redirectUri = process.env.REDIRECT_URI;

const clientId = 'Ov23litLcMtwjAREsAQw';
const clientSecret = 'e3ab6bfca79df0a932220f186bb31d968f75bc9e';
const redirectUri = 'http://localhost:3000/auth/callback';


// Start Express server to handle OAuth callback
const app = express();
let oauthCode = null;

app.get('/auth/callback', (req, res) => {
  oauthCode = req.query.code;
  res.send('Authentication successful! You can return to VSCode.');
});

app.listen(3000, () => {
  console.log('OAuth callback server running on http://localhost:3000');
});

let taskCounter = 1;

// Function to authenticate with GitHub
async function githubAuthentication() {
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}`;

  vscode.env.openExternal(vscode.Uri.parse(authUrl));

  while (!oauthCode) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for OAuth code
  }

  try {
    const response = await axios.post(
      `https://github.com/login/oauth/access_token`,
      null,
      {
        params: {
          client_id: clientId,
          client_secret: clientSecret,
          code: oauthCode,
        },
        headers: {
          accept: "application/json",
        },
      }
    );

    const accessToken = response.data.access_token;
    if (!accessToken) {
      throw new Error("Failed to retrieve access token.");
    }
    return accessToken;

  } catch (error) {
    vscode.window.showErrorMessage("GitHub authentication failed.");
    console.error("Error during authentication:", error);
  }
}

// // Function to create a GitHub repository
// async function createRepo(token) {
//   try {
//     const response = await axios.post(
//       `https://api.github.com/user/repos`,
//       {
//         name: "code-tracking",
//         description: "A repository for tracking daily coding contributions",
//         private: false,
//       },
//       {
//         headers: {
//           Authorization: `token ${token}`,
//         },
//       }
//     );
//     return response.data;
//   } catch (error) {
//     vscode.window.showErrorMessage("Failed to create repository.");
//     console.error("Error during repository creation:", error);
//   }
// }

async function useExistingRepo(token) {
	try {
	  // Try to fetch the repository
	  const repoResponse = await axios.get(
		`https://api.github.com/repos/Sumana-Madhireddy/code-tracking`, // Replace with your actual GitHub username
		{
		  headers: {
			Authorization: `token ${token}`,
		  },
		}
	  );
  
	  // If the repository exists, return its data
	  if (repoResponse.status === 200) {
		console.log('Using existing repository:', repoResponse.data.name);
		return repoResponse.data;
	  }
	} catch (error) {
	  vscode.window.showErrorMessage("Failed to access the existing repository.");
	  console.error("Error during repository access:", error);
	  throw error;
	}
  }
  
  // In your activate function, use the existing repository instead of creating a new one
  async function activate(context) {
	console.log('Extension "GitHub Productivity Tracker" is now active!');
  
	let disposable = vscode.commands.registerCommand(
	  "github-productivity-tracker.authenticate",
	  async () => {
		try {
		  const token = await githubAuthentication();
		  console.log(`GitHub authentication successful, token: ${token}`);
		  if (token) {
			const repo = await useExistingRepo(token); // Use the existing repo
			if (repo) {
			  vscode.window.showInformationMessage(`Using existing repository ${repo.name}.`);
			  setInterval(async () => {
				await commitChanges();
			  }, 1800000); // Commit every 30 minutes
			}
		  }
		} catch (error) {
		  console.error("Error during authentication or repo access:", error);
		}
	  }
	);
  
	context.subscriptions.push(disposable);
}
  

// // Function to commit changes every 30 minutes
// async function commitChanges() {
//   exec('git add . && git commit -m "Summary of work done" && git push', (error, stdout, stderr) => {
//     if (error) {
//       console.error(`Commit error: ${error.message}`);
//       return;
//     }
//     if (stderr) {
//       console.error(`Commit stderr: ${stderr}`);
//       return;
//     }
//     console.log(`Commit stdout: ${stdout}`);
//   });
// }

// Function to create log files and commit them to GitHub
async function commitChanges() {
	const workSummary = `Work summary for the last 30 minutes: ${new Date().toLocaleString()}`; // Default summary with timestamp
  
	// Create log file
	const logFileName = `task${taskCounter}_log.md`;
	const logFilePath = path.join(__dirname, logFileName);
  
	const logContent = `## Task ${taskCounter}\n\n### Summary: ${workSummary}\n\nLogged at: ${new Date().toLocaleString()}\n`;
  
	// Write the log content to the markdown file
	fs.writeFileSync(logFilePath, logContent);
  
	taskCounter++; // Increment task counter for next task log file
  
	// Commit the newly created log file to GitHub
	exec(
	  `cd C:/Users/madhi/Documents/Projects/code-tracking && git add ${logFilePath} && git commit -m "Log work summary" && git push`,
	  (error, stdout, stderr) => {
		if (error) {
		  console.error(`Commit error: ${error.message}`);
		  return;
		}
		if (stderr) {
		  console.error(`Commit stderr: ${stderr}`);
		  return;
		}
		console.log(`Commit stdout: ${stdout}`);
	  }
	);
}

// Activate the extension
// function activate(context) {
//   console.log('Extension "GitHub Productivity Tracker" is now active!');

//   let disposable = vscode.commands.registerCommand(
//     "github-productivity-tracker.authenticate",
//     async () => {
//       try {
//         const token = await githubAuthentication();
// 		console.log(`GitHub authentication successful, token: ${token}`);
//         if (token) {
//           const repo = await createRepo(token);
//           if (repo) {
//             vscode.window.showInformationMessage(`Repository ${repo.name} created successfully.`);
//             setInterval(async () => {
//               await commitChanges();
//             }, 30 * 60 * 1000); // Commit every 30 minutes
//           }
//         }
//       } catch (error) {
//         console.error("Error during authentication or repo creation:", error);
//       }
//     }
//   );

//   context.subscriptions.push(disposable);
// }

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};


