// const vscode = require("vscode");
// require("dotenv").config();
// const axios = require("axios");
// const express = require("express");
// const path = require("path");
// const fs = require("fs");
// const { exec } = require("child_process");

// // const clientId = process.env.GITHUB_CLIENT_ID;
// // const clientSecret = process.env.GITHUB_CLIENT_SECRET;
// // const redirectUri = process.env.REDIRECT_URI;
// // console.log('GITHUB_CLIENT_ID:', process.env.GITHUB_CLIENT_ID);
// // console.log('GITHUB_CLIENT_SECRET:', process.env.GITHUB_CLIENT_SECRET);
// // console.log('REDIRECT_URI:', process.env.REDIRECT_URI);

// const clientId = "Ov23litLcMtwjAREsAQw";
// const clientSecret = "e3ab6bfca79df0a932220f186bb31d968f75bc9e";
// const redirectUri = "http://localhost:3000/auth/callback";

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

// let taskCounter = 1;

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
//   try {
//     const response = await axios.get("https://api.github.com/user", {
//       headers: {
//         Authorization: `token ${token}`,
//       },
//     });
//     return response.data.login; // Return the GitHub username
//   } catch (error) {
//     console.error("Failed to fetch user details:", error);
//     return null;
//   }
// }

// // Function to get or create the code-tracking repository
// async function getOrCreateRepo(token) {
//   const username = await getUserUsername(token);
//   if (!username) {
//     vscode.window.showErrorMessage("Failed to get GitHub username.");
//     return;
//   }

//   try {
//     const repoResponse = await axios.get(
//       `https://api.github.com/repos/${username}/code-tracking`,
//       {
//         headers: {
//           Authorization: `token ${token}`,
//         },
//       }
//     );

//     if (repoResponse.status === 200) {
//       console.log("Using existing repository:", repoResponse.data.name);
//       return repoResponse.data;
//     }
//   } catch (error) {
//     console.log("Creating a new repository...");
//     return await createRepo(token, username);
//   }
// }

// // Function to create a repository on GitHub if it doesn't exist
// async function createRepo(token, username) {
//   try {
//     const repoResponse = await axios.post(
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
//     return repoResponse.data;
//   } catch (error) {
//     if (error.response && error.response.status === 422) {
//       console.log("Repository already exists.");
//       return null;
//     }
//     vscode.window.showErrorMessage("Failed to create repository.");
//     console.error("Error during repository creation:", error);
//     throw error;
//   }
// }

// // Function to fetch all public repositories for the authenticated user
// async function getUserRepos(token) {
//   try {
//     const response = await axios.get(
//       "https://api.github.com/user/repos?type=public",
//       {
//         headers: {
//           Authorization: `token ${token}`,
//         },
//       }
//     );
//     return response.data; // List of public repositories
//   } catch (error) {
//     console.error("Failed to fetch repositories:", error);
//     return [];
//   }
// }

// // Function to fetch commits from a specific repository in the last 30 minutes
// async function getCommitsFromRepo(token, username, repoName) {
//   const now = new Date();
//   const thirtyMinutesAgo = new Date(now - 30 * 60 * 1000);
//   const sinceDate = thirtyMinutesAgo.toISOString();

//   try {
//     const response = await axios.get(
//       `https://api.github.com/repos/${username}/${repoName}/commits?since=${sinceDate}`,
//       {
//         headers: {
//           Authorization: `token ${token}`,
//         },
//       }
//     );
//     return response.data; // List of commits
//   } catch (error) {
//     console.error(`Failed to fetch commits from ${repoName}:`, error);
//     return [];
//   }
// }

// // Function to get and log commit history for all public repositories
// async function logCommitHistory(token, username) {
//   const repos = await getUserRepos(token);

//   let logContent = "## GitHub Commit History in the Last 30 Minutes:\n\n";

//   // Iterate through all public repositories and fetch commits
//   for (let repo of repos) {
//     const commits = await getCommitsFromRepo(token, username, repo.name);
//     if (commits.length > 0) {
//       logContent += `### Repository: ${repo.name}\n`;
//       commits.forEach((commit) => {
//         logContent += `- ${commit.sha}: ${commit.commit.message}\n`;
//       });
//     } else {
//       logContent += `### Repository: ${repo.name}\n- No commits made in the last 30 minutes.\n`;
//     }
//     logContent += "\n";
//   }

//   // Commit this log to the `code-tracking` repository
//   await commitLogToRepo(token, logContent);
// }

// // Function to get and log commit history for all public repositories
// async function logCommitHistory(token, username) {
// 	const repos = await getUserRepos(token);

// 	let logContent = "## GitHub Commit History in the Last 30 Minutes:\n\n";
// 	let hasCommits = false; // Flag to track if any commits exist

// 	// Iterate through all public repositories and fetch commits
// 	for (let repo of repos) {
// 	  const commits = await getCommitsFromRepo(token, username, repo.name);
// 	  if (commits.length > 0) {
// 		hasCommits = true;
// 		logContent += `### Repository: ${repo.name}\n`;
// 		commits.forEach((commit) => {
// 		  logContent += `- ${commit.sha}: ${commit.commit.message}\n`;
// 		});
// 		logContent += "\n"; // Add a newline between repos with commits
// 	  }
// 	}

// 	// Only commit the log if there are any commits in the last 30 minutes
// 	if (hasCommits) {
// 	  await commitLogToRepo(token, logContent);
// 	} else {
// 	  console.log("No commits in the last 30 minutes for any repositories.");
// 	}
//   }

// // Function to commit the log content to the `code-tracking` repository
// async function commitLogToRepo(token, logContent) {
//   const now = new Date();
// //   const filePath = `${now.toISOString()}.md`; // Use current timestamp as file name
//   const filePath = `task${taskCounter}_log.md`;
//   const username = await getUserUsername(token);
//   if (!username) {
//     vscode.window.showErrorMessage("Failed to get GitHub username.");
//     return;
//   }
//   try {
//     const response = await axios.put(
//       `https://api.github.com/repos/${username}/code-tracking/contents/${filePath}`,
//       {
//         message: `Log GitHub commit history - ${now.toLocaleString()}`,
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
// 	taskCounter++;
//   } catch (error) {
//     console.error("Error during commit:", error);
//   }
// }


// // Example usage in your extension's activate function
// async function activate(context) {
//   console.log('Extension "GitHub Productivity Tracker" is now active!');

//   let disposable = vscode.commands.registerCommand(
//     "github-productivity-tracker.authenticate",
//     async () => {
//       try {
//         const token = await githubAuthentication();
//         console.log(`GitHub authentication successful, token: ${token}`);
//         if (token) {
//           const username = await getUserUsername(token);
//           console.log(`Authenticated as: ${username}`);
//           setInterval(async () => {
//             await logCommitHistory(token, username);
//           }, 1 * 60 * 1000); // Log every 30 minutes
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
require("dotenv").config();
const axios = require("axios");
const express = require("express");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");

const clientId = "Ov23litLcMtwjAREsAQw";
const clientSecret = "e3ab6bfca79df0a932220f186bb31d968f75bc9e";
const redirectUri = "http://localhost:3000/auth/callback";

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

let taskCounter = 1; // Initial task number

// Function to authenticate user via GitHub OAuth
async function githubAuthentication() {
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}`;
  vscode.env.openExternal(vscode.Uri.parse(authUrl));

  while (!oauthCode) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
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

// Function to fetch the authenticated user's GitHub username
async function getUserUsername(token) {
  try {
    const response = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `token ${token}`,
      },
    });
    return response.data.login; // Return the GitHub username
  } catch (error) {
    console.error("Failed to fetch user details:", error);
    return null;
  }
}

// Function to get or create the code-tracking repository
async function getOrCreateRepo(token) {
  const username = await getUserUsername(token);
  if (!username) {
    vscode.window.showErrorMessage("Failed to get GitHub username.");
    return;
  }

  try {
    const repoResponse = await axios.get(
      `https://api.github.com/repos/${username}/code-tracking`,
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
    console.log("Creating a new repository...");
    return await createRepo(token, username);
  }
}

// Function to create a repository on GitHub if it doesn't exist
async function createRepo(token, username) {
  try {
    const repoResponse = await axios.post(
      `https://api.github.com/user/repos`,
      {
        name: "code-tracking",
        description: "A repository for tracking daily coding contributions",
        private: false,
      },
      {
        headers: {
          Authorization: `token ${token}`,
        },
      }
    );
    return repoResponse.data;
  } catch (error) {
    if (error.response && error.response.status === 422) {
      console.log("Repository already exists.");
      return null;
    }
    vscode.window.showErrorMessage("Failed to create repository.");
    console.error("Error during repository creation:", error);
    throw error;
  }
}

// Function to check existing task logs and determine the next task number
async function getNextTaskNumber(token, username) {
  const repoName = "code-tracking";
  const taskLogs = await getTaskLogs(token, username, repoName);
  
  // Extract the highest task number
  const taskNumbers = taskLogs.map(log => {
    const match = log.name.match(/^task(\d+)_log\.md$/);
    return match ? parseInt(match[1]) : null;
  }).filter(num => num !== null);
  
  const nextTaskNumber = taskNumbers.length > 0 ? Math.max(...taskNumbers) + 1 : 1;
  return nextTaskNumber;
}

// Function to get task logs from the repository
async function getTaskLogs(token, username, repoName) {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${username}/${repoName}/contents`,
      {
        headers: {
          Authorization: `token ${token}`,
        },
      }
    );
    return response.data.filter(file => file.name.startsWith("task") && file.name.endsWith("_log.md"));
  } catch (error) {
    console.error("Failed to fetch task logs:", error);
    return [];
  }
}

// Function to fetch commits from a specific repository in the last 30 minutes
async function getCommitsFromRepo(token, username, repoName) {
  const now = new Date();
  const thirtyMinutesAgo = new Date(now - 30 * 60 * 1000);
  const sinceDate = thirtyMinutesAgo.toISOString();

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${username}/${repoName}/commits?since=${sinceDate}`,
      {
        headers: {
          Authorization: `token ${token}`,
        },
      }
    );
    return response.data; // List of commits
  } catch (error) {
    console.error(`Failed to fetch commits from ${repoName}:`, error);
    return [];
  }
}

// Function to fetch all public repositories for the authenticated user
async function getUserRepos(token) {
	try {
	  const response = await axios.get(
		"https://api.github.com/user/repos?type=public",
		{
		  headers: {
			Authorization: `token ${token}`,
		  },
		}
	  );
	  return response.data; // List of public repositories
	} catch (error) {
	  console.error("Failed to fetch repositories:", error);
	  return [];
	}
  }

// Function to log commit history for all public repositories
async function logCommitHistory(token, username) {
  const repo = await getOrCreateRepo(token);
  const nextTaskNumber = await getNextTaskNumber(token, username);
  
  let logContent = "## GitHub Commit History in the Last 30 Minutes:\n\n";
  const repos = await getUserRepos(token);
  
  // Iterate through all public repositories and fetch commits
  for (let repo of repos) {
    const commits = await getCommitsFromRepo(token, username, repo.name);
    if (commits.length > 0) {
      logContent += `### Repository: ${repo.name}\n`;
      commits.forEach((commit) => {
        logContent += `- ${commit.sha}: ${commit.commit.message}\n`;
      });
    } else {
      logContent += `### Repository: ${repo.name}\n- No commits made in the last 30 minutes.\n`;
    }
    logContent += "\n";
  }

  // Commit the log content to the `code-tracking` repository
  await commitLogToRepo(token, logContent, nextTaskNumber);
}

// Function to commit the log content to the `code-tracking` repository
async function commitLogToRepo(token, logContent, taskNumber) {
  const now = new Date();
  const filePath = `task${taskNumber}_log.md`;
  const username = await getUserUsername(token);
  if (!username) {
    vscode.window.showErrorMessage("Failed to get GitHub username.");
    return;
  }

  try {
    const response = await axios.put(
      `https://api.github.com/repos/${username}/code-tracking/contents/${filePath}`,
      {
        message: `Log GitHub commit history - ${now.toLocaleString()}`,
        content: Buffer.from(logContent).toString("base64"),
        branch: "main",
      },
      {
        headers: {
          Authorization: `token ${token}`,
        },
      }
    );
    console.log("Log file committed:", response.data.content.name);
  } catch (error) {
    console.error("Error during commit:", error);
  }
}

// // Example usage in your extension's activate function
// async function activate(context) {
//   console.log('Extension "GitHub Productivity Tracker" is now active!');

//   let disposable = vscode.commands.registerCommand(
//     "github-productivity-tracker.authenticate",
//     async () => {
//       try {
//         const token = await githubAuthentication();
//         console.log(`GitHub authentication successful, token: ${token}`);
//         if (token) {
//           const username = await getUserUsername(token);
//           console.log(`Authenticated as: ${username}`);
//           setInterval(async () => {
//             await logCommitHistory(token, username);
//           }, 1 * 60 * 1000); // Log every 30 minutes
//         }
//       } catch (error) {
//         console.error("Error during authentication or repo access:", error);
//       }
//     }
//   );

//   context.subscriptions.push(disposable);
// }

async function activate(context) {
	console.log('Extension "GitHub Productivity Tracker" is now active!');
  
	let disposable = vscode.commands.registerCommand(
	  "github-productivity-tracker.authenticate",
	  async () => {
		try {
		  const token = await githubAuthentication();
		  console.log(`GitHub authentication successful, token: ${token}`);
		  if (token) {
			const username = await getUserUsername(token);
			console.log(`Authenticated as: ${username}`);
  
			// Get or create the 'code-tracking' repository
			let repo = await getOrCreateRepo(token);
  
			if (repo) {
			  console.log(`Using repository: ${repo.name}`);
  
			  // Now, start the commit logging process every 30 minutes
			  setInterval(async () => {
				await logCommitHistory(token, username);
			  }, 1 * 60 * 1000); // Log every 30 minutes
			} else {
			  console.error('Failed to get or create repository.');
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
