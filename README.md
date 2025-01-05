# GitHub Productivity Tracker VSCode Extension

## Overview

The **GitHub Productivity Tracker** is a VSCode extension designed to help developers track their coding activity and improve GitHub contributions. The extension automatically logs coding activities, such as commits, pull requests, and issues, every 30 minutes and generates detailed contribution summaries by committing these logs to a dedicated repository on GitHub.

## Features

- **GitHub Authentication**: Authenticate with your GitHub account securely to access your repositories.
- **Commit History Logging**: Logs commit history, including commits across all branches and repositories, every 30 minutes.
- **Pull Requests**: Track recent pull requests made within the last 30 minutes.
- **Issues and Comments**: Track recent issues and comments on repositories within the last 30 minutes.
- **Custom Commit Messages**: Automatically generates commit summaries based on activities and logs them in a designated GitHub repository.
- **Multi-Repository Support**: Logs activity across all your public repositories.

## Installation

1. **Clone or Download** the extension's repository.
2. **Install Dependencies**: npm install
3. **Package the Extension**: 
To package your extension, run: vsce package
This will create a `.vsix` file which can be installed manually in VSCode.

4. **Install the Extension in VSCode**:
Open VSCode and install the `.vsix` file using the **Install from VSIX** option in the Extensions view.

## Usage

1. **Authenticate with GitHub**:
- After installation, use the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and search for `Authenticate with GitHub`.
- Follow the prompts to authenticate and link your GitHub account.

2. **Activity Logging**:
- Once authenticated, the extension will start logging commit history, pull requests, issues, and comments every 30 minutes.
- The logs are committed to a dedicated repository, ensuring you have a detailed record of your GitHub activity.

3. **Log Commit History**:
- The extension will automatically generate a log of your activities in a Markdown file (`taskN_log.md`) and commit it to the `code-tracking` repository on GitHub.
- You can customize the commit summary as needed.

## Development

1. **Clone the Repository**:
git clone https://github.com/yourusername/github-productivity-tracker.git cd github-productivity-tracker


2. **Install Dependencies**:
npm install


3. **Test the Extension**:
To run the extension in a development environment:
npm run test


4. **Package the Extension**:
To package the extension for distribution:
vsce package


## Contributing

Feel free to submit issues or pull requests. Contributions are welcome!

## License

This extension is licensed under the MIT License.

