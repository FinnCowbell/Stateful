# Fork workflow

- `origin` is `FinnCowbell/Stateful`; `upstream` is `kennedn/Stateful`.
- Keep each independent feature or fix on its own branch based on
  `upstream/master`. Continue related changes on the existing feature branch.
- Split prerequisite repository changes, such as SDK/build setup changes, into
  their own branches rather than bundling them into the feature that needs them.
  Document dependencies and test the branches together before integration.
- Commit changes on the feature branch first, then cherry-pick only the new
  commits onto the fork's `master`. Keep `master` as the linear integration
  branch, without merge commits or duplicate patches.
- Do not rebase feature branches onto the fork's `master`: that would include
  unrelated fork changes in otherwise isolated branches. Rebasing a feature
  branch onto a newer `upstream/master` is a separate operation.
- Keep fork-only workflow documentation on `fork-workflow` and integrate it
  into `master` the same way.
- Validate changes before integration and resolve integration conflicts
  without dropping previously integrated behavior.
- Do not rewrite published history or force-push unless explicitly requested.
- Do not open pull requests unless explicitly requested.
