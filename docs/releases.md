# Releases

Releases are published by [GitHub Actions](../.github/workflows/release.yml) when an annotated `vX.Y.Z` tag is pushed. The workflow runs the same lint, typecheck, unit, build, and mounted browser checks as CI. It publishes a GitHub release only after those checks pass, the tag matches `package.json`, and the tagged commit belongs to `main`.

For the next release:

1. Update the version in `package.json`, commit it on `main`, and push. Wait for CI to pass.
2. Create and push an annotated tag for that exact version. For example, if `package.json` says `0.2.0`:

   ```bash
   git tag -a v0.2.0 -m "Kody Files v0.2.0"
   git push origin v0.2.0
   ```

3. Watch the **Release** workflow in the repository's Actions tab. When it succeeds, check the generated notes under Releases and edit them if a limitation or migration needs more explanation.

The release workflow creates a GitHub release and source archives. It does not publish an npm package or deploy the hosted site. The initial `v0.1.0` release was created manually before this workflow existed.
