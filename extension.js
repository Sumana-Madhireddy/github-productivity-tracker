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


async function getCommitsFromAllBranches(token, username, repoName) {
	try {
	  const branchesResponse = await axios.get(
		`https://api.github.com/repos/${username}/${repoName}/branches`,
		{
		  headers: { Authorization: `token ${token}` },
		}
	  );
	  const branches = branchesResponse.data;
  
	  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
	  let recentCommits = [];
  
	  for (const branch of branches) {
		const commitsResponse = await axios.get(
		  `https://api.github.com/repos/${username}/${repoName}/commits?sha=${branch.name}`,
		  {
			headers: { Authorization: `token ${token}` },
		  }
		);
  
		const branchCommits = commitsResponse.data.filter(
		  (commit) => new Date(commit.commit.author.date) > thirtyMinutesAgo
		);
  
		branchCommits.forEach((commit) => {
		  recentCommits.push({
			branch: branch.name,
			sha: commit.sha,
			message: commit.commit.message,
			date: commit.commit.author.date,
		  });
		});
	  }
  
	  return recentCommits;
	} catch (error) {
	  console.error(`Failed to fetch commits for ${repoName}:`, error);
	  return [];
	}
}

async function getRecentPRs(token, username, repoName) {
	try {
	  const response = await axios.get(
		`https://api.github.com/repos/${username}/${repoName}/pulls?state=all`,
		{
		  headers: { Authorization: `token ${token}` },
		}
	  );
	  
	  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
	  const recentPRs = response.data.filter((pr) => {
		const prUpdatedAt = new Date(pr.updated_at);
		return prUpdatedAt > thirtyMinutesAgo;
	  });
	  console.log("recentPRs: ",recentPRs);
	  return recentPRs;
	} catch (error) {
	  console.error(`Failed to fetch PRs for ${repoName}:`, error);
	  return [];
	}
}
  

async function getRecentIssuesAndComments(token, username, repoName) {
	try {
	  const issuesResponse = await axios.get(
		`https://api.github.com/repos/${username}/${repoName}/issues?state=all`,
		{
		  headers: { Authorization: `token ${token}` },
		}
	  );
	  const commentsResponse = await axios.get(
		`https://api.github.com/repos/${username}/${repoName}/issues/comments`,
		{
		  headers: { Authorization: `token ${token}` },
		}
	  );
	  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
	  return {
		issues: issuesResponse.data.filter((issue) => new Date(issue.updated_at) > thirtyMinutesAgo),
		comments: commentsResponse.data.filter((comment) => new Date(comment.updated_at) > thirtyMinutesAgo),
	  };
	} catch (error) {
	  console.error(`Failed to fetch issues or comments for ${repoName}:`, error);
	  return { issues: [], comments: [] };
	}
}


async function getCommitsFromAllBranches(token, username, repoName) {
	try {
	  const branchesResponse = await axios.get(
		`https://api.github.com/repos/${username}/${repoName}/branches`,
		{
		  headers: { Authorization: `token ${token}` },
		}
	  );
	  const branches = branchesResponse.data;
  
	  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
	  let recentCommits = [];
  
	  for (const branch of branches) {
		const commitsResponse = await axios.get(
		  `https://api.github.com/repos/${username}/${repoName}/commits?sha=${branch.name}`,
		  {
			headers: { Authorization: `token ${token}` },
		  }
		);
  
		const branchCommits = commitsResponse.data.filter(
		  (commit) => new Date(commit.commit.author.date) > thirtyMinutesAgo
		);
  
		branchCommits.forEach((commit) => {
		  recentCommits.push({
			branch: branch.name,
			sha: commit.sha,
			message: commit.commit.message,
			date: commit.commit.author.date,
		  });
		});
	  }
  
	  return recentCommits;
	} catch (error) {
	  console.error(`Failed to fetch commits for ${repoName}:`, error);
	  return [];
	}
  }
  
  async function getRecentPRs(token, username, repoName) {
	try {
	  const response = await axios.get(
		`https://api.github.com/repos/${username}/${repoName}/pulls?state=all`,
		{
		  headers: { Authorization: `token ${token}` },
		}
	  );
	  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
	  const recentPRs = response.data.filter((pr) => {
		const prUpdatedAt = new Date(pr.updated_at);
		return prUpdatedAt > thirtyMinutesAgo;
	  });
	  return recentPRs;
	} catch (error) {
	  console.error(`Failed to fetch PRs for ${repoName}:`, error);
	  return [];
	}
  }
  
//   async function logCommitHistory(token, username) {
// 	const repo = await getOrCreateRepo(token);
// 	const nextTaskNumber = await getNextTaskNumber(token, username);
  
// 	let logContent = "## GitHub Activity in the Last 30 Minutes:\n\n";
// 	const repos = await getUserRepos(token);
// 	const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
// 	const recentCommitSummaries = [];
  
// 	for (let repo of repos) {
// 	  if (repo.name === "code-tracking") {
// 		continue;
// 	  }
  
// 	  const commits = await getCommitsFromAllBranches(token, username, repo.name);
// 	  const recentCommits = commits.filter(commit => {
// 		const commitDate = new Date(commit.date);
// 		return commitDate > thirtyMinutesAgo;
// 	  });
  
// 	  const prs = await getRecentPRs(token, username, repo.name);
  
// 	  if (recentCommits.length > 0 || prs.length > 0) {
// 		logContent += `### Repository: ${repo.name}\n`;
  
// 		recentCommits.forEach(commit => {
// 		  logContent += `- Commit (${commit.branch}): ${commit.sha} - ${commit.message}\n`;
// 		  recentCommitSummaries.push(`Commit in ${repo.name} (${commit.branch}): ${commit.message}`);
// 		});
  
// 		prs.forEach(pr => {
// 		  logContent += `- PR: ${pr.title} (ID: ${pr.id}) - ${pr.body || "No description"}\n`;
// 		  recentCommitSummaries.push(`PR in ${repo.name}: ${pr.title}`);
// 		});
  
// 		logContent += "\n";
// 	  }
// 	}
  
// 	if (recentCommitSummaries.length > 0) {
// 	  await commitLogToRepo(token, logContent, nextTaskNumber, recentCommitSummaries);
// 	} else {
// 	  console.log("No recent commits or PRs found in the last 30 minutes.");
// 	}
// }

async function logCommitHistory(token, username) {
	const repo = await getOrCreateRepo(token);
	const nextTaskNumber = await getNextTaskNumber(token, username);
  
	let logContent = "## GitHub Activity in the Last 30 Minutes:\n\n";
	const repos = await getUserRepos(token);
	const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
	const recentCommitSummaries = [];
  
	for (let repo of repos) {
	  if (repo.name === "code-tracking") {
		continue;
	  }
  
	  // Get commits from all branches
	  const commits = await getCommitsFromAllBranches(token, username, repo.name);
	  const recentCommits = commits.filter(commit => {
		const commitDate = new Date(commit.date);
		return commitDate > thirtyMinutesAgo;
	  });
  
	  // Get recent PRs
	  const prs = await getRecentPRs(token, username, repo.name);
  
	  // Get recent issues and comments
	  const { issues, comments } = await getRecentIssuesAndComments(token, username, repo.name);
  
	  // If there are any commits, PRs, issues, or comments in the last 30 minutes, log them
	  if (recentCommits.length > 0 || prs.length > 0 || issues.length > 0 || comments.length > 0) {
		logContent += `### Repository: ${repo.name}\n`;
  
		// Log commit messages
		recentCommits.forEach(commit => {
		  logContent += `- Commit (${commit.branch}): ${commit.sha} - ${commit.message}\n`;
		  recentCommitSummaries.push(`Commit in ${repo.name} (${commit.branch}): ${commit.message}`);
		});
  
		// Log PR messages
		prs.forEach(pr => {
		  logContent += `- PR: ${pr.title} (ID: ${pr.id}) - ${pr.body || "No description"}\n`;
		  recentCommitSummaries.push(`PR in ${repo.name}: ${pr.title}`);
		});
  
		// Log issues
		issues.forEach(issue => {
		  logContent += `- Issue: ${issue.title} (ID: ${issue.id}) - ${issue.body || "No description"}\n`;
		  recentCommitSummaries.push(`Issue in ${repo.name}: ${issue.title}`);
		});
  
		// Log comments
		comments.forEach(comment => {
		  logContent += `- Comment on Issue/PR: ${comment.body}\n`;
		  recentCommitSummaries.push(`Comment in ${repo.name}: ${comment.body}`);
		});
  
		logContent += "\n";
	  }
	}
  
	if (recentCommitSummaries.length > 0) {
	  await commitLogToRepo(token, logContent, nextTaskNumber, recentCommitSummaries);
	} else {
	  console.log("No recent commits, PRs, issues, or comments found in the last 30 minutes.");
	}
  }
  

async function commitLogToRepo(token, logContent, taskNumber, recentCommitSummaries) {
	const filePath = `task${taskNumber}_log.md`;
	const username = await getUserUsername(token);
	if (!username) {
	  vscode.window.showErrorMessage("Failed to get GitHub username.");
	  return;
	}
  
	const commitSummary = recentCommitSummaries.length > 0 
	  ? `${recentCommitSummaries.join("; ")}`
	  : "No commits in the last 30 minutes";
  
	try {
	  const response = await axios.put(
		`https://api.github.com/repos/${username}/code-tracking/contents/${filePath}`,
		{
		  message: commitSummary,
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
  
			  setInterval(async () => {
				await logCommitHistory(token, username);
				// await logRecentActivities(token, username);
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
