import Zip from "adm-zip";
import * as fs from "fs";
import { dirname, join, resolve } from "path";

import * as artifact from "@actions/artifact";
import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { getDefaultProvider } from "@ethersproject/providers";

import { checkLayouts } from "./check";
import { diffLevels, diffTitles, formatDiff } from "./format";
import { createLayout, parseSource, parseLayout } from "./input";
import { StorageLayoutDiffType } from "./types";

const token = process.env.GITHUB_TOKEN || core.getInput("token");
const baseBranch = core.getInput("base");
const headBranch = core.getInput("head");
const contract = core.getInput("contract");
const address = core.getInput("address");
const rpcUrl = core.getInput("rpcUrl");
const failOnRemoval = core.getInput("failOnRemoval") === "true";
const workingDirectory = core.getInput("workingDirectory");

const contractAbs = join(workingDirectory, contract);
const contractEscaped = contractAbs.replace(/\//g, "_").replace(/:/g, "-");
const getReportPath = (branch: string, baseName: string) =>
  `${branch.replace(/[/\\]/g, "-")}.${baseName}.json`;

const baseReport = getReportPath(baseBranch, contractEscaped);
const outReport = getReportPath(headBranch, contractEscaped);

const octokit = getOctokit(token);
const artifactClient = artifact.create();

const { owner, repo } = context.repo;
const repository = owner + "/" + repo;

const provider = rpcUrl ? getDefaultProvider(rpcUrl) : undefined;

let srcContent: string;
let refCommitHash: string | undefined = undefined;

async function _run() {
  core.startGroup(`Generate storage layout of contract "${contract}" using foundry forge`);
  core.info(`Start forge process`);
  const cmpContent = createLayout(contract, workingDirectory);
  core.info(`Parse generated layout`);
  const cmpLayout = parseLayout(cmpContent);
  core.endGroup();

  const localReportPath = resolve(outReport);
  fs.writeFileSync(localReportPath, cmpContent);

  core.startGroup(`Upload new report from "${localReportPath}" as artifact named "${outReport}"`);
  const uploadResponse = await artifactClient.uploadArtifact(
    outReport,
    [localReportPath],
    dirname(localReportPath),
    { continueOnError: false }
  );

  if (uploadResponse.failedItems.length > 0) throw Error("Failed to upload storage layout report.");

  core.info(`Artifact ${uploadResponse.artifactName} has been successfully uploaded!`);
  core.endGroup();

  if (context.eventName !== "pull_request") return;

  let artifactId: number | null = null;
  core.startGroup(
    `Searching artifact "${baseReport}" on repository "${repository}", on branch "${baseBranch}"`
  );
  // cannot use artifactClient because downloads are limited to uploads in the same workflow run
  // cf. https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts#downloading-or-deleting-artifacts
  // Note that the artifacts are returned in most recent first order.
  for await (const res of octokit.paginate.iterator(octokit.rest.actions.listArtifactsForRepo, {
    owner,
    repo,
  })) {
    const artifact = res.data.find((artifact) => !artifact.expired && artifact.name === baseReport);
    if (!artifact) {
      await new Promise((resolve) => setTimeout(resolve, 800)); // avoid reaching the API rate limit

      continue;
    }

    artifactId = artifact.id;
    refCommitHash = artifact.workflow_run?.head_sha;
    core.info(
      `Found artifact named "${baseReport}" with ID "${artifactId}" from commit "${refCommitHash}"`
    );
    break;
  }
  core.endGroup();

  if (artifactId) {
    core.startGroup(
      `Downloading artifact "${baseReport}" of repository "${repository}" with ID "${artifactId}"`
    );
    const res = await octokit.rest.actions.downloadArtifact({
      owner,
      repo,
      artifact_id: artifactId,
      archive_format: "zip",
    });

    // @ts-ignore data is unknown
    const zip = new Zip(Buffer.from(res.data));
    for (const entry of zip.getEntries()) {
      core.info(`Loading storage layout report from "${entry.entryName}"`);
      srcContent = zip.readAsText(entry);
    }
    core.endGroup();
  } else throw Error(`No workflow run found with an artifact named "${baseReport}"`);

  core.info(`Mapping reference storage layout report`);
  const srcLayout = parseLayout(srcContent);
  core.endGroup();

  core.startGroup("Check storage layout");
  const diffs = await checkLayouts(srcLayout, cmpLayout, {
    address,
    provider,
    checkRemovals: failOnRemoval,
  });

  if (diffs.length > 0) {
    core.info(`Parse source code`);
    const cmpDef = parseSource(contractAbs);

    const formattedDiffs = diffs.map((diff) => {
      const formattedDiff = formatDiff(cmpDef, diff);

      const title = diffTitles[formattedDiff.type];
      const level = diffLevels[formattedDiff.type] || "error";
      core[level](formattedDiff.message, {
        title,
        file: cmpDef.path,
        startLine: formattedDiff.loc.start.line,
        endLine: formattedDiff.loc.end.line,
        startColumn: formattedDiff.loc.start.column,
        endColumn: formattedDiff.loc.end.column,
      });

      return formattedDiff;
    });

    if (
      formattedDiffs.filter((diff) => diffLevels[diff.type] === "error").length > 0 ||
      (failOnRemoval &&
        formattedDiffs.filter((diff) => diff.type === StorageLayoutDiffType.VARIABLE_REMOVED)
          .length > 0)
    )
      throw Error("Unsafe storage layout changes detected. Please see above for details.");
  }

  core.endGroup();
}

async function run() {
  try {
    await _run();
  } catch (error: any) {
    core.setFailed(error);
    if (error.stack) core.debug(error.stack);
  } finally {
    process.exit();
  }
}

run();
