import Zip from "adm-zip";
import * as fs from "fs";
import { dirname, resolve } from "path";

import * as artifact from "@actions/artifact";
import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";

import { checkLayouts } from "./check";
import { formatDiff } from "./format";
import { StorageLayoutReport } from "./types";

const token = process.env.GITHUB_TOKEN || core.getInput("token");
const report = core.getInput("report");
const baseBranch = core.getInput("base");
const headBranch = core.getInput("head");

const baseBranchEscaped = baseBranch.replace(/[/\\]/g, "-");
const baseReport = `${baseBranchEscaped}.${report}`;

const octokit = getOctokit(token);
const artifactClient = artifact.create();
const localReportPath = resolve(report);

const { owner, repo } = context.repo;
const repository = owner + "/" + repo;

let srcContent: string;
let refCommitHash: string | undefined;

async function run() {
  try {
    const headBranchEscaped = headBranch.replace(/[/\\]/g, "-");
    const outReport = `${headBranchEscaped}.${report}`;

    core.startGroup(`Upload new report from "${localReportPath}" as artifact named "${outReport}"`);
    const uploadResponse = await artifactClient.uploadArtifact(
      outReport,
      [localReportPath],
      dirname(localReportPath),
      {
        continueOnError: false,
      }
    );

    if (uploadResponse.failedItems.length > 0)
      throw Error("Failed to upload storage layout report.");

    core.info(`Artifact ${uploadResponse.artifactName} has been successfully uploaded!`);
  } catch (error: any) {
    return core.setFailed(error.message);
  }
  core.endGroup();

  // cannot use artifactClient because downloads are limited to uploads in the same workflow run
  // cf. https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts#downloading-or-deleting-artifacts
  let artifactId: number | null = null;
  if (context.eventName === "pull_request") {
    try {
      core.startGroup(
        `Searching artifact "${baseReport}" on repository "${repository}", on branch "${baseBranch}"`
      );
      // Note that the artifacts are returned in most recent first order.
      for await (const res of octokit.paginate.iterator(octokit.rest.actions.listArtifactsForRepo, {
        owner,
        repo,
      })) {
        await new Promise((resolve) => setTimeout(resolve, 200)); // avoid reaching GitHub API rate limit

        const artifact = res.data.find(
          (artifact) => !artifact.expired && artifact.name === baseReport
        );
        if (!artifact) continue;

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
      } else core.error(`No workflow run found with an artifact named "${baseReport}"`);
    } catch (error: any) {
      return core.setFailed(error.message);
    }
  }

  try {
    core.startGroup("Load storage layout reports");
    core.info(`Loading storage layout report from "${localReportPath}"`);
    const cmpContent = fs.readFileSync(localReportPath, "utf8");
    srcContent ??= cmpContent; // if no source storage layout report were loaded, defaults to the current storage layout report

    core.info(`Mapping reference storage layout report`);
    const sourceLayout = JSON.parse(srcContent) as StorageLayoutReport;
    core.info(`Mapping compared storage layout report`);
    const compareLayout = JSON.parse(cmpContent) as StorageLayoutReport;
    core.endGroup();

    core.startGroup("Check storage layout");
    const diff = formatDiff(checkLayouts(sourceLayout, compareLayout));
    if (diff) return core.setFailed(diff);
    core.endGroup();
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
