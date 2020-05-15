# GitHub Release Manager

A Github Action to automatically bump tag version and generate release on your masters branch, on merge, with the latest SemVer formatted version.

## Usage

```yaml
# This is a basic workflow to help you get started with Actions

name: Release creator

# Controls when the action will run. Triggers the workflow on push or pull request merge
# events but only for the master branch
on:
  push:
    branches: [ master ]
jobs:
  manage_release_job:
    runs-on: ubuntu-latest
    name: Generate release
    steps:
    - name: Generate release
      id: release
      uses: home-furnishing-nordic/semver-release-manager@master
      with:
        # secret github token, required
        github_token: "${{ secrets.GITHUB_TOKEN }}"
    # Use the output from the `release` step
    - name: Get the output time
      run: echo "Execution time ${{ steps.release.outputs.time }}"
```

### Input

- **github_token** _(required)_ - Required for permission to tag the repo. Usually `${{ secrets.GITHUB_TOKEN }}`.
- **bump_type** _(optional)_ - Which type of bump to use. [Available types](#bump) (default: `patch`).

### Outputs

- **new_tag** - The value of the newly created tag. Note that if there hasn't been any new commit, this will be `undefined`.
- **time** - The value of the time when Action was executed.

### Bump
Available bump types:
- major (BC)
- minor
- patch

The action will parse the new commits since the last tag using pattern
```#release-{BumpType}```

If no commit message contains any information, then **default_bump** will be used.
