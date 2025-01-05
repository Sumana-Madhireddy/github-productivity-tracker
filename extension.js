// const vscode = require("vscode");
// const axios = require("axios");
// const { exec } = require("child_process");
// require("dotenv").config();

// // const redirectUri = "http://localhost:3000/auth/callback";
// // const clientId = process.env.GITHUB_CLIENT_ID;
// // const clientSecret = process.env.GITHUB_CLIENT_SECRET;

// const clientId = 'Ov23litLcMtwjAREsAQw';
// const clientSecret = 'e3ab6bfca79df0a932220f186bb31d968f75bc9e';
// const redirectUri = 'http://localhost:3000/auth/callback';

// // Start Express server to handle OAuth callback
// const app = express();
// let oauthCode = null;

// app.get("/auth/callback", (req, res) => {
//   oauthCode = req.query.code;
//   res.send("Authentication successful! You can return to VSCode.");
// });

// app.listen(3000, () => {
//   console.log("OAuth callback server running on http://localhost:3000");
// });

// // Function to authenticate user via GitHub OAuth
// async function githubAuthentication() {
//   const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}`;

//   vscode.env.openExternal(vscode.Uri.parse(authUrl));

//   while (!oauthCode) {
//     await new Promise((resolve) => setTimeout(resolve, 1000));
//   }

//   try {
//     const response = await axios.post(
//       `https://github.com/login/oauth/access_token`,
//       null,
//       {
//         params: {
//           client_id: clientId,
//           client_secret: clientSecret,
//           code: oauthCode,
//         },
//         headers: {
//           accept: "application/json",
//         },
//       }
//     );

//     const accessToken = response.data.access_token;
//     if (!accessToken) {
//       throw new Error("Failed to retrieve access token.");
//     }
//     return accessToken;
//   } catch (error) {
//     vscode.window.showErrorMessage("GitHub authentication failed.");
//     console.error("Error during authentication:", error);
//   }
// }

// // Function to fetch the authenticated user's GitHub username
// async function getUserUsername(token) {
// 	try {
// 	  const response = await axios.get("https://api.github.com/user", {
// 		headers: {
// 		  Authorization: `token ${token}`,
// 		},
// 	  });
// 	  return response.data.login; // Return the GitHub username
// 	} catch (error) {
// 	  console.error("Failed to fetch user details:", error);
// 	  return null;
// 	}
//   }

// // Function to get or create the code-tracking repository
// async function getOrCreateRepo(token) {
// 	const username = await getUserUsername(token);
// 	if (!username) {
// 	  vscode.window.showErrorMessage("Failed to get GitHub username.");
// 	  return;
// 	}
  
// 	try {
// 	  const repoResponse = await axios.get(
// 		`https://api.github.com/repos/${username}/code-tracking`,
// 		{
// 		  headers: {
// 			Authorization: `token ${token}`,
// 		  },
// 		}
// 	  );
  
// 	  if (repoResponse.status === 200) {
// 		console.log("Using existing repository:", repoResponse.data.name);
// 		return repoResponse.data;
// 	  }
// 	} catch (error) {
// 	  console.log("Creating a new repository...");
// 	  return await createRepo(token, username);
// 	}
//   }
  
//   // Function to create a repository on GitHub if it doesn't exist
//   async function createRepo(token, username) {
// 	try {
// 	  const repoResponse = await axios.post(
// 		`https://api.github.com/user/repos`,
// 		{
// 		  name: "code-tracking",
// 		  description: "A repository for tracking daily coding contributions",
// 		  private: false,
// 		},
// 		{
// 		  headers: {
// 			Authorization: `token ${token}`,
// 		  },
// 		}
// 	  );
// 	  return repoResponse.data;
// 	} catch (error) {
// 	  if (error.response && error.response.status === 422) {
// 		console.log("Repository already exists.");
// 		return null;
// 	  }
// 	  vscode.window.showErrorMessage("Failed to create repository.");
// 	  console.error("Error during repository creation:", error);
// 	  throw error;
// 	}
// }

// // Function to get commit messages from the last 30 minutes
// function getRecentCommits() {
//   return new Promise((resolve, reject) => {
//     const now = new Date();
//     const thirtyMinutesAgo = new Date(now - 30 * 60 * 1000);
//     const sinceDate = thirtyMinutesAgo.toISOString();

//     // Run the git log command to get commits since the last 30 minutes
//     exec(`git log --since="${sinceDate}" --pretty=format:"%h - %s"`, (error, stdout, stderr) => {
//       if (error || stderr) {
//         reject(`Error fetching commits: ${error || stderr}`);
//       }
//       const commitMessages = stdout.split("\n").filter(Boolean);
//       resolve(commitMessages);
//     });
//   });
// }

// // Function to log work summary and commit it to GitHub
// async function commitChanges(token, repo) {
//   const recentCommits = await getRecentCommits();

//   // Build the commit content
//   const logContent = `
//     ## Recent Commits in the Last 30 Minutes:

//     ${recentCommits.length > 0 ? recentCommits.join("\n") : "No commits made."}

//     Logged at: ${new Date().toLocaleString()}
//   `;

//   try {
//     const response = await axios.put(
//       `https://api.github.com/repos/${process.env.GITHUB_USERNAME}/code-tracking/contents/${new Date().toISOString()}.md`,
//       {
//         message: "Log recent commits",
//         content: Buffer.from(logContent).toString("base64"),
//         branch: "main",
//       },
//       {
//         headers: {
//           Authorization: `token ${token}`,
//         },
//       }
//     );
//     console.log("Log file committed:", response.data.content.name);
//   } catch (error) {
//     console.error("Error during commit:", error);
//   }
// }

// // Activate the extension
// async function activate(context) {
//   console.log('Extension "GitHub Productivity Tracker" is now active!');

//   let disposable = vscode.commands.registerCommand(
//     "github-productivity-tracker.authenticate",
//     async () => {
//       try {
//         const token = await githubAuthentication();
//         console.log(`GitHub authentication successful, token: ${token}`);
//         if (token) {
//           const repo = await getOrCreateRepo(token);
//           if (repo) {
//             vscode.window.showInformationMessage(
//               `Using repository ${repo.name}.`
//             );
//             setInterval(async () => {
//               await commitChanges(token, repo);
//             }, 1 * 60 * 1000); // Commit every 30 minutes
//           }
//         }
//       } catch (error) {
//         console.error("Error during authentication or repo access:", error);
//       }
//     }
//   );

//   context.subscriptions.push(disposable);
// }

// function deactivate() {}

// module.exports = {
//   activate,
//   deactivate,
// };


const vscode = require("vscode");
const axios = require("axios");
const express = require("express");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
require("dotenv").config();

// const clientId = process.env.GITHUB_CLIENT_ID;
// const clientSecret = process.env.GITHUB_CLIENT_SECRET;
// const redirectUri = "http://localhost:3000/auth/callback";

const clientId = 'Ov23litLcMtwjAREsAQw';
const clientSecret = 'e3ab6bfca79df0a932220f186bb31d968f75bc9e';
const redirectUri = 'http://localhost:3000/auth/callback';


// Start Express server to handle OAuth callback
const app = express();
let oauthCode = null;

app.get("/auth/callback", (req, res) => {
  oauthCode = req.query.code;
  res.send("Authentication successful! You can return to VSCode.");
});

app.listen(3000, () => {
  console.log("OAuth callback server running on http://localhost:3000");
});

let taskCounter = 1; // To keep track of log files

async function githubAuthentication() {
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}`;

  vscode.env.openExternal(vscode.Uri.parse(authUrl));

  while (!oauthCode) {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Poll for OAuth code
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

async function useExistingRepo(token) {
  try {
    const repoResponse = await axios.get(
      `https://api.github.com/repos/Sumana-Madhireddy/code-tracking`,
      {
        headers: {
          Authorization: `token ${token}`,
        },
      }
    );

    if (repoResponse.status === 200) {
      console.log("Using existing repository:", repoResponse.data.name);
      return repoResponse.data;
    }
  } catch (error) {
    vscode.window.showErrorMessage("Failed to access the existing repository.");
    console.error("Error during repository access:", error);
    throw error;
  }
}

async function commitChanges() {
  try {
    const workSummary = `Work summary for the last 30 minutes: ${new Date().toLocaleString()}`;
    const logFilename = `task${taskCounter}_log.md`;
    const logFilePath = path.join(__dirname, logFilename);
    const logContent = `## Task ${taskCounter}\n\n### Summary:\n${workSummary}\n\nLogged at: ${new Date().toLocaleString()}\n`;

    fs.writeFileSync(logFilePath, logContent, "utf8");
    console.log(`Created log file: ${logFilename}`);
    taskCounter++;

    exec(
      `cd C:/Users/madhi/Documents/Projects/code-tracking && git add ${logFilename} && git commit -m "${workSummary}" && git push`,
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
  } catch (error) {
    console.error("Error during commit:", error);
  }
}

async function activate(context) {
  console.log('Extension "GitHub Productivity Tracker" is now active!');

  let disposable = vscode.commands.registerCommand(
    "github-productivity-tracker.authenticate",
    async () => {
      try {
        const token = await githubAuthentication();
        console.log(`GitHub authentication successful, token: ${token}`);
        if (token) {
          const repo = await useExistingRepo(token);
          if (repo) {
            vscode.window.showInformationMessage(
              `Using existing repository ${repo.name}.`
            );
            setInterval(async () => {
              await commitChanges();
            }, 1 * 60 * 1000); // Commit every 30 minutes
          }
        }
      } catch (error) {
        console.error("Error during authentication or repo access:", error);
      }
    }
  );

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
