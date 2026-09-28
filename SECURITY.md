# Security policy

## Reporting a vulnerability

Please use GitHub's **Report a vulnerability** flow in the repository's Security tab when it is available. Include a minimal reproduction, affected version or commit, and impact. Do not include a real token or private repository content. Please avoid opening a public issue for an unpatched vulnerability. Maintainers should enable private vulnerability reporting when the repository is made public.

## Token handling

Kody Files uses a token entered by the user. It saves that token in the browser's local storage until **Forget token** is selected. The token is sent to the app's same-origin API for verification and ordinary file operations, and directly to GitHub for uploads. The app has no server-side token store or GitHub OAuth app.

Use a fine-grained token limited to the repositories and permissions you need. Use HTTPS for hosted deployments, avoid shared browsers, and choose **Forget token** when finished. Browser extensions and scripts that can read this site's local storage are in the token's trust boundary. If a token may have been exposed, revoke it in GitHub and create a new one.

Deployments you run yourself should use a trusted domain and review changes to authentication, upload, and preview code before use.
