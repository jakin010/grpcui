# Releases of gRPCui

This document provides instructions for building a release of `grpcui`.

The release process consists of a handful of tasks:
1. Drop a release tag in git.
2. Build binaries for various platforms. This is done using the local `go` tool and uses `GOOS` and `GOARCH` environment variables to cross-compile for supported platforms.
3. Creates a release in GitHub, uploads the binaries, and generates the release notes (in the form of a change log).

The [Homebrew](https://brew.sh/) recipe updates itself; see [Homebrew](#homebrew) below.

All of this is automated by the **Release** GitHub Actions workflow (`.github/workflows/release.yml`). There is also a script in this same directory (`do-release.sh`) that does the same thing from a developer machine (and also builds and pushes a Docker image); see [Releasing from a laptop](#releasing-from-a-laptop) below.

## Creating a new release

There are two ways to start the workflow. Both run the tests, build the binaries and publish the GitHub release in the same way.

### By pushing a tag

Tag the commit to release with a version in sem-ver format, `v<Major>.<Minor>.<Patch>`, and push the tag:

```sh
git tag -a v2.3.4 -m "Release v2.3.4"
git push origin v2.3.4
```

Pushing the tag starts the workflow. It releases exactly the tagged commit. It stops with an error if a GitHub release for that tag already exists. Tags that don't look like `vM.N.P` (for example `v2.3.4-rc1`) don't start a release.

### By running the workflow

Go to the [Release workflow](https://github.com/fullstorydev/grpcui/actions/workflows/release.yml), click **Run workflow**, and provide:

* **Branch**: the branch or commit to release from (usually `master`).
* **version**: the version number for the new release, in sem-ver format: `v<Major>.<Minor>.<Patch>`, e.g. `v2.3.4`.
* **dry_run**: check this to build everything but publish nothing. Useful for validating a change to the release tooling. The binaries are attached to the workflow run as an artifact.

The workflow then:
1. Verifies the version is well-formed and that the tag does not already exist.
2. Runs the tests.
3. Creates and pushes the release tag. (A pushed tag skips this step.)
4. Cross-compiles binaries for all supported platforms, creates the GitHub release with generated release notes, and uploads the archives. (This is goreleaser, driven by `.goreleaser.yml`.)

That's the whole process — there is no manual follow-up. If things go wrong and you have to re-do part of it, see the sections below.

### Release notes

Release notes are generated, never hand-written. `changelog.use: github-native` in `.goreleaser.yml` hands the job to GitHub's own release-notes generator, which lists every PR merged since the previous tag with its title, link, and author, and credits new contributors.

`.github/release.yml` controls how those PRs are grouped. Labels are optional — an unlabeled PR lands in a catch-all "Changes" section — so this needs no ongoing upkeep. Two things make the notes read better, if you want them:

* Label a PR `bug` or `enhancement` to sort it into a nicer section. Dependabot already applies `dependencies` on its own, which keeps version bumps grouped at the bottom.
* Write PR titles as the line you'd want to see in the notes, since the title _is_ the changelog entry.

Label a PR `ignore-for-release` to leave it out of the notes entirely.

Since the notes come from the merged PRs, anything landed by pushing straight to `master` will not appear.

### Required repository secrets

| Secret | Used for | Required? |
| --- | --- | --- |
| `GITHUB_TOKEN` | Creating the tag and the GitHub release. | Provided automatically by Actions. |

There is nothing to configure: the workflow runs on the automatic token alone.

## Releasing from a laptop

The `do-release.sh` script in this directory performs the same steps locally. Prefer the workflow; use the script only when Actions is unavailable.

You need a version number and a GitHub personal access token, which is used for creating the release in GitHub (so you need write access to the fullstorydev/grpcui repo).

We'll use `v2.3.4` as an example version and `abcdef0123456789abcdef` as an example GitHub token:

```sh
# from the root of the repo
GITHUB_TOKEN=abcdef0123456789abcd \
    ./releasing/do-release.sh v2.3.4
```

----

### GitHub Releases
The GitHub release is the first step performed by the workflow (and by the `do-release.sh` script). So generally, if there is an issue with that step, you can just re-run the workflow.

Note, if running the script did something wrong, you may have to first login to GitHub and remove uploaded artifacts for a botched release attempt. In general, this is _very undesirable_. Releases should usually be considered immutable. Instead of removing uploaded assets and providing new ones, it is often better to remove uploaded assets (to make bad binaries no longer available) and then _release a new patch version_. (You can edit the release notes for the botched version explaining why there are no artifacts for it.)

The steps to do a GitHub-only release (vs. running the entire script) are the following:

```sh
# from the root of the repo
git tag v2.3.4
GITHUB_TOKEN=abcdef0123456789abcdef \
    GO111MODULE=on \
    make release
```

The `git tag ...` step is necessary because the release target requires that the current SHA have a sem-ver tag. That's the version it will use when creating the release.

This will create the release in GitHub, with notes generated from the PRs merged since the previous tag.

Note that the notes come from the GitHub API, which resolves the tag name remotely. If the tag only exists locally, the API falls back to the default branch to pick the range, so notes generated this way can differ from what you'd get by pushing the tag first. The workflow always pushes the tag before this step.

### Homebrew

**Nothing to do.** The homebrew-core formula, which is what backs `brew install grpcui`, is bumped automatically. Homebrew's own tooling polls for new releases every few hours and opens the bump PR itself, so the release process does not touch Homebrew at all.

The formula opts into this by having a `livecheck` block with `strategy :github_latest` and no `no_autobump!`. The only thing that could break it is publishing a release that Homebrew's poller cannot see, so:

* Don't leave a release as a **draft**, and don't mark it **pre-release**. `github_latest` reads whatever GitHub reports as the latest release, and a draft or pre-release is not it.
* Keep tags in the `vM.N.P` shape the formula's URL expects.

If a bump ever fails to show up, check the formula's history in [homebrew-core](https://github.com/Homebrew/homebrew-core/blob/master/Formula/g/grpcui.rb) first. To force one by hand:

```sh
# download the source archive from GitHub
URL=https://github.com/fullstorydev/grpcui/archive/refs/tags/v2.3.4.tar.gz
curl -L -o tmp.tgz $URL
# and compute the SHA
SHA="$(sha256sum < tmp.tgz | awk '{ print $1 }')"
# then open the bump PR
HOMEBREW_GITHUB_API_TOKEN=abcdef0123456789abcdef \
    brew bump-formula-pr --url $URL --sha256 $SHA grpcui
```
